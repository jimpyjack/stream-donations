import { NextResponse } from "next/server";
import { readdirSync, existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { getSoundbites, setSoundbites } from "@/lib/store";

const SOUNDBITES_DIR = join(process.cwd(), "public", "soundbites");

// Ensure soundbites directory exists
function ensureSoundbitesDir() {
  if (!existsSync(SOUNDBITES_DIR)) {
    mkdirSync(SOUNDBITES_DIR, { recursive: true });
  }
}

// GET - List all MP3 files in the soundbites folder
export async function GET() {
  try {
    ensureSoundbitesDir();
    const files = readdirSync(SOUNDBITES_DIR);
    const mp3Files = files.filter((file) => file.toLowerCase().endsWith(".mp3"));
    return NextResponse.json({ files: mp3Files });
  } catch (error) {
    console.error("Error listing soundbite files:", error);
    return NextResponse.json(
      { error: "Failed to list soundbite files" },
      { status: 500 }
    );
  }
}

// POST - Upload a new soundbite file
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".mp3")) {
      return NextResponse.json(
        { error: "Only MP3 files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Sanitize filename - remove special characters and path separators
    let filename = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/\.+/g, ".");

    // Ensure .mp3 extension
    if (!filename.toLowerCase().endsWith(".mp3")) {
      filename += ".mp3";
    }

    ensureSoundbitesDir();

    // Handle duplicate filenames
    let finalFilename = filename;
    let counter = 1;
    while (existsSync(join(SOUNDBITES_DIR, finalFilename))) {
      const nameWithoutExt = filename.replace(/\.mp3$/i, "");
      finalFilename = `${nameWithoutExt}_${counter}.mp3`;
      counter++;
    }

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(SOUNDBITES_DIR, finalFilename);
    writeFileSync(filePath, buffer);

    // Auto-create config for new file
    const soundbites = getSoundbites();
    const labelWithoutExt = finalFilename.replace(/\.mp3$/i, "");
    soundbites.configs.push({
      filename: finalFilename,
      label: labelWithoutExt,
      enabled: true,
      volume: 1.0,
    });
    setSoundbites(soundbites);

    return NextResponse.json({
      success: true,
      filename: finalFilename,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Error uploading soundbite:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a soundbite file
export async function DELETE(request: Request) {
  try {
    const { filename } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "No filename provided" },
        { status: 400 }
      );
    }

    // Validate filename (prevent path traversal)
    if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }

    const filePath = join(SOUNDBITES_DIR, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Delete file
    unlinkSync(filePath);

    // Remove from configs
    const soundbites = getSoundbites();
    soundbites.configs = soundbites.configs.filter((c) => c.filename !== filename);
    setSoundbites(soundbites);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting soundbite:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
