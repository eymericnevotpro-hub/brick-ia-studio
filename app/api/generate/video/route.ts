import { NextRequest, NextResponse } from "next/server";
import { createFalClient } from "@fal-ai/client";

export async function POST(req: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key || key === "your_fal_api_key_here") {
    return NextResponse.json({ error: "FAL_KEY manquante dans .env.local" }, { status: 500 });
  }

  const { modelId, prompt, aspectRatio } = await req.json();
  if (!modelId || !prompt) {
    return NextResponse.json({ error: "modelId et prompt requis" }, { status: 400 });
  }

  const fal = createFalClient({ credentials: key });

  try {
    const submitted = await fal.queue.submit(modelId, {
      input: buildVideoInput(modelId, prompt, aspectRatio ?? "16:9"),
    });

    return NextResponse.json({ requestId: submitted.request_id, modelId });
  } catch (err: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (err as any)?.body;
    const message = body?.detail ?? body?.message ?? (err instanceof Error ? err.message : String(err));
    console.error("[generate/video]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function buildVideoInput(modelId: string, prompt: string, aspectRatio: string) {
  if (modelId.includes("hunyuan-video")) {
    return {
      prompt,
      video_size: aspectRatio === "9:16" ? "portrait_16_9" : "landscape_16_9",
      num_inference_steps: 30,
      num_frames: 85,
      fps: 24,
      guidance_scale: 6,
      flow_shift: 7,
      embedded_guidance_scale: 6,
    };
  }

  if (modelId.includes("cogvideox")) {
    return {
      prompt,
      num_inference_steps: 50,
      guidance_scale: 7,
      use_rife: true,
      export_fps: 16,
    };
  }

  if (modelId.includes("wan")) {
    return {
      prompt,
      aspect_ratio: aspectRatio,
      num_frames: 81,
      frames_per_second: 16,
      num_inference_steps: 30,
    };
  }

  return { prompt };
}
