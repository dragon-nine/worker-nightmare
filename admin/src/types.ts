export interface BlobItem {
  url: string;
  downloadUrl?: string;
  pathname: string;
  size: number;
  uploadedAt: string;
}

export interface AssetCategory {
  key: string;
  label: string;
  prefix: string;
  accept: string;
}

export interface StoreAssetSpec {
  key: string;
  label: string;
  width: number;
  height: number;
  format: string;
  maxSize?: number;
  maxCount: number;
  minCount: number;
  prefix: string;
}

export type TabId = 'game-assets' | 'google-play' | 'toss';
