import { NextResponse } from "next/server";
import { getSoundbites, setSoundbites, type SoundbitesState } from "@/lib/store";

// GET - Return current soundbites state
export async function GET() {
  try {
    const soundbites = getSoundbites();
    return NextResponse.json(soundbites);
  } catch (error) {
    console.error("Error getting soundbites:", error);
    return NextResponse.json(
      { error: "Failed to get soundbites" },
      { status: 500 }
    );
  }
}

// PUT - Update soundbite configurations
export async function PUT(request: Request) {
  try {
    const updates: SoundbitesState = await request.json();
    setSoundbites(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating soundbites:", error);
    return NextResponse.json(
      { error: "Failed to update soundbites" },
      { status: 500 }
    );
  }
}
