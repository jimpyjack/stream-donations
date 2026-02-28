import { NextResponse } from "next/server";
import { triggerSoundbite } from "@/lib/store";

// POST - Trigger a soundbite to play on the overlay
export async function POST(request: Request) {
  try {
    const { filename, volume } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "No filename provided" },
        { status: 400 }
      );
    }

    await triggerSoundbite(filename, volume ?? 1.0);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error triggering soundbite:", error);
    return NextResponse.json(
      { error: "Failed to trigger soundbite" },
      { status: 500 }
    );
  }
}
