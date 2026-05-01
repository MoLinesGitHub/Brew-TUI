import CryptoKit
import Foundation
import os

// MARK: - License data models

struct LicenseData: Codable {
    let key: String
    let instanceId: String
    let status: String
    let customerEmail: String
    let customerName: String
    let plan: String
    let activatedAt: String
    let expiresAt: String?
    let lastValidatedAt: String
}

struct LicenseFile: Codable {
    let version: Int
    // Legacy unencrypted format
    let license: LicenseData?
    // AES-256-GCM encrypted format
    let encrypted: String?
    let iv: String?
    let tag: String?
}

// MARK: - License status

/// Mirrors the four-level degradation in `src/lib/license/license-manager.ts`
/// (`getDegradationLevel`). The cutoff thresholds must stay in sync — both
/// codebases read the same license.json and compute against the same field.
/// Currently the BrewBar UI only distinguishes pro vs expired, but the level
/// is exposed so future affordances (warning banner, partial degradation)
/// can rely on it without divergence.
enum DegradationLevel: Sendable {
    case none      // 0–7 days since last server validation
    case warning   // 7–14 days — show notice, full access
    case limited   // 14–30 days — partial access
    case expired   // 30+ days — block Pro features
}

enum LicenseStatus {
    case pro(LicenseData, DegradationLevel)
    case expired
    case notFound
}

// MARK: - LicenseChecker

struct LicenseChecker {
    private static let logger = Logger(subsystem: "com.molinesdesigns.brewbar", category: "LicenseChecker")

    private static let licensePath: String = {
        NSHomeDirectory() + "/.brew-tui/license.json"
    }()

    // Pre-computed scrypt key: scryptSync('brew-tui-license-aes256gcm-v1', 'brew-tui-salt-v1', 32)
    // The encryption secret and salt are compile-time constants, so the derived key is also constant.
    // This provides the same security level as embedding the secret string itself.
    private static let encryptionKey: SymmetricKey = {
        let hex = "5c3b2ae2a3066bca28773f36db347d8c8a0a396d4b9fab628331446acd6d4126"
        let keyData = Data(hexString: hex)!
        return SymmetricKey(data: keyData)
    }()

    /// Degradation thresholds (days since last validation). Must match
    /// `getDegradationLevel` in `src/lib/license/license-manager.ts`.
    private static let warningThresholdDays: Double = 7
    private static let limitedThresholdDays: Double = 14
    private static let expiredThresholdDays: Double = 30

    // SEG-009: built-in perennial PRO accounts removed in parity with the TS
    // bundle (src/lib/license/license-manager.ts). Operator licenses now go
    // through the same Polar validation as any customer.

    // MARK: - Public API

    static func checkLicense() -> LicenseStatus {
        logger.info("Checking license at \(licensePath, privacy: .public)")

        guard let data = FileManager.default.contents(atPath: licensePath) else {
            logger.info("License file not found")
            return .notFound
        }

        guard let file = try? JSONDecoder().decode(LicenseFile.self, from: data) else {
            logger.error("Failed to decode license file")
            return .notFound
        }

        // Try encrypted format first
        if let encrypted = file.encrypted, let iv = file.iv, let tag = file.tag {
            guard let license = decrypt(encrypted: encrypted, iv: iv, tag: tag) else {
                logger.error("Failed to decrypt license data")
                return .notFound
            }
            let status = evaluate(license)
            logger.info("License check result: \(String(describing: status), privacy: .public)")
            return status
        }

        // Fallback: legacy unencrypted format
        if let license = file.license {
            let status = evaluate(license)
            logger.info("License check result (legacy format): \(String(describing: status), privacy: .public)")
            return status
        }

        logger.info("License file has no license data")
        return .notFound
    }

    /// Evaluate a license directly (for testing without filesystem access)
    static func checkLicenseWith(_ license: LicenseData) -> LicenseStatus {
        evaluate(license)
    }

    // MARK: - Evaluation

    private static func evaluate(_ license: LicenseData) -> LicenseStatus {
        // Status must be active
        guard license.status == "active" else {
            return .expired
        }

        // Check explicit expiration date
        if let expiresAt = license.expiresAt {
            if let expDate = parseDate(expiresAt), expDate < Date() {
                return .expired
            }
        }

        let level = degradationLevel(for: license)
        if level == .expired {
            return .expired
        }
        return .pro(license, level)
    }

    /// Computes the four-level degradation; mirrors `getDegradationLevel` in
    /// the TS bundle. Exposed for future UI affordances.
    static func degradationLevel(for license: LicenseData) -> DegradationLevel {
        guard let lastValidated = parseDate(license.lastValidatedAt) else {
            // Corrupted/unparseable date — fail closed, same as TS.
            return .expired
        }
        let elapsed = Date().timeIntervalSince(lastValidated)
        if elapsed < 0 { return .none } // clock skew: future timestamp → fresh
        let days = elapsed / (24 * 60 * 60)
        if days <= warningThresholdDays { return .none }
        if days <= limitedThresholdDays { return .warning }
        if days <= expiredThresholdDays { return .limited }
        return .expired
    }

    // MARK: - AES-256-GCM decryption

    private static func decrypt(encrypted: String, iv ivBase64: String, tag tagBase64: String) -> LicenseData? {
        guard let ciphertext = Data(base64Encoded: encrypted),
              let nonce = Data(base64Encoded: ivBase64),
              let tag = Data(base64Encoded: tagBase64)
        else {
            return nil
        }

        do {
            let sealedBox = try AES.GCM.SealedBox(
                nonce: AES.GCM.Nonce(data: nonce),
                ciphertext: ciphertext,
                tag: tag
            )
            let plaintext = try AES.GCM.open(sealedBox, using: encryptionKey)
            return try JSONDecoder().decode(LicenseData.self, from: plaintext)
        } catch {
            logger.error("Decryption error: \(error.localizedDescription, privacy: .public)")
            return nil
        }
    }

    private static func parseDate(_ value: String) -> Date? {
        let fractionalFormatter = ISO8601DateFormatter()
        fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let date = fractionalFormatter.date(from: value) {
            return date
        }

        let plainFormatter = ISO8601DateFormatter()
        plainFormatter.formatOptions = [.withInternetDateTime]
        return plainFormatter.date(from: value)
    }
}

// MARK: - Data hex helper

extension Data {
    init?(hexString: String) {
        let len = hexString.count / 2
        var data = Data(capacity: len)
        var index = hexString.startIndex
        for _ in 0 ..< len {
            let nextIndex = hexString.index(index, offsetBy: 2)
            guard let byte = UInt8(hexString[index ..< nextIndex], radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }
        self = data
    }
}
