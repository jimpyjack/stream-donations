import type { GmailSearchResult, GmailMessage } from "./gmail";

export interface ParsedDonation {
  id: string;
  name: string;
  amount: number;
  message: string;
  source: "venmo" | "zelle";
  timestamp: string;
}

export function parseVenmoFromSubject(
  result: GmailSearchResult
): { name: string; amount: number } | null {
  // Subject format: "cj v paid you $19.00"
  const match = result.subject.match(/^(.+?)\s+paid you \$([0-9,.]+)$/i);
  if (!match) return null;
  return {
    name: match[1].trim(),
    amount: parseFloat(match[2].replace(/,/g, "")),
  };
}

export function parseVenmoNote(body: string): string {
  // Look for the transaction-note class in the HTML
  const match = body.match(
    /class="transaction-note[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  if (!match) return "";
  // Strip HTML tags and trim
  return match[1].replace(/<[^>]*>/g, "").trim();
}

export function parseVenmoEmail(
  result: GmailSearchResult,
  message: GmailMessage
): ParsedDonation | null {
  const parsed = parseVenmoFromSubject(result);
  if (!parsed) return null;
  const note = parseVenmoNote(message.body);
  return {
    id: result.id,
    name: parsed.name,
    amount: parsed.amount,
    message: note,
    source: "venmo",
    timestamp: message.headers.date || result.date,
  };
}

export function parseZelleFromBody(
  body: string
): { name: string; amount: number } | null {
  // Look for: "HARPER NADLMAN sent you $500.00" in an h1 tag
  const match = body.match(
    />\s*([A-Za-z][A-Za-z .'-]+?)\s+sent you \$([0-9,.]+)\s*<\/h1>/i
  );
  if (!match) return null;
  return {
    name: titleCase(match[1].trim()),
    amount: parseFloat(match[2].replace(/,/g, "")),
  };
}

export function parseZelleMemo(body: string): string {
  const match = body.match(/Memo:\s*<strong>([^<]*)<\/strong>/i);
  if (!match) return "";
  return match[1].trim();
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function parseZelleEmail(
  result: GmailSearchResult,
  message: GmailMessage
): ParsedDonation | null {
  const parsed = parseZelleFromBody(message.body);
  if (!parsed) return null;
  const memo = parseZelleMemo(message.body);
  return {
    id: result.id,
    name: parsed.name,
    amount: parsed.amount,
    message: memo,
    source: "zelle",
    timestamp: message.headers.date || result.date,
  };
}
