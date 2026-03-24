import { GetObjectCommand } from '@aws-sdk/client-s3';
import { r2, BUCKET } from './r2-client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return new Response('key query param required', { status: 400 });
  }

  try {
    const result = await r2.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    const body = await result.Body?.transformToByteArray();
    if (!body) {
      return new Response('Not found', { status: 404 });
    }

    return new Response(body, {
      headers: {
        'Content-Type': result.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': result.ETag || '',
      },
    });
  } catch (err) {
    return new Response((err as Error).message, { status: 404 });
  }
}
