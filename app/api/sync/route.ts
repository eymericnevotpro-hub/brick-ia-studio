import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One shared blob for the whole app (couple's private data). Bumping the
// suffix would start a fresh shared space.
const KEY = "bproductive:shared:v1";

// Read the Upstash/Vercel-KV REST credentials, whatever prefix Vercel injected.
function creds(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export async function GET() {
  const c = creds();
  if (!c) return Response.json({ configured: false });
  try {
    const r = await fetch(`${c.url}/get/${encodeURIComponent(KEY)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
      cache: "no-store",
    });
    const j = (await r.json()) as { result?: string | null };
    const data = j.result ? JSON.parse(j.result) : {};
    return Response.json({ configured: true, data });
  } catch {
    return Response.json({ configured: true, data: {}, error: "read" });
  }
}

export async function POST(req: NextRequest) {
  const c = creds();
  if (!c) return Response.json({ configured: false }, { status: 503 });
  let body: { data?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const data = body?.data ?? {};
  try {
    const r = await fetch(`${c.url}/set/${encodeURIComponent(KEY)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.token}`, "content-type": "text/plain" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error("set");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "write" }, { status: 500 });
  }
}
