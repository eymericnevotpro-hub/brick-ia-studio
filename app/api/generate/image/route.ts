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
    const isNanoBanana = modelId.includes("nano-banana");
    const result = await fal.subscribe(modelId, {
      input: isNanoBanana
        ? {
            prompt,
            aspect_ratio: aspectRatio ?? "1:1",
            num_images: 1,
            safety_tolerance: 5,
            resolution: "1K",
          }
        : {
            prompt,
            image_size: aspectRatioToFalSize(aspectRatio ?? "1:1"),
            num_images: 1,
            num_inference_steps: modelId.includes("schnell") ? 4 : 28,
            enable_safety_checker: false,
          },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any;
    const imageUrl: string =
      data?.images?.[0]?.url ?? data?.image?.url ?? data?.output ?? "";

    if (!imageUrl) {
      return NextResponse.json({ error: "Aucune image retournée" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    // Log full error for diagnosis
    console.error("[generate/image] full error:", JSON.stringify(err, null, 2));
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (err as any)?.body ?? (err as any)?.cause ?? (err as any)?.status ?? "";
    console.error("[generate/image]", message, detail);
    return NextResponse.json({ error: message, detail: String(detail) }, { status: 500 });
  }
}

function aspectRatioToFalSize(ratio: string): string {
  const map: Record<string, string> = {
    "1:1": "square_hd",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
    "4:3": "landscape_4_3",
  };
  return map[ratio] ?? "square_hd";
}
