import type { BlobItem } from './types';

const API_BASE = '/api';

export async function listBlobs(prefix: string): Promise<BlobItem[]> {
  const res = await fetch(`${API_BASE}/blob-list?prefix=${encodeURIComponent(prefix)}`);
  if (!res.ok) throw new Error(`List failed: ${res.statusText}`);
  const data = await res.json();
  return data.blobs;
}

export async function uploadBlob(file: File, prefix: string, filename?: string): Promise<BlobItem> {
  const name = filename || file.name;
  const res = await fetch(
    `${API_BASE}/blob-upload?prefix=${encodeURIComponent(prefix)}&filename=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file,
    },
  );
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  return res.json();
}

export async function deleteBlob(url: string): Promise<void> {
  const res = await fetch(`${API_BASE}/blob-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);
}
