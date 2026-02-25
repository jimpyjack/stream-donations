import { NextResponse } from "next/server";
import { addDonation } from "@/lib/store";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST() {
  const donation = {
    id: `test-${randomUUID()}`,
    name: "Test Donor",
    amount: 5,
    message: "This is a test donation!",
    source: "venmo" as const,
    timestamp: new Date().toISOString(),
  };
  addDonation(donation);
  return NextResponse.json(donation);
}
