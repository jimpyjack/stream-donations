import { neon } from "@neondatabase/serverless";

export interface Donation {
  id: string;
  name: string;
  amount: number;
  message: string;
  source: "venmo" | "zelle";
  timestamp: string;
}

export interface Goal {
  label: string;
  target: number;
  active: boolean;
}

export interface Theme {
  preset: string;
  barColor: string;
  barBgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  alertStyle: "slide-up" | "slide-right" | "fade-in" | "bounce";
  barStyle: "rounded" | "flat" | "gradient";
}

export interface AudioSettings {
  enabled: boolean;
  volume: number;
  soundFile: string;
}

export interface SoundbiteConfig {
  filename: string;
  label: string;
  enabled: boolean;
  volume: number;
}

export interface SoundbiteTrigger {
  id: string;
  filename: string;
  timestamp: number;
  volume: number;
}

export interface SoundbitesState {
  configs: SoundbiteConfig[];
  pendingTrigger: SoundbiteTrigger | null;
}

export interface RouletteState {
  active: boolean;
  redVotes: number;
  blackVotes: number;
  sessionId: string;
  voterTimestamps: Record<string, number>;
}

const DEFAULT_GOAL: Goal = { label: "", target: 0, active: false };
const DEFAULT_THEME: Theme = {
  preset: "neon",
  barColor: "#00ff88",
  barBgColor: "#1a1a2e",
  textColor: "#ffffff",
  accentColor: "#ff6b6b",
  fontFamily: "Inter",
  alertStyle: "slide-up",
  barStyle: "rounded",
};
const DEFAULT_AUDIO: AudioSettings = {
  enabled: true,
  volume: 0.7,
  soundFile: "donation-chime.mp3",
};
const DEFAULT_SOUNDBITES: SoundbitesState = {
  configs: [],
  pendingTrigger: null,
};
const DEFAULT_ROULETTE: RouletteState = {
  active: false,
  redVotes: 0,
  blackVotes: 0,
  sessionId: "",
  voterTimestamps: {},
};

function sql() {
  return neon(process.env.DATABASE_URL!);
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const db = sql();
  const rows = await db`SELECT value FROM settings WHERE key = ${key}`;
  if (rows.length === 0) return fallback;
  return rows[0].value as T;
}

async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO settings (key, value)
    VALUES (${key}, ${JSON.stringify(value)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
}

export async function getDonations(): Promise<Donation[]> {
  const db = sql();
  const rows = await db`SELECT * FROM donations ORDER BY timestamp DESC`;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    message: r.message ?? "",
    source: r.source as "venmo" | "zelle",
    timestamp: r.timestamp,
  }));
}

export async function addDonation(donation: Donation): Promise<boolean> {
  const db = sql();
  try {
    await db`
      INSERT INTO donations (id, name, amount, message, source, timestamp)
      VALUES (${donation.id}, ${donation.name}, ${donation.amount}, ${donation.message}, ${donation.source}, ${donation.timestamp})
    `;
    return true;
  } catch {
    // Duplicate primary key = already exists
    return false;
  }
}

export async function getDonationIds(): Promise<Set<string>> {
  const db = sql();
  const rows = await db`SELECT id FROM donations`;
  return new Set(rows.map((r) => r.id as string));
}

export async function clearDonations(): Promise<void> {
  const db = sql();
  await db`DELETE FROM donations`;
}

export async function getGoal(): Promise<Goal> {
  return getSetting("goal", DEFAULT_GOAL);
}

export async function setGoal(goal: Goal): Promise<void> {
  return setSetting("goal", goal);
}

export async function getTheme(): Promise<Theme> {
  return getSetting("theme", DEFAULT_THEME);
}

export async function setTheme(theme: Theme): Promise<void> {
  return setSetting("theme", theme);
}

export async function getAudioSettings(): Promise<AudioSettings> {
  return getSetting("audio", DEFAULT_AUDIO);
}

export async function setAudioSettings(audio: AudioSettings): Promise<void> {
  return setSetting("audio", audio);
}

export async function getMovieCount(): Promise<number> {
  return getSetting("movieCount", 0);
}

export async function setMovieCount(count: number): Promise<void> {
  return setSetting("movieCount", count);
}

export async function getSoundbites(): Promise<SoundbitesState> {
  return getSetting("soundbites", DEFAULT_SOUNDBITES);
}

export async function setSoundbites(soundbites: SoundbitesState): Promise<void> {
  return setSetting("soundbites", soundbites);
}

export async function getRoulette(): Promise<RouletteState> {
  return getSetting("roulette", DEFAULT_ROULETTE);
}

export async function setRoulette(roulette: RouletteState): Promise<void> {
  return setSetting("roulette", roulette);
}

export async function triggerSoundbite(filename: string, volume: number): Promise<void> {
  const soundbites = await getSoundbites();
  const trigger: SoundbiteTrigger = {
    id: `${Date.now()}-${Math.random()}`,
    filename,
    timestamp: Date.now(),
    volume,
  };
  soundbites.pendingTrigger = trigger;
  await setSoundbites(soundbites);
}
