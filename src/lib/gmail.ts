import { google } from "googleapis";

export interface GmailSearchResult {
  id: string;
  subject: string;
  from: string;
  date: string;
}

export interface GmailMessage {
  body: string;
  headers: {
    subject: string;
    from: string;
    date: string;
  };
}

function getDateFilter(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}`;
}

function getGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth });
}

function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

async function searchMessages(query: string): Promise<GmailSearchResult[]> {
  const gmail = getGmailClient();
  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 20,
    });

    const messages = listRes.data.messages ?? [];
    if (messages.length === 0) return [];

    const results: GmailSearchResult[] = [];
    for (const msg of messages) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });
      const headers = detail.data.payload?.headers ?? [];
      results.push({
        id: msg.id,
        subject: getHeader(headers, "Subject"),
        from: getHeader(headers, "From"),
        date: getHeader(headers, "Date"),
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function searchVenmo(): Promise<GmailSearchResult[]> {
  const dateFilter = getDateFilter();
  const query = `from:venmo@venmo.com subject:"paid you" after:${dateFilter}`;
  return searchMessages(query);
}

export async function searchZelle(): Promise<GmailSearchResult[]> {
  const dateFilter = getDateFilter();
  const query = `from:notify.wellsfargo.com subject:"received money with Zelle" after:${dateFilter}`;
  return searchMessages(query);
}

export async function getMessage(id: string): Promise<GmailMessage | null> {
  const gmail = getGmailClient();
  try {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });

    const payload = detail.data.payload;
    const headers = payload?.headers ?? [];

    // Extract plain-text body (handles multipart and single-part)
    function extractBody(part: typeof payload): string {
      if (!part) return "";
      if (part.mimeType === "text/plain" && part.body?.data) {
        return Buffer.from(part.body.data, "base64").toString("utf-8");
      }
      for (const child of part.parts ?? []) {
        const found = extractBody(child);
        if (found) return found;
      }
      return "";
    }

    return {
      body: extractBody(payload),
      headers: {
        subject: getHeader(headers, "Subject"),
        from: getHeader(headers, "From"),
        date: getHeader(headers, "Date"),
      },
    };
  } catch {
    return null;
  }
}
