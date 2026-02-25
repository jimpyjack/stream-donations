import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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

export async function searchVenmo(): Promise<GmailSearchResult[]> {
  const dateFilter = getDateFilter();
  const query = `from:venmo@venmo.com subject:"paid you" after:${dateFilter}`;
  try {
    const { stdout } = await execAsync(
      `gog gmail search '${query}' -j --max=20 --results-only`,
      { timeout: 15000 }
    );
    const results = JSON.parse(stdout);
    if (!Array.isArray(results)) return [];
    return results.map((r: Record<string, string>) => ({
      id: r.id,
      subject: r.subject,
      from: r.from,
      date: r.date,
    }));
  } catch {
    return [];
  }
}

export async function searchZelle(): Promise<GmailSearchResult[]> {
  const dateFilter = getDateFilter();
  const query = `from:notify.wellsfargo.com subject:"received money with Zelle" after:${dateFilter}`;
  try {
    const { stdout } = await execAsync(
      `gog gmail search '${query}' -j --max=20 --results-only`,
      { timeout: 15000 }
    );
    const results = JSON.parse(stdout);
    if (!Array.isArray(results)) return [];
    return results.map((r: Record<string, string>) => ({
      id: r.id,
      subject: r.subject,
      from: r.from,
      date: r.date,
    }));
  } catch {
    return [];
  }
}

export async function getMessage(id: string): Promise<GmailMessage | null> {
  try {
    const { stdout } = await execAsync(
      `gog gmail get ${id} -j --results-only`,
      { timeout: 15000 }
    );
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}
