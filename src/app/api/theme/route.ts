import { NextResponse } from "next/server";
import { getTheme, setTheme, type Theme } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getTheme());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const theme: Theme = {
    preset: String(body.preset || "custom"),
    barColor: String(body.barColor || "#00ff88"),
    barBgColor: String(body.barBgColor || "#1a1a2e"),
    textColor: String(body.textColor || "#ffffff"),
    accentColor: String(body.accentColor || "#ff6b6b"),
    fontFamily: String(body.fontFamily || "Inter"),
    alertStyle: body.alertStyle || "slide-up",
    barStyle: body.barStyle || "rounded",
  };
  setTheme(theme);
  return NextResponse.json(theme);
}
