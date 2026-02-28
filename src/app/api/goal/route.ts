import { NextResponse } from "next/server";
import { getGoal, setGoal } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getGoal());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const goal = {
    label: String(body.label || ""),
    target: Number(body.target) || 0,
    active: Boolean(body.active),
  };
  await setGoal(goal);
  return NextResponse.json(goal);
}
