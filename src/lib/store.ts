import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "donations.json");

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
  filename: string;      // MP3 filename (e.g., "airhorn.mp3")
  label: string;         // Custom display name (e.g., "Airhorn 🎺")
  enabled: boolean;      // Whether this soundbite is active
  volume: number;        // Individual volume (0.0 to 1.0)
}

export interface SoundbiteTrigger {
  id: string;           // Unique trigger ID (timestamp-based)
  filename: string;     // Which sound to play
  timestamp: number;    // When it was triggered
  volume: number;       // Volume to play at (0.0 to 1.0)
}

export interface SoundbitesState {
  configs: SoundbiteConfig[];           // All soundbite configurations
  pendingTrigger: SoundbiteTrigger | null;  // Currently queued sound to play
}

interface StoreData {
  donations: Donation[];
  goal: Goal;
  theme: Theme;
  audio: AudioSettings;
  movieCount: number;
  soundbites: SoundbitesState;
}

const DEFAULT_DATA: StoreData = {
  donations: [],
  goal: { label: "", target: 0, active: false },
  theme: {
    preset: "neon",
    barColor: "#00ff88",
    barBgColor: "#1a1a2e",
    textColor: "#ffffff",
    accentColor: "#ff6b6b",
    fontFamily: "Inter",
    alertStyle: "slide-up",
    barStyle: "rounded",
  },
  audio: {
    enabled: true,
    volume: 0.7,
    soundFile: "donation-chime.mp3",
  },
  movieCount: 0,
  soundbites: {
    configs: [],
    pendingTrigger: null,
  },
};

function readData(): StoreData {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return structuredClone(DEFAULT_DATA);
  }
  const raw = readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: StoreData) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getDonations(): Donation[] {
  return readData().donations;
}

export function addDonation(donation: Donation): boolean {
  const data = readData();
  if (data.donations.some((d) => d.id === donation.id)) {
    return false; // already exists
  }
  data.donations.push(donation);
  writeData(data);
  return true;
}

export function getGoal(): Goal {
  return readData().goal;
}

export function setGoal(goal: Goal) {
  const data = readData();
  data.goal = goal;
  writeData(data);
}

export function clearDonations() {
  const data = readData();
  data.donations = [];
  writeData(data);
}

export function getTheme(): Theme {
  return readData().theme;
}

export function setTheme(theme: Theme) {
  const data = readData();
  data.theme = theme;
  writeData(data);
}

export function getDonationIds(): Set<string> {
  return new Set(readData().donations.map((d) => d.id));
}

export function getAudioSettings(): AudioSettings {
  return readData().audio;
}

export function setAudioSettings(audio: AudioSettings) {
  const data = readData();
  data.audio = audio;
  writeData(data);
}

export function getMovieCount(): number {
  return readData().movieCount ?? 0;
}

export function setMovieCount(count: number) {
  const data = readData();
  data.movieCount = count;
  writeData(data);
}

export function getSoundbites(): SoundbitesState {
  const data = readData();
  return data.soundbites ?? { configs: [], pendingTrigger: null };
}

export function setSoundbites(soundbites: SoundbitesState) {
  const data = readData();
  data.soundbites = soundbites;
  writeData(data);
}

export function triggerSoundbite(filename: string, volume: number) {
  const data = readData();
  const trigger: SoundbiteTrigger = {
    id: `${Date.now()}-${Math.random()}`,
    filename,
    timestamp: Date.now(),
    volume,
  };
  data.soundbites = data.soundbites ?? { configs: [], pendingTrigger: null };
  data.soundbites.pendingTrigger = trigger;
  writeData(data);
}
