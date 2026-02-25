"use client";

import { useEffect, useState } from "react";

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

type Tab = "recent" | "top";

export default function DonatePage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [goal, setGoal] = useState<Goal>({ label: "", target: 0, active: false });
  const [tab, setTab] = useState<Tab>("recent");

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
            Support the Stream
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
