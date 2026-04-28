import { NextRequest, NextResponse } from "next/server";
import { createFalClient } from "@fal-ai/client";

export async function POST(req: NextRequest) {
  const key = process.env.FAL_KEY;
  if (!key) return NextResponse.json({ error: "FAL_KEY manquante" }, { status: 500 });

  const { imageBase64, prompt } = await req.json();
  if (!imageBase64 || !prompt) {
    return NextResponse.json({ error: "image et prompt requis" }, { status: 400 });
  }

  const fal = createFalClient({ credentials: key });

  try {
    // Decode base64 → Blob → upload to fal storage
    const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) throw new Error("Format d'image invalide");

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");
    const file = new File([buffer], "photo.jpg", { type: mimeType });

    const uploadedUrl = await fal.storage.upload(file);

    // Nano Banana 2 Edit (Google Gemini 3.1 Flash Image)
    const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
      input: {
        image_urls: [uploadedUrl],
        prompt,
        safety_tolerance: "5" as const,
        limit_generations: true,
        num_images: 1,
        resolution: "1K",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = result.data as any;
    const imageUrl: string =
      data?.images?.[0]?.url ??
      data?.image?.url ??
      data?.output ??
      "";

    if (!imageUrl) {
      console.error("[prank] no imageUrl, data keys:", Object.keys(data ?? {}));
      return NextResponse.json({ error: "Aucune image retournée" }, { status: 500 });
    }

    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[prank]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
