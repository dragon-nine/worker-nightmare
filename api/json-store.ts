import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, BUCKET } from './r2-client';

async function readJson(key: string): Promise<unknown> {
  try {
    const result = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await result.Body!.transformToString();
    return JSON.parse(text);
  } catch (e) {
    console.error(`[json-store] readJson failed for key="${key}":`, e);
    return null;
  }
}

async function writeJson(key: string, data: unknown): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return Response.json({ error: 'key required' }, { status: 400 });

  const data = await readJson(key);
  return Response.json({ data });
}

export async function POST(req: Request) {
  const { key, data } = await req.json();
  if (!key) return Response.json({ error: 'key required' }, { status: 400 });

  try {
    await writeJson(key, data);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(`[json-store] writeJson failed for key="${key}":`, e);
    return Response.json({ error: 'write failed' }, { status: 500 });
  }
}
