import { NextRequest, NextResponse } from "next/server";
import { createFalClient } from "@fal-ai/client";

export async function GET(req: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return NextResponse.json({ error: "FAL_KEY manquante" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  const modelId = searchParams.get("modelId");
  if (!requestId || !modelId) {
    return NextResponse.json({ error: "requestId et modelId requis" }, { status: 400 });
  }

  const fal = createFalClient({ credentials: key });

  try {
    const status = await fal.queue.status(modelId, { requestId, logs: false });

    if (status.status === "COMPLETED") {
      const result = await fal.queue.result(modelId, { requestId });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = result.data as any;

      const videoUrl: string =
        data?.video?.url ??
        data?.videos?.[0]?.url ??
        data?.samples?.[0]?.url ??
        data?.output?.url ??
        "";

      if (!videoUrl) {
        console.error("[status] COMPLETED but no videoUrl. data keys:", Object.keys(data ?? {}));
        return NextResponse.json({ error: "Vidéo générée mais URL introuvable" }, { status: 500 });
      }

      return NextResponse.json({ status: "COMPLETED", videoUrl });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((status as any).status === "FAILED") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reason = (status as any)?.error ?? "Génération échouée côté fal.ai";
      return NextResponse.json({ error: reason }, { status: 500 });
    }

    // IN_QUEUE or IN_PROGRESS
    return NextResponse.json({ status: status.status });

  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (err as any)?.body;
    const message = body?.detail ?? body?.message ?? (err instanceof Error ? err.message : String(err));
    console.error("[generate/status]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
