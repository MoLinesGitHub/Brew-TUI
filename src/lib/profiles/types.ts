export interface Profile {
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  formulae: string[];
  casks: string[];
  taps: string[];
  exportedBy?: string; // Layer 16: Watermark — who exported this profile
}

export interface ProfileFile {
  version: 1;
  profile: Profile;
}
