import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2, BUCKET, PUBLIC_URL } from './r2-client';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return Response.json({ error: 'url field required' }, { status: 400 });
    }

    // URL에서 key 추출: 프록시 URL 또는 R2 직접 URL 모두 지원
    let key = url;
    if (url.includes('blob-image?key=')) {
      key = decodeURIComponent(new URL(url).searchParams.get('key') || '');
    } else if (url.includes(PUBLIC_URL)) {
      key = url.replace(`${PUBLIC_URL}/`, '');
    }

    await r2.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
