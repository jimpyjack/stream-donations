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

interface RouletteData {
  active: boolean;
  redVotes: number;
  blackVotes: number;
  sessionId: string;
}

type Tab = "recent" | "top";
type VoteState = "hidden" | "ready" | "voted" | "cooldown-expired";

const COOLDOWN_MS = 10 * 60 * 1000;

function generateVoterId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function DonatePage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [goal, setGoal] = useState<Goal>({ label: "", target: 0, active: false });
  const [tab, setTab] = useState<Tab>("recent");

  // Roulette state
  const [roulette, setRoulette] = useState<RouletteData>({ active: false, redVotes: 0, blackVotes: 0, sessionId: "" });
  const [voteState, setVoteState] = useState<VoteState>("hidden");
  const [remainingMs, setRemainingMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [voterId, setVoterId] = useState("");

  useEffect(() => {
    let id = localStorage.getItem("roulette_voter_id");
    if (!id) {
      id = generateVoterId();
      localStorage.setItem("roulette_voter_id", id);
    }
    setVoterId(id);
  }, []);

  const fetchRoulette = useCallback(async () => {
    try {
      const res = await fetch("/api/roulette");
      const data: RouletteData = await res.json();
      setRoulette(data);

      if (!data.active) {
        setVoteState("hidden");
        return;
      }

      const storedSession = localStorage.getItem("roulette_session_id");
      const storedTime = localStorage.getItem("roulette_vote_time");

      if (storedSession === data.sessionId && storedTime) {
        const elapsed = Date.now() - parseInt(storedTime, 10);
        if (elapsed < COOLDOWN_MS) {
          setRemainingMs(COOLDOWN_MS - elapsed);
          setVoteState("voted");
          return;
        }
      }

      setVoteState((prev) => prev === "voted" ? "cooldown-expired" : "ready");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [donRes, goalRes] = await Promise.all([
          fetch("/api/donations"),
          fetch("/api/goal"),
        ]);
        const donData = await donRes.json();
        const goalData = await goalRes.json();
        setDonations(donData.donations || []);
        setGoal(goalData);
      } catch {
        // retry next cycle
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!voterId) return;
    fetchRoulette();
    const interval = setInterval(fetchRoulette, 3000);
    return () => clearInterval(interval);
  }, [fetchRoulette, voterId]);

  // Countdown tick
  useEffect(() => {
    if (voteState !== "voted") return;
    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          setVoteState("cooldown-expired");
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [voteState]);

  const castVote = async (choice: "red" | "black") => {
    if (submitting || !voterId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/roulette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voterId, choice }),
      });
      const data = await res.json();
      if (data.success) {
        setRoulette((prev) => ({ ...prev, redVotes: data.redVotes, blackVotes: data.blackVotes }));
        localStorage.setItem("roulette_vote_time", String(Date.now()));
        localStorage.setItem("roulette_session_id", data.sessionId);
        setRemainingMs(COOLDOWN_MS);
        setVoteState("voted");
      } else if (data.reason === "cooldown") {
        setRemainingMs(data.remainingMs);
        setVoteState("voted");
      } else if (data.reason === "closed") {
        setVoteState("hidden");
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const total = donations.reduce((sum, d) => sum + d.amount, 0);
  const progress = goal.active && goal.target > 0 ? Math.min((total / goal.target) * 100, 100) : 0;

  const sortedDonations =
    tab === "recent"
      ? [...donations].reverse()
      : [...donations].sort((a, b) => b.amount - a.amount);

  // Aggregate top donors
  const topDonors =
    tab === "top"
      ? Object.values(
          donations.reduce(
            (acc, d) => {
              const key = d.name.toLowerCase();
              if (!acc[key]) {
                acc[key] = { name: d.name, total: 0, count: 0 };
              }
              acc[key].total += d.amount;
              acc[key].count += 1;
              return acc;
            },
            {} as Record<string, { name: string; total: number; count: number }>
          )
        ).sort((a, b) => b.total - a.total)
      : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 16px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            Support JimpyJack&apos;s Stream
          </h1>
          <p style={{ opacity: 0.6, fontSize: 14 }}>
            Donations appear live on stream!
          </p>
        </div>

        {/* Goal progress */}
        {goal.active && goal.target > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <span>{goal.label}</span>
              <span style={{ color: "#00ff88" }}>
                ${total.toFixed(2)} / ${goal.target.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                height: 24,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 9999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #00ff88, #00cc6a)",
                  borderRadius: 9999,
                  transition: "width 1s ease",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 9999,
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s infinite",
                  }}
                />
              </div>
            </div>
            {progress >= 100 && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#00ff88",
                }}
              >
                Goal reached!
              </p>
            )}
          </div>
        )}

        {/* Donate buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <a
            href="https://venmo.com/jackfahey"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "16px 12px",
              background: "linear-gradient(135deg, #008cff 0%, #0060b9 100%)",
              borderRadius: 14,
              textDecoration: "none",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            <span style={{ fontSize: 22 }}>V</span>
            <span>Venmo</span>
            <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>
              @jackfahey
            </span>
          </a>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "16px 12px",
              background: "linear-gradient(135deg, #6d1ed4 0%, #4a0e9e 100%)",
              borderRadius: 14,
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span style={{ fontSize: 22 }}>Z</span>
            <span>Zelle</span>
            <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>
              (949) 290-0196
            </span>
            <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>
              Send via your bank app
            </span>
          </div>
        </div>

        {/* Venmo handle callout */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            padding: "12px 16px",
            background: "rgba(0,140,255,0.12)",
            borderRadius: 12,
            border: "1px solid rgba(0,140,255,0.25)",
          }}
        >
          <span style={{ fontSize: 13, opacity: 0.7 }}>Venmo: </span>
          <span style={{ fontWeight: 700, color: "#4fa8ff" }}>@jackfahey</span>
          <span style={{ fontSize: 13, opacity: 0.4, margin: "0 8px" }}>|</span>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Zelle: </span>
          <span style={{ fontWeight: 700, color: "#b78aff" }}>(949) 290-0196</span>
        </div>

        {/* Roulette voting — only shown when active */}
        {voteState !== "hidden" && (() => {
          const total = roulette.redVotes + roulette.blackVotes;
          const redPct = total > 0 ? (roulette.redVotes / total) * 100 : 50;
          const blackPct = total > 0 ? (roulette.blackVotes / total) * 100 : 50;
          return (
            <div
              style={{
                marginBottom: 24,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 20,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, opacity: 0.7, textAlign: "center", letterSpacing: 1, textTransform: "uppercase" }}>
                🎡 Roulette Vote
              </div>

              {(voteState === "ready" || voteState === "cooldown-expired") && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {voteState === "cooldown-expired" && (
                    <p style={{ fontSize: 12, opacity: 0.5, textAlign: "center", marginBottom: 2 }}>
                      Cooldown over — vote again!
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => castVote("red")}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: "18px 0",
                        borderRadius: 14,
                        border: "none",
                        background: "#dc2626",
                        color: "#fff",
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: "inherit",
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.6 : 1,
                        boxShadow: "0 4px 16px rgba(220,38,38,0.35)",
                      }}
                    >
                      🔴 RED
                    </button>
                    <button
                      onClick={() => castVote("black")}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: "18px 0",
                        borderRadius: 14,
                        border: "1px solid #444",
                        background: "#1c1c1c",
                        color: "#fff",
                        fontSize: 20,
                        fontWeight: 900,
                        fontFamily: "inherit",
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      ⚫ BLACK
                    </button>
                  </div>
                  <p style={{ fontSize: 11, opacity: 0.3, textAlign: "center" }}>
                    Once per 10 minutes
                  </p>
                </div>
              )}

              {voteState === "voted" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ textAlign: "center", background: "rgba(220,38,38,0.12)", borderRadius: 10, padding: "12px 8px", border: "1px solid rgba(220,38,38,0.2)" }}>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>🔴 Red</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#ef4444" }}>{roulette.redVotes}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{redPct.toFixed(0)}%</div>
                    </div>
                    <div style={{ textAlign: "center", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 8px", border: "1px solid #333" }}>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>⚫ Black</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: "#aaa" }}>{roulette.blackVotes}</div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>{blackPct.toFixed(0)}%</div>
                    </div>
                  </div>
                  <div style={{ height: 10, borderRadius: 9999, overflow: "hidden", display: "flex", marginBottom: 10 }}>
                    <div style={{ width: `${redPct}%`, background: "#dc2626", transition: "width 0.5s ease" }} />
                    <div style={{ width: `${blackPct}%`, background: "#444", transition: "width 0.5s ease" }} />
                  </div>
                  {remainingMs > 0 && (
                    <p style={{ fontSize: 12, opacity: 0.4, textAlign: "center" }}>
                      Vote again in <span style={{ color: "#facc15", fontWeight: 700 }}>{formatCountdown(remainingMs)}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* Leaderboard tabs */}
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 16,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: 3,
          }}
        >
          {(["recent", "top"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "inherit",
                transition: "all 0.2s",
                background: tab === t ? "rgba(255,255,255,0.12)" : "transparent",
                color: tab === t ? "#fff" : "rgba(255,255,255,0.5)",
              }}
            >
              {t === "recent" ? "Recent" : "Top Donors"}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {donations.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 40,
                opacity: 0.4,
                fontSize: 14,
              }}
            >
              No donations yet — be the first!
            </div>
          )}

          {tab === "recent" &&
            sortedDonations.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      d.source === "venmo"
                        ? "linear-gradient(135deg, #008cff, #0060b9)"
                        : "linear-gradient(135deg, #6d1ed4, #4a0e9e)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {d.source === "venmo" ? "V" : "Z"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                  {d.message && (
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.5,
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
                    fontSize: 16,
                    color: "#00ff88",
                    flexShrink: 0,
                  }}
                >
                  ${d.amount.toFixed(2)}
                </div>
              </div>
            ))}

          {tab === "top" &&
            topDonors.map((donor, i) => (
              <div
                key={donor.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background:
                    i === 0
                      ? "rgba(255,215,0,0.08)"
                      : i === 1
                        ? "rgba(192,192,192,0.06)"
                        : i === 2
                          ? "rgba(205,127,50,0.06)"
                          : "rgba(255,255,255,0.05)",
                  borderRadius: 12,
                  border:
                    i === 0
                      ? "1px solid rgba(255,215,0,0.2)"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      i === 0
                        ? "linear-gradient(135deg, #ffd700, #ffaa00)"
                        : i === 1
                          ? "linear-gradient(135deg, #c0c0c0, #909090)"
                          : i === 2
                            ? "linear-gradient(135deg, #cd7f32, #a0622e)"
                            : "rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    color: i < 3 ? "#000" : "#fff",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{donor.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>
                    {donor.count} donation{donor.count !== 1 ? "s" : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    color: "#00ff88",
                    flexShrink: 0,
                  }}
                >
                  ${donor.total.toFixed(2)}
                </div>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            fontSize: 12,
            opacity: 0.3,
          }}
        >
          Donations refresh every 10s
        </div>
      </div>
    </div>
  );
}
