import { NextResponse } from "next/server";
import { readdirSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const publicDir = join(process.cwd(), "public");
    const files = readdirSync(publicDir);
    const mp3Files = files.filter(file => file.toLowerCase().endsWith('.mp3'));

    return NextResponse.json({ files: mp3Files });
  } catch (error) {
    return NextResponse.json({ files: [] });
  }
}
