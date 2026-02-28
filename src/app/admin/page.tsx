"use client";

import { useEffect, useState, useCallback } from "react";

interface Donation {
  id: string;
  name: string;
  amount: number;
  message: string;
  source: "venmo" | "zelle";
  timestamp: string;
}

interface Goal {
  label: string;
  target: number;
  active: boolean;
}

interface Theme {
  preset: string;
  barColor: string;
  barBgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  alertStyle: "slide-up" | "slide-right" | "fade-in" | "bounce";
  barStyle: "rounded" | "flat" | "gradient";
}

interface AudioSettings {
  enabled: boolean;
  volume: number;
  soundFile: string;
}

interface SoundbiteConfig {
  filename: string;
  label: string;
  enabled: boolean;
  volume: number;
}

interface SoundbiteTrigger {
  id: string;
  filename: string;
  timestamp: number;
  volume: number;
}

interface SoundbitesState {
  configs: SoundbiteConfig[];
  pendingTrigger: SoundbiteTrigger | null;
}

const PRESETS: Record<string, Omit<Theme, "preset">> = {
  neon: {
    barColor: "#00ff88",
    barBgColor: "#1a1a2e",
    textColor: "#ffffff",
    accentColor: "#ff6b6b",
    fontFamily: "Inter",
    alertStyle: "slide-up",
    barStyle: "rounded",
  },
  minimal: {
    barColor: "#3b82f6",
    barBgColor: "#1e293b",
    textColor: "#f1f5f9",
    accentColor: "#60a5fa",
    fontFamily: "Inter",
    alertStyle: "fade-in",
    barStyle: "flat",
  },
  retro: {
    barColor: "#facc15",
    barBgColor: "#1c1917",
    textColor: "#fef3c7",
    accentColor: "#f97316",
    fontFamily: "Press Start 2P",
    alertStyle: "bounce",
    barStyle: "flat",
  },
  pastel: {
    barColor: "#a78bfa",
    barBgColor: "#2e1065",
    textColor: "#e9d5ff",
    accentColor: "#f0abfc",
    fontFamily: "Inter",
    alertStyle: "slide-right",
    barStyle: "gradient",
  },
};

const FONTS = ["Inter", "Roboto Mono", "Press Start 2P", "Georgia", "Courier New"];
const ALERT_STYLES: Theme["alertStyle"][] = ["slide-up", "slide-right", "fade-in", "bounce"];
const BAR_STYLES: Theme["barStyle"][] = ["rounded", "flat", "gradient"];

type AdminTab = "goal" | "donations" | "theme" | "audio" | "movie" | "soundbites" | "roulette";

interface RouletteData {
  active: boolean;
  redVotes: number;
  blackVotes: number;
}

export default function AdminDashboard() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [goal, setGoal] = useState<Goal>({ label: "", target: 0, active: false });
  const [theme, setTheme] = useState<Theme>({
    preset: "neon",
    ...PRESETS.neon,
  });
  const [audio, setAudio] = useState<AudioSettings>({
    enabled: true,
    volume: 0.7,
    soundFile: "donation-chime.mp3",
  });
  const [goalLabel, setGoalLabel] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalActive, setGoalActive] = useState(false);
  const [pollStatus, setPollStatus] = useState<"idle" | "polling" | "success" | "error">("idle");
  const [activeTab, setActiveTab] = useState<AdminTab>("goal");
  const [lastPoll, setLastPoll] = useState<string>("");
  const [movieCount, setMovieCount] = useState(0);
  const [availableAudioFiles, setAvailableAudioFiles] = useState<string[]>([]);
  const [soundbites, setSoundbites] = useState<SoundbitesState>({
    configs: [],
    pendingTrigger: null,
  });
  const [availableSoundbiteFiles, setAvailableSoundbiteFiles] = useState<string[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [roulette, setRoulette] = useState<RouletteData>({ active: false, redVotes: 0, blackVotes: 0 });

  const fetchAll = useCallback(async () => {
    try {
      const [donRes, goalRes, themeRes, audioRes, movieRes] = await Promise.all([
        fetch("/api/donations"),
        fetch("/api/goal"),
        fetch("/api/theme"),
        fetch("/api/audio"),
        fetch("/api/movie-count"),
      ]);
      const donData = await donRes.json();
      const goalData = await goalRes.json();
      const themeData = await themeRes.json();
      const audioData = await audioRes.json();
      const movieData = await movieRes.json();
      setDonations(donData.donations || []);
      setGoal(goalData);
      setGoalLabel(goalData.label);
      setGoalTarget(goalData.target > 0 ? String(goalData.target) : "");
      setGoalActive(goalData.active);
      setTheme(themeData);
      setAudio(audioData);
      setMovieCount(movieData.count ?? 0);
    } catch {
      // retry next cycle
    }
  }, []);

  const triggerPoll = useCallback(async () => {
    setPollStatus("polling");
    try {
      const res = await fetch("/api/poll");
      const data = await res.json();
      setDonations(data.donations || []);
      setPollStatus("success");
      setLastPoll(new Date().toLocaleTimeString());
      setTimeout(() => setPollStatus("idle"), 2000);
    } catch {
      setPollStatus("error");
      setTimeout(() => setPollStatus("idle"), 3000);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(triggerPoll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll, triggerPoll]);

  useEffect(() => {
    const fetchAudioFiles = async () => {
      try {
        const res = await fetch("/api/audio-files");
        const data = await res.json();
        setAvailableAudioFiles(data.files || []);
      } catch {
        setAvailableAudioFiles([]);
      }
    };
    fetchAudioFiles();
  }, []);

  const fetchSoundbites = useCallback(async () => {
    try {
      const [soundbitesRes, filesRes] = await Promise.all([
        fetch("/api/soundbites"),
        fetch("/api/soundbites/files"),
      ]);
      const soundbitesData = await soundbitesRes.json();
      const filesData = await filesRes.json();
      setSoundbites(soundbitesData);
      setAvailableSoundbiteFiles(filesData.files || []);

      // Auto-create configs for new files
      const existingFilenames = soundbitesData.configs.map((c: SoundbiteConfig) => c.filename);
      const newFiles = (filesData.files || []).filter(
        (f: string) => !existingFilenames.includes(f)
      );
      if (newFiles.length > 0) {
        const updatedConfigs = [
          ...soundbitesData.configs,
          ...newFiles.map((f: string) => ({
            filename: f,
            label: f.replace(/\.mp3$/i, ""),
            enabled: true,
            volume: 1.0,
          })),
        ];
        const updatedSoundbites = {
          ...soundbitesData,
          configs: updatedConfigs,
        };
        setSoundbites(updatedSoundbites);
      }
      // Ensure all existing configs have volume (backward compatibility)
      const configsWithVolume = soundbitesData.configs.map((c: SoundbiteConfig) => ({
        ...c,
        volume: c.volume ?? 1.0,
      }));
      if (configsWithVolume.some((c: SoundbiteConfig, i: number) => c.volume !== soundbitesData.configs[i].volume)) {
        setSoundbites({ ...soundbitesData, configs: configsWithVolume });
      }
    } catch {
      // retry next time
    }
  }, []);

  useEffect(() => {
    if (activeTab === "soundbites") {
      fetchSoundbites();
    }
  }, [activeTab, fetchSoundbites]);

  const fetchRoulette = useCallback(async () => {
    try {
      const res = await fetch("/api/roulette");
      const data = await res.json();
      setRoulette({ active: data.active, redVotes: data.redVotes, blackVotes: data.blackVotes });
    } catch {
      // retry next cycle
    }
  }, []);

  useEffect(() => {
    if (activeTab !== "roulette") return;
    fetchRoulette();
    const interval = setInterval(fetchRoulette, 5000);
    return () => clearInterval(interval);
  }, [activeTab, fetchRoulette]);

  const rouletteAction = async (action: "open" | "close" | "reset") => {
    if (action === "reset" && !confirm("Reset all votes? This can't be undone.")) return;
    const res = await fetch("/api/roulette", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setRoulette({ active: data.active, redVotes: data.redVotes, blackVotes: data.blackVotes });
  };

  const saveGoal = async () => {
    const newGoal: Goal = {
      label: goalLabel,
      target: parseFloat(goalTarget) || 0,
      active: goalActive,
    };
    await fetch("/api/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newGoal),
    });
    setGoal(newGoal);
  };

  const clearAll = async () => {
    if (!confirm("Clear all donations? This can't be undone.")) return;
    await fetch("/api/donations", { method: "DELETE" });
    setDonations([]);
  };

  const saveTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    await fetch("/api/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTheme),
    });
  };

  const applyPreset = (name: string) => {
    const preset = PRESETS[name];
    if (preset) {
      saveTheme({ preset: name, ...preset });
    }
  };

  const saveAudio = async (newAudio: AudioSettings) => {
    setAudio(newAudio);
    await fetch("/api/audio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAudio),
    });
  };

  const updateMovieCount = async (newCount: number) => {
    const count = Math.max(0, newCount);
    setMovieCount(count);
    await fetch("/api/movie-count", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
  };

  const testSound = () => {
    const testAudio = new Audio(`/${audio.soundFile}`);
    testAudio.volume = audio.volume;
    testAudio.play().catch(() => {
      alert("Could not play audio. Make sure the file exists in the /public folder.");
    });
  };

  const handleSoundbiteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/soundbites/files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus("success");
        setUploadMessage(data.message || "File uploaded successfully!");
        await fetchSoundbites();
        setTimeout(() => {
          setUploadStatus("idle");
          setUploadMessage("");
        }, 3000);
      } else {
        setUploadStatus("error");
        setUploadMessage(data.error || "Upload failed");
        setTimeout(() => {
          setUploadStatus("idle");
          setUploadMessage("");
        }, 3000);
      }
    } catch (err) {
      setUploadStatus("error");
      setUploadMessage("Upload failed");
      setTimeout(() => {
        setUploadStatus("idle");
        setUploadMessage("");
      }, 3000);
    }

    // Reset file input
    e.target.value = "";
  };

  const saveSoundbites = async () => {
    await fetch("/api/soundbites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(soundbites),
    });
  };

  const playSoundbite = async (filename: string) => {
    const config = soundbites.configs.find((c) => c.filename === filename);
    const volume = config?.volume ?? 1.0;
    await fetch("/api/soundbites/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, volume }),
    });
  };

  const deleteSoundbite = async (filename: string) => {
    if (!confirm(`Delete ${filename}? This can't be undone.`)) return;

    try {
      const res = await fetch("/api/soundbites/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });

      if (res.ok) {
        await fetchSoundbites();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete file");
      }
    } catch {
      alert("Failed to delete file");
    }
  };

  const updateSoundbiteLabel = (filename: string, newLabel: string) => {
    setSoundbites({
      ...soundbites,
      configs: soundbites.configs.map((c) =>
        c.filename === filename ? { ...c, label: newLabel } : c
      ),
    });
  };

  const toggleSoundbiteEnabled = (filename: string) => {
    setSoundbites({
      ...soundbites,
      configs: soundbites.configs.map((c) =>
        c.filename === filename ? { ...c, enabled: !c.enabled } : c
      ),
    });
  };

  const updateSoundbiteVolume = (filename: string, newVolume: number) => {
    setSoundbites({
      ...soundbites,
      configs: soundbites.configs.map((c) =>
        c.filename === filename ? { ...c, volume: newVolume } : c
      ),
    });
  };

  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  const progress = goal.active && goal.target > 0 ? Math.min((total / goal.target) * 100, 100) : 0;

  const barRadius = theme.barStyle === "rounded" ? "9999px" : theme.barStyle === "flat" ? "0" : "9999px";
  const barFill =
    theme.barStyle === "gradient"
      ? `linear-gradient(90deg, ${theme.barColor}, ${theme.accentColor})`
      : theme.barColor;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "#1a1a1a",
    color: "#fff",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  };

  const cardStyle: React.CSSProperties = {
    background: "#111",
    borderRadius: 16,
    border: "1px solid #222",
    padding: 20,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;700&family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus, select:focus { border-color: #444 !important; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Stream Donations</h1>
            <p style={{ fontSize: 13, opacity: 0.4, marginTop: 2 }}>Admin Dashboard</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  pollStatus === "polling"
                    ? "#facc15"
                    : pollStatus === "success"
                      ? "#00ff88"
                      : pollStatus === "error"
                        ? "#ef4444"
                        : "#555",
                transition: "background 0.3s",
              }}
            />
            <span style={{ fontSize: 12, opacity: 0.5 }}>
              {pollStatus === "polling"
                ? "Checking Gmail..."
                : lastPoll
                  ? `Last check: ${lastPoll}`
                  : "Gmail polling active"}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>Total Raised</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#00ff88" }}>
              ${total.toFixed(2)}
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>Donations</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{donations.length}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>Goal</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {goal.active ? `${Math.round(progress)}%` : "Off"}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 20,
            background: "#111",
            borderRadius: 12,
            padding: 3,
            border: "1px solid #222",
          }}
        >
          {(
            [
              ["goal", "Goal"],
              ["donations", "Donations"],
              ["theme", "Overlay Theme"],
              ["audio", "Audio"],
              ["soundbites", "Soundbites"],
              ["movie", "Movie Counter"],
              ["roulette", "Roulette"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                ...buttonStyle,
                flex: 1,
                borderRadius: 10,
                background: activeTab === key ? "#222" : "transparent",
                color: activeTab === key ? "#fff" : "rgba(255,255,255,0.4)",
                padding: "10px 0",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Goal tab */}
        {activeTab === "goal" && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Donation Goal</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, display: "block" }}>
                  Goal label
                </label>
                <input
                  type="text"
                  placeholder='e.g. "New mic"'
                  value={goalLabel}
                  onChange={(e) => setGoalLabel(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, display: "block" }}>
                  Target amount ($)
                </label>
                <input
                  type="number"
                  placeholder="500"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={goalActive}
                  onChange={(e) => setGoalActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "#00ff88" }}
                />
                Show goal on overlay
              </label>
              <button
                onClick={saveGoal}
                style={{
                  ...buttonStyle,
                  background: "#00ff88",
                  color: "#000",
                  width: "100%",
                }}
              >
                Save Goal
              </button>
            </div>
          </div>
        )}

        {/* Donations tab */}
        {activeTab === "donations" && (
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                Donations ({donations.length})
              </h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    await fetch("/api/donations/test", { method: "POST" });
                    triggerPoll();
                  }}
                  style={{
                    ...buttonStyle,
                    background: "#1a1a4e",
                    color: "#818cf8",
                    fontSize: 13,
                    padding: "8px 14px",
                  }}
                >
                  Test Donation
                </button>
                <button
                  onClick={triggerPoll}
                  disabled={pollStatus === "polling"}
                  style={{
                    ...buttonStyle,
                    background: "#222",
                    color: "#fff",
                    opacity: pollStatus === "polling" ? 0.5 : 1,
                    fontSize: 13,
                    padding: "8px 14px",
                  }}
                >
                  {pollStatus === "polling" ? "Checking..." : "Check Now"}
                </button>
                <button
                  onClick={clearAll}
                  style={{
                    ...buttonStyle,
                    background: "#331111",
                    color: "#ef4444",
                    fontSize: 13,
                    padding: "8px 14px",
                  }}
                >
                  Clear All
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {donations.length === 0 && (
                <div style={{ textAlign: "center", padding: 32, opacity: 0.3, fontSize: 14 }}>
                  No donations yet
                </div>
              )}
              {[...donations].reverse().map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "#1a1a1a",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background:
                        d.source === "venmo"
                          ? "linear-gradient(135deg, #008cff, #0060b9)"
                          : "linear-gradient(135deg, #6d1ed4, #4a0e9e)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {d.source === "venmo" ? "V" : "Z"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                    {d.message && (
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {d.message}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      color: "#00ff88",
                      flexShrink: 0,
                    }}
                  >
                    ${d.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Theme tab */}
        {activeTab === "theme" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Preset themes */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Presets</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(PRESETS).map(([name, preset]) => (
                  <button
                    key={name}
                    onClick={() => applyPreset(name)}
                    style={{
                      ...buttonStyle,
                      background: preset.barBgColor,
                      color: preset.textColor,
                      border:
                        theme.preset === name
                          ? `2px solid ${preset.barColor}`
                          : "2px solid transparent",
                      borderRadius: 12,
                      padding: "12px 16px",
                      textAlign: "left" as const,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: `linear-gradient(135deg, ${preset.barColor}, ${preset.accentColor})`,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ textTransform: "capitalize" as const }}>{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom colors */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Custom Colors</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(
                  [
                    ["barColor", "Bar Fill"],
                    ["barBgColor", "Bar Background"],
                    ["textColor", "Text"],
                    ["accentColor", "Accent"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <label
                      style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, display: "block" }}
                    >
                      {label}
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="color"
                        value={theme[key]}
                        onChange={(e) =>
                          saveTheme({ ...theme, preset: "custom", [key]: e.target.value })
                        }
                        style={{
                          width: 36,
                          height: 36,
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          padding: 0,
                          background: "transparent",
                        }}
                      />
                      <span style={{ fontSize: 12, fontFamily: "monospace", opacity: 0.6 }}>
                        {theme[key]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Font, bar style, alert style */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Style Options</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label
                    style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, display: "block" }}
                  >
                    Font
                  </label>
                  <select
                    value={theme.fontFamily}
                    onChange={(e) =>
                      saveTheme({ ...theme, preset: "custom", fontFamily: e.target.value })
                    }
                    style={{
                      ...inputStyle,
                      appearance: "auto" as const,
                    }}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{ fontSize: 12, opacity: 0.5, marginBottom: 6, display: "block" }}
                  >
                    Bar Style
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {BAR_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          saveTheme({ ...theme, preset: "custom", barStyle: s })
                        }
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          background: theme.barStyle === s ? "#333" : "#1a1a1a",
                          color: theme.barStyle === s ? "#fff" : "rgba(255,255,255,0.4)",
                          fontSize: 13,
                          padding: "8px 0",
                          textTransform: "capitalize" as const,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    style={{ fontSize: 12, opacity: 0.5, marginBottom: 6, display: "block" }}
                  >
                    Alert Animation
                  </label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ALERT_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() =>
                          saveTheme({ ...theme, preset: "custom", alertStyle: s })
                        }
                        style={{
                          ...buttonStyle,
                          flex: 1,
                          minWidth: "calc(50% - 4px)",
                          background: theme.alertStyle === s ? "#333" : "#1a1a1a",
                          color: theme.alertStyle === s ? "#fff" : "rgba(255,255,255,0.4)",
                          fontSize: 13,
                          padding: "8px 0",
                          textTransform: "capitalize" as const,
                        }}
                      >
                        {s.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                Overlay Preview
              </h2>
              <div
                style={{
                  background: "#000",
                  borderRadius: 12,
                  padding: 24,
                  position: "relative",
                  minHeight: 200,
                  fontFamily: `${theme.fontFamily}, sans-serif`,
                  overflow: "hidden",
                }}
              >
                {/* Preview alert */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${theme.barBgColor}ee, ${theme.barBgColor}cc)`,
                      border: `2px solid ${theme.accentColor}`,
                      borderRadius: 12,
                      padding: "14px 28px",
                      textAlign: "center",
                      boxShadow: `0 0 20px ${theme.accentColor}44`,
                      minWidth: 200,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: theme.accentColor,
                        textTransform: "uppercase",
                        letterSpacing: 2,
                        marginBottom: 2,
                      }}
                    >
                      Venmo Donation
                    </div>
                    <div
                      style={{ fontSize: 14, fontWeight: 700, color: theme.textColor }}
                    >
                      Sample Donor
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: theme.barColor,
                        textShadow: `0 0 12px ${theme.barColor}66`,
                        lineHeight: 1.1,
                      }}
                    >
                      $25.00
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: theme.textColor,
                        opacity: 0.7,
                        marginTop: 4,
                        fontStyle: "italic",
                      }}
                    >
                      &ldquo;Great stream!&rdquo;
                    </div>
                  </div>
                </div>

                {/* Preview bar */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      fontWeight: 700,
                      color: theme.textColor,
                      marginBottom: 4,
                      textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    }}
                  >
                    <span>{goal.active ? goal.label || "Goal" : "Sample Goal"}</span>
                    <span>$65 / $100</span>
                  </div>
                  <div
                    style={{
                      height: 20,
                      background: theme.barBgColor,
                      borderRadius: barRadius,
                      overflow: "hidden",
                      border: `1px solid ${theme.barColor}33`,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: "65%",
                        background: barFill,
                        borderRadius: barRadius,
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: barRadius,
                          background:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 2s infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Movie Counter tab */}
        {activeTab === "movie" && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24 }}>Movie Watch Counter</h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 900,
                  color: "#00ff88",
                  lineHeight: 1,
                }}
              >
                {movieCount}
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => updateMovieCount(movieCount + 1)}
                  style={{
                    ...buttonStyle,
                    background: "#00ff88",
                    color: "#000",
                    fontSize: 18,
                    fontWeight: 800,
                    padding: "14px 32px",
                  }}
                >
                  +1
                </button>
                <button
                  onClick={() => updateMovieCount(0)}
                  style={{
                    ...buttonStyle,
                    background: "#331111",
                    color: "#ef4444",
                    padding: "14px 24px",
                  }}
                >
                  Reset
                </button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.4, textAlign: "center" }}>
                OBS Browser Source: /movie-overlay
              </div>
            </div>
          </div>
        )}

        {/* Audio tab */}
        {activeTab === "audio" && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Donation Sound Settings
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Enable/Disable */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={audio.enabled}
                  onChange={(e) =>
                    saveAudio({ ...audio, enabled: e.target.checked })
                  }
                  style={{ width: 18, height: 18, accentColor: "#00ff88" }}
                />
                Enable donation sound
              </label>

              {/* Volume slider */}
              <div>
                <label
                  style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, display: "block" }}
                >
                  Volume: {Math.round(audio.volume * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audio.volume}
                  onChange={(e) =>
                    saveAudio({ ...audio, volume: parseFloat(e.target.value) })
                  }
                  style={{
                    width: "100%",
                    height: 8,
                    borderRadius: 4,
                    accentColor: "#00ff88",
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Sound file dropdown */}
              <div>
                <label
                  style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, display: "block" }}
                >
                  Sound File
                </label>
                {availableAudioFiles.length > 0 ? (
                  <select
                    value={audio.soundFile}
                    onChange={(e) =>
                      saveAudio({ ...audio, soundFile: e.target.value })
                    }
                    style={{
                      ...inputStyle,
                      appearance: "auto" as const,
                    }}
                  >
                    {availableAudioFiles.map((file) => (
                      <option key={file} value={file}>
                        {file}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ ...inputStyle, opacity: 0.5 }}>
                    No MP3 files found in /public folder
                  </div>
                )}
                <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
                  Place MP3 files in /public folder to see them here
                </div>
              </div>

              {/* Test button */}
              <button
                onClick={testSound}
                style={{
                  ...buttonStyle,
                  background: "#222",
                  color: "#fff",
                  width: "100%",
                }}
              >
                Test Sound
              </button>
            </div>
          </div>
        )}

        {/* Soundbites tab */}
        {activeTab === "soundbites" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Upload Section */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                Upload Soundbite
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={handleSoundbiteUpload}
                  disabled={uploadStatus === "uploading"}
                  style={{ display: "none" }}
                  id="soundbite-upload"
                />
                <label
                  htmlFor="soundbite-upload"
                  style={{
                    ...buttonStyle,
                    background: uploadStatus === "uploading" ? "#222" : "#00ff88",
                    color: uploadStatus === "uploading" ? "#999" : "#000",
                    cursor: uploadStatus === "uploading" ? "not-allowed" : "pointer",
                    display: "block",
                    textAlign: "center",
                    opacity: uploadStatus === "uploading" ? 0.5 : 1,
                  }}
                >
                  {uploadStatus === "uploading" ? "Uploading..." : "Upload New Soundbite"}
                </label>
                {uploadMessage && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: uploadStatus === "success" ? "#002211" : "#221111",
                      color: uploadStatus === "success" ? "#00ff88" : "#ef4444",
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    {uploadMessage}
                  </div>
                )}
                <div style={{ fontSize: 11, opacity: 0.4 }}>
                  Upload MP3 files (max 10MB). Sounds play on the overlay when you click the buttons below.
                </div>
              </div>
            </div>

            {/* Soundbite Grid */}
            {soundbites.configs.filter((c) => c.enabled).length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                  Soundbite Board
                </h2>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 12,
                  }}
                >
                  {soundbites.configs
                    .filter((c) => c.enabled)
                    .slice(0, 9)
                    .map((config) => (
                      <button
                        key={config.filename}
                        onClick={() => playSoundbite(config.filename)}
                        style={{
                          ...buttonStyle,
                          background: "#222",
                          color: "#fff",
                          padding: "24px 16px",
                          fontSize: 14,
                          fontWeight: 700,
                          borderRadius: 12,
                          border: "1px solid #333",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#2a2a2a";
                          e.currentTarget.style.borderColor = "#00ff88";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#222";
                          e.currentTarget.style.borderColor = "#333";
                        }}
                      >
                        {config.label}
                      </button>
                    ))}
                </div>
                <div style={{ fontSize: 11, opacity: 0.4, marginTop: 12 }}>
                  Sounds play on the overlay within 10 seconds. Use the same volume as donation sounds.
                </div>
              </div>
            )}

            {/* Configuration Section */}
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                  Configure Soundbites ({soundbites.configs.length})
                </h2>
                <button
                  onClick={saveSoundbites}
                  style={{
                    ...buttonStyle,
                    background: "#00ff88",
                    color: "#000",
                    fontSize: 13,
                    padding: "8px 16px",
                  }}
                >
                  Save Changes
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {soundbites.configs.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 32,
                      opacity: 0.3,
                      fontSize: 14,
                    }}
                  >
                    No soundbites yet. Upload an MP3 file to get started.
                  </div>
                )}
                {soundbites.configs.map((config) => (
                  <div
                    key={config.filename}
                    style={{
                      padding: "14px 16px",
                      background: "#1a1a1a",
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {/* Top row: checkbox, label, filename, delete */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={() => toggleSoundbiteEnabled(config.filename)}
                        style={{ width: 18, height: 18, accentColor: "#00ff88", flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        value={config.label}
                        onChange={(e) => updateSoundbiteLabel(config.filename, e.target.value)}
                        placeholder="Button label"
                        style={{
                          ...inputStyle,
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: 13,
                        }}
                      />
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.4,
                          fontFamily: "monospace",
                          flexShrink: 0,
                          minWidth: 120,
                        }}
                      >
                        {config.filename}
                      </div>
                      <button
                        onClick={() => deleteSoundbite(config.filename)}
                        style={{
                          ...buttonStyle,
                          background: "#331111",
                          color: "#ef4444",
                          fontSize: 12,
                          padding: "6px 12px",
                          flexShrink: 0,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                    {/* Bottom row: volume slider */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 28 }}>
                      <label
                        style={{
                          fontSize: 11,
                          opacity: 0.5,
                          minWidth: 80,
                        }}
                      >
                        Volume: {Math.round((config.volume ?? 1.0) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={config.volume ?? 1.0}
                        onChange={(e) => updateSoundbiteVolume(config.filename, parseFloat(e.target.value))}
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          accentColor: "#00ff88",
                          cursor: "pointer",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Roulette tab */}
        {activeTab === "roulette" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Status card */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Roulette Voting</h2>

              {/* Live counts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div
                  style={{
                    background: "#1f0a0a",
                    borderRadius: 14,
                    padding: "16px",
                    border: "1px solid #dc262633",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>🔴 Red</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#dc2626" }}>
                    {roulette.redVotes}
                  </div>
                </div>
                <div
                  style={{
                    background: "#111",
                    borderRadius: 14,
                    padding: "16px",
                    border: "1px solid #444",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>⚫ Black</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#aaa" }}>
                    {roulette.blackVotes}
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 20,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: roulette.active ? "#002211" : "#1a1a1a",
                  border: `1px solid ${roulette.active ? "#00ff8833" : "#333"}`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: roulette.active ? "#00ff88" : "#555",
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 600 }}>
                  {roulette.active ? "Voting is OPEN" : "Voting is CLOSED"}
                </span>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => rouletteAction("open")}
                  disabled={roulette.active}
                  style={{
                    ...buttonStyle,
                    background: roulette.active ? "#1a1a1a" : "#166534",
                    color: roulette.active ? "#555" : "#fff",
                    width: "100%",
                    cursor: roulette.active ? "not-allowed" : "pointer",
                  }}
                >
                  Open Voting
                </button>
                <button
                  onClick={() => rouletteAction("close")}
                  disabled={!roulette.active}
                  style={{
                    ...buttonStyle,
                    background: !roulette.active ? "#1a1a1a" : "#713f12",
                    color: !roulette.active ? "#555" : "#fff",
                    width: "100%",
                    cursor: !roulette.active ? "not-allowed" : "pointer",
                  }}
                >
                  Close Voting
                </button>
                <button
                  onClick={() => rouletteAction("reset")}
                  style={{
                    ...buttonStyle,
                    background: "#331111",
                    color: "#ef4444",
                    width: "100%",
                  }}
                >
                  Reset (clears all votes)
                </button>
              </div>
            </div>

            {/* Links */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, opacity: 0.7 }}>
                Links
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 13, opacity: 0.5 }}>Share with chat:</div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 14,
                    padding: "10px 14px",
                    background: "#1a1a1a",
                    borderRadius: 10,
                    color: "#00ff88",
                  }}
                >
                  donate.jackfahey.org/vote
                </div>
                <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>OBS Browser Source:</div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: 14,
                    padding: "10px 14px",
                    background: "#1a1a1a",
                    borderRadius: 10,
                    color: "#00ff88",
                  }}
                >
                  donate.jackfahey.org/roulette-overlay
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
