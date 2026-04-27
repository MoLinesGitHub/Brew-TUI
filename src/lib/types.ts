export type ViewId =
  | 'dashboard'
  | 'installed'
  | 'search'
  | 'outdated'
  | 'package-info'
  | 'services'
  | 'doctor'
  | 'profiles'
  | 'smart-cleanup'
  | 'history'
  | 'rollback'
  | 'brewfile'
  | 'security-audit'
  | 'account';

export interface Formula {
  name: string;
  full_name: string;
  tap: string;
  desc: string;
  license: string;
  homepage: string;
  versions: {
    stable: string;
    head: string | null;
    bottle: boolean;
  };
  dependencies: string[];
  build_dependencies: string[];
  installed: InstalledVersion[];
  linked_keg: string | null;
  pinned: boolean;
  outdated: boolean;
  deprecated: boolean;
  keg_only: boolean;
  caveats: string | null;
}

export interface InstalledVersion {
  version: string;
  used_options: string[];
  built_as_bottle: boolean;
  poured_from_bottle: boolean;
  time: number;
  runtime_dependencies: RuntimeDep[];
  installed_as_dependency: boolean;
  installed_on_request: boolean;
}

export interface RuntimeDep {
  full_name: string;
  version: string;
  revision: number;
  pkg_version: string;
  declared_directly: boolean;
}

export interface Cask {
  token: string;
  full_token: string;
  name: string[];
  desc: string;
  homepage: string;
  version: string;
  installed: string | null;
  installed_time: number | null;
  outdated: boolean;
  auto_updates: boolean;
}

export interface OutdatedPackage {
  name: string;
  installed_versions: string[];
  current_version: string;
  pinned: boolean;
  pinned_version: string | null;
}

export interface BrewService {
  name: string;
  status: 'started' | 'stopped' | 'error' | 'none';
  user: string | null;
  file: string | null;
  exit_code: number | null;
}

export interface BrewConfig {
  HOMEBREW_VERSION: string;
  HOMEBREW_PREFIX: string;
  coreUpdated: string;
}

export interface BrewInfoResponse {
  formulae: Formula[];
  casks: Cask[];
}

export interface BrewOutdatedResponse {
  formulae: OutdatedPackage[];
  casks: OutdatedPackage[];
}

export interface PackageListItem {
  name: string;
  version: string;
  desc: string;
  type: 'formula' | 'cask';
  outdated: boolean;
  pinned: boolean;
  kegOnly: boolean;
  installedAsDependency: boolean;
  installedTime: number | null;
}
