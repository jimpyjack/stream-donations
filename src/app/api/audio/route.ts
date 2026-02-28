import { NextResponse } from "next/server";
import { getAudioSettings, setAudioSettings, type AudioSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAudioSettings());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const audio: AudioSettings = {
    enabled: Boolean(body.enabled ?? true),
    volume: Number(body.volume ?? 0.7),
    soundFile: String(body.soundFile || "donation-chime.mp3"),
  };
  await setAudioSettings(audio);
  return NextResponse.json(audio);
}
