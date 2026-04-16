export interface Profile {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  formulae: string[];
  casks: string[];
  taps: string[];
}

export interface ProfileFile {
  version: 1;
  profile: Profile;
}
