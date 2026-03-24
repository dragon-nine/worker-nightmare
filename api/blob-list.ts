import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { r2, BUCKET, PUBLIC_URL } from './r2-client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get('prefix') || '';

  try {
    const result = await r2.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    }));

    const origin = new URL(req.url).origin;
    const blobs = (result.Contents || []).map((obj) => ({
      url: `${origin}/api/blob-image?key=${encodeURIComponent(obj.Key!)}`,
      downloadUrl: `${PUBLIC_URL}/${obj.Key}`,
      pathname: obj.Key!,
      size: obj.Size || 0,
      uploadedAt: obj.LastModified?.toISOString() || '',
    }));

    return Response.json({ blobs });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
