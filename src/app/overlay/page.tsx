"use client";

import { useEffect, useState, useCallback, useRef } from "react";

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

interface SoundbiteTrigger {
  id: string;
  filename: string;
  timestamp: number;
  volume: number;
}

interface SoundbitesState {
  configs: Array<{
    filename: string;
    label: string;
    enabled: boolean;
    volume: number;
  }>;
  pendingTrigger: SoundbiteTrigger | null;
}

interface AlertItem {
  donation: Donation;
  key: string;
}

export default function OverlayPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [goal, setGoal] = useState<Goal>({ label: "", target: 0, active: false });
  const [theme, setTheme] = useState<Theme>({
    preset: "neon",
    barColor: "#00ff88",
    barBgColor: "#1a1a2e",
    textColor: "#ffffff",
    accentColor: "#ff6b6b",
    fontFamily: "Inter",
    alertStyle: "slide-up",
    barStyle: "rounded",
  });
  const [audio, setAudio] = useState<AudioSettings>({
    enabled: true,
    volume: 0.7,
    soundFile: "donation-chime.mp3",
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundbiteAudioRef = useRef<HTMLAudioElement | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const seenSoundbiteTriggerIds = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const [pollRes, themeRes, goalRes, audioRes, soundbitesRes] = await Promise.all([
        fetch("/api/poll"),
        fetch("/api/theme"),
        fetch("/api/goal"),
        fetch("/api/audio"),
        fetch("/api/soundbites"),
      ]);
      const pollData = await pollRes.json();
      const themeData = await themeRes.json();
      const goalData = await goalRes.json();
      const audioData = await audioRes.json();
      const soundbitesData: SoundbitesState = await soundbitesRes.json();

      setDonations(pollData.donations || []);
      setTheme(themeData);
      setGoal(goalData);
      setAudio(audioData);

      // On initial load, just register all existing IDs without alerting or playing
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        for (const d of pollData.donations || []) {
          seenIdsRef.current.add(d.id);
        }
        // Also mark any existing soundbite trigger as seen without playing
        if (soundbitesData.pendingTrigger) {
          seenSoundbiteTriggerIds.current.add(soundbitesData.pendingTrigger.id);
        }
        return;
      }

      // Check for new soundbite triggers (only after initial load)
      if (
        soundbitesData.pendingTrigger &&
        !seenSoundbiteTriggerIds.current.has(soundbitesData.pendingTrigger.id)
      ) {
        seenSoundbiteTriggerIds.current.add(soundbitesData.pendingTrigger.id);

        // Play the soundbite with combined volume (global * individual)
        if (soundbiteAudioRef.current) {
          soundbiteAudioRef.current.src = `/soundbites/${soundbitesData.pendingTrigger.filename}`;
          const individualVolume = soundbitesData.pendingTrigger.volume ?? 1.0;
          soundbiteAudioRef.current.volume = audioData.volume * individualVolume;
          soundbiteAudioRef.current.play().catch(() => {
            // silently fail if audio playback blocked
          });
        }
      }

      // Show alerts for new donations
      const newAlerts: AlertItem[] = [];
      for (const d of pollData.donations || []) {
        if (!seenIdsRef.current.has(d.id)) {
          seenIdsRef.current.add(d.id);
          newAlerts.push({ donation: d, key: `${d.id}-${Date.now()}` });
        }
      }
      if (newAlerts.length > 0) {
        setAlerts((prev) => [...prev, ...newAlerts]);
        // Play audio if enabled
        if (audioData.enabled && audioRef.current) {
          audioRef.current.volume = audioData.volume;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {
            // silently fail if audio playback blocked
          });
        }
        // Remove alerts after 6 seconds
        setTimeout(() => {
          setAlerts((prev) =>
            prev.filter((a) => !newAlerts.some((n) => n.key === a.key))
          );
        }, 6000);
      }
    } catch {
      // silently fail - will retry on next poll
    }
  }, []);

  // Make body transparent for Streamlabs Browser Source
  useEffect(() => {
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [poll]);

  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  const progress = goal.active && goal.target > 0 ? Math.min((total / goal.target) * 100, 100) : 0;

  const barRadius = theme.barStyle === "rounded" ? "9999px" : theme.barStyle === "flat" ? "0" : "9999px";
  const barFill =
    theme.barStyle === "gradient"
      ? `linear-gradient(90deg, ${theme.barColor}, ${theme.accentColor})`
      : theme.barColor;

  const animationClass = {
    "slide-up": "animate-slide-up",
    "slide-right": "animate-slide-right",
    "fade-in": "animate-fade-in",
    bounce: "animate-bounce-in",
  }[theme.alertStyle];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        fontFamily: `${theme.fontFamily}, sans-serif`,
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Roboto+Mono:wght@400;700&family=Press+Start+2P&display=swap');

        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideRight {
          from { transform: translateX(-200px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-right { animation: slideRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        .animate-bounce-in { animation: bounceIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

        .alert-exit { animation: fadeOut 0.5s ease-in forwards; }

        .bar-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Goal progress bar — bottom of screen */}
      {goal.active && goal.target > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            maxWidth: 700,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 18,
              fontWeight: 700,
              color: theme.textColor,
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
            }}
          >
            <span>{goal.label}</span>
            <span>
              ${total.toFixed(2)} / ${goal.target.toFixed(2)}
            </span>
          </div>
          <div
            style={{
              height: 32,
              background: theme.barBgColor,
              borderRadius: barRadius,
              overflow: "hidden",
              border: `2px solid ${theme.barColor}33`,
              boxShadow: `0 0 20px ${theme.barColor}44`,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: barFill,
                borderRadius: barRadius,
                transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
              }}
            >
              <div
                className="bar-shimmer"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: barRadius,
                }}
              />
            </div>
          </div>
          {progress >= 100 && (
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 16,
                fontWeight: 700,
                color: theme.accentColor,
                textShadow: "0 0 10px currentColor",
                animation: "pulse 1.5s infinite",
              }}
            >
              GOAL REACHED!
            </div>
          )}
        </div>
      )}

      {/* Donation alerts — center of screen */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {alerts.map((alert) => (
          <div
            key={alert.key}
            className={animationClass}
            style={{
              background: `linear-gradient(135deg, ${theme.barBgColor}ee, ${theme.barBgColor}cc)`,
              border: `2px solid ${theme.accentColor}`,
              borderRadius: 16,
              padding: "20px 40px",
              textAlign: "center",
              boxShadow: `0 0 30px ${theme.accentColor}66, 0 8px 32px rgba(0,0,0,0.4)`,
              backdropFilter: "blur(10px)",
              minWidth: 300,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: theme.accentColor,
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              {alert.donation.source === "venmo" ? "Venmo" : "Zelle"} Donation
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: theme.textColor,
                marginBottom: 4,
              }}
            >
              {alert.donation.name}
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: theme.barColor,
                textShadow: `0 0 20px ${theme.barColor}88`,
                lineHeight: 1.1,
              }}
            >
              ${alert.donation.amount.toFixed(2)}
            </div>
            {alert.donation.message && (
              <div
                style={{
                  fontSize: 16,
                  color: theme.textColor,
                  opacity: 0.8,
                  marginTop: 8,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{alert.donation.message}&rdquo;
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Audio players */}
      <audio
        ref={audioRef}
        src={`/${audio.soundFile}`}
        preload="auto"
      />
      <audio ref={soundbiteAudioRef} preload="auto" />
    </div>
  );
}
