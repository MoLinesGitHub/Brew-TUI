import CryptoKit
import Foundation

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

enum LicenseStatus {
    case pro(LicenseData)
    case expired
    case notFound
}

// MARK: - LicenseChecker

struct LicenseChecker {
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

    /// Degradation thresholds (days since last validation)
    private static let expiredThreshold: Double = 30

    // MARK: - Public API

    static func checkLicense() -> LicenseStatus {
        guard let data = FileManager.default.contents(atPath: licensePath) else {
            return .notFound
        }

        guard let file = try? JSONDecoder().decode(LicenseFile.self, from: data) else {
            return .notFound
        }

        // Try encrypted format first
        if let encrypted = file.encrypted, let iv = file.iv, let tag = file.tag {
            guard let license = decrypt(encrypted: encrypted, iv: iv, tag: tag) else {
                return .notFound
            }
            return evaluate(license)
        }

        // Fallback: legacy unencrypted format
        if let license = file.license {
            return evaluate(license)
        }

        return .notFound
    }

    // MARK: - Evaluation

    private static func evaluate(_ license: LicenseData) -> LicenseStatus {
        // Status must be active
        guard license.status == "active" else {
            return .expired
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        // Check explicit expiration date
        if let expiresAt = license.expiresAt {
            if let expDate = formatter.date(from: expiresAt), expDate < Date() {
                return .expired
            }
        }

        // Check degradation: 30+ days since last validation = expired
        if let lastValidated = formatter.date(from: license.lastValidatedAt) {
            let daysSince = Date().timeIntervalSince(lastValidated) / (24 * 60 * 60)
            if daysSince > expiredThreshold {
                return .expired
            }
        }

        return .pro(license)
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
            return nil
        }
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
