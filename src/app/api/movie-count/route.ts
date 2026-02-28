import { NextResponse } from "next/server";
import { getMovieCount, setMovieCount } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ count: await getMovieCount() });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const count = Math.max(0, Math.floor(Number(body.count) || 0));
  await setMovieCount(count);
  return NextResponse.json({ count });
}
