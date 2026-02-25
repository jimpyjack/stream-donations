import { NextResponse } from "next/server";
import { getDonations, clearDonations } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const donations = getDonations();
  return NextResponse.json({
    donations,
    total: donations.reduce((sum, d) => sum + d.amount, 0),
  });
}

export async function DELETE() {
  clearDonations();
  return NextResponse.json({ success: true });
}
