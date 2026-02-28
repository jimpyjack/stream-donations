import { NextResponse } from "next/server";
import { searchVenmo, searchZelle, getMessage } from "@/lib/gmail";
import { parseVenmoEmail, parseZelleEmail } from "@/lib/parse-email";
import { addDonation, getDonations, getDonationIds } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const existingIds = await getDonationIds();
  const newDonations: string[] = [];

  // Search both Venmo and Zelle in parallel
  const [venmoResults, zelleResults] = await Promise.all([
    searchVenmo(),
    searchZelle(),
  ]);

  // Process Venmo emails
  for (const result of venmoResults) {
    if (existingIds.has(result.id)) continue;
    const message = await getMessage(result.id);
    if (!message) continue;
    const donation = parseVenmoEmail(result, message);
    if (donation && (await addDonation(donation))) {
      newDonations.push(donation.id);
    }
  }

  // Process Zelle emails
  for (const result of zelleResults) {
    if (existingIds.has(result.id)) continue;
    const message = await getMessage(result.id);
    if (!message) continue;
    const donation = parseZelleEmail(result, message);
    if (donation && (await addDonation(donation))) {
      newDonations.push(donation.id);
    }
  }

  const allDonations = await getDonations();
  return NextResponse.json({
    donations: allDonations,
    newIds: newDonations,
    total: allDonations.reduce((sum, d) => sum + d.amount, 0),
  });
}
