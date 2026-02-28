"use client";

import { useEffect, useState, useCallback } from "react";

type VoteState = "loading" | "closed" | "ready" | "voted" | "cooldown-expired";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function generateVoterId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const COOLDOWN_MS = 10 * 60 * 1000;

export default function VotePage() {
  const [voteState, setVoteState] = useState<VoteState>("loading");
  const [redVotes, setRedVotes] = useState(0);
  const [blackVotes, setBlackVotes] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [voterId, setVoterId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize voter ID and check local state on mount
  useEffect(() => {
    let id = localStorage.getItem("roulette_voter_id");
    if (!id) {
      id = generateVoterId();
      localStorage.setItem("roulette_voter_id", id);
    }
    setVoterId(id);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch("/api/roulette");
      const data = await res.json();
      setRedVotes(data.redVotes);
      setBlackVotes(data.blackVotes);

      if (!data.active) {
        setVoteState("closed");
        return;
      }

      // Check local cooldown
      const storedSessionId = localStorage.getItem("roulette_session_id");
      const storedVoteTime = localStorage.getItem("roulette_vote_time");

      if (storedSessionId === data.sessionId && storedVoteTime) {
        const elapsed = Date.now() - parseInt(storedVoteTime, 10);
        if (elapsed < COOLDOWN_MS) {
          setRemainingMs(COOLDOWN_MS - elapsed);
          setVoteState("voted");
          return;
        }
      }

      // Session changed (reset happened) or cooldown expired
      setVoteState("ready");
    } catch {
      // Network error — keep current state
    }
  }, []);

  // Poll every 3s
  useEffect(() => {
    if (!voterId) return;
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState, voterId]);

  // Countdown timer tick
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
        setRedVotes(data.redVotes);
        setBlackVotes(data.blackVotes);
        localStorage.setItem("roulette_vote_time", String(Date.now()));
        localStorage.setItem("roulette_session_id", data.sessionId);
        setRemainingMs(COOLDOWN_MS);
        setVoteState("voted");
      } else if (data.reason === "cooldown") {
        setRemainingMs(data.remainingMs);
        setVoteState("voted");
      } else if (data.reason === "closed") {
        setVoteState("closed");
      }
    } catch {
      // ignore network errors
    } finally {
      setSubmitting(false);
    }
  };

  const total = redVotes + blackVotes;
  const redPct = total > 0 ? (redVotes / total) * 100 : 50;
  const blackPct = total > 0 ? (blackVotes / total) * 100 : 50;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
      `}</style>

      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>
            🎡 Roulette Vote
          </h1>
          <p style={{ fontSize: 14, opacity: 0.4, marginTop: 6 }}>
            Jack Fahey Stream
          </p>
        </div>

        {/* Loading */}
        {voteState === "loading" && (
          <div style={{ opacity: 0.4, fontSize: 16, animation: "pulse 1.5s infinite" }}>
            Loading...
          </div>
        )}

        {/* Closed */}
        {voteState === "closed" && (
          <div
            style={{
              background: "#111",
              borderRadius: 20,
              padding: "40px 24px",
              border: "1px solid #222",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Voting isn&apos;t open yet
            </h2>
            <p style={{ fontSize: 14, opacity: 0.5, lineHeight: 1.5 }}>
              Keep an eye on the stream!
            </p>
          </div>
        )}

        {/* Ready to vote */}
        {(voteState === "ready" || voteState === "cooldown-expired") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 14, opacity: 0.5 }}>
              {voteState === "cooldown-expired" ? "Your cooldown is up — vote again!" : "Pick your color:"}
            </p>

            {/* Red button */}
            <button
              onClick={() => castVote("red")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "32px 24px",
                borderRadius: 20,
                border: "none",
                background: "#dc2626",
                color: "#fff",
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                transition: "transform 0.1s, opacity 0.15s",
                boxShadow: "0 4px 24px rgba(220,38,38,0.4)",
                letterSpacing: 1,
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              🔴 RED
            </button>

            {/* Black button */}
            <button
              onClick={() => castVote("black")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "32px 24px",
                borderRadius: 20,
                border: "2px solid #444",
                background: "#1c1c1c",
                color: "#fff",
                fontSize: 28,
                fontWeight: 900,
                fontFamily: "inherit",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                transition: "transform 0.1s, opacity 0.15s",
                boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
                letterSpacing: 1,
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              ⚫ BLACK
            </button>

            <p style={{ fontSize: 12, opacity: 0.3, marginTop: 4 }}>
              You can vote once every 10 minutes.
            </p>
          </div>
        )}

        {/* Voted / in cooldown */}
        {voteState === "voted" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                background: "#111",
                borderRadius: 20,
                padding: "24px 20px",
                border: "1px solid #222",
              }}
            >
              <p style={{ fontSize: 13, opacity: 0.5, marginBottom: 16 }}>Live results</p>

              {/* Vote counts */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "#1f0a0a",
                    borderRadius: 14,
                    padding: "16px 12px",
                    border: "1px solid #dc262633",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>🔴 Red</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#dc2626" }}>
                    {redVotes}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>{redPct.toFixed(0)}%</div>
                </div>
                <div
                  style={{
                    background: "#111",
                    borderRadius: 14,
                    padding: "16px 12px",
                    border: "1px solid #444",
                  }}
                >
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>⚫ Black</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#aaa" }}>
                    {blackVotes}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>{blackPct.toFixed(0)}%</div>
                </div>
              </div>

              {/* Split bar */}
              <div
                style={{
                  height: 12,
                  borderRadius: 9999,
                  overflow: "hidden",
                  background: "#1c1c1c",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${redPct}%`,
                    background: "#dc2626",
                    transition: "width 0.5s ease",
                  }}
                />
                <div
                  style={{
                    width: `${blackPct}%`,
                    background: "#444",
                    transition: "width 0.5s ease",
                  }}
                />
              </div>

              {/* Countdown */}
              {remainingMs > 0 && (
                <p style={{ fontSize: 13, opacity: 0.5, marginTop: 14 }}>
                  You can vote again in{" "}
                  <span style={{ color: "#facc15", fontWeight: 700 }}>
                    {formatCountdown(remainingMs)}
                  </span>
                </p>
              )}
            </div>

            {/* Donation nudge */}
            <div
              style={{
                background: "#0d1f0d",
                borderRadius: 16,
                padding: "20px",
                border: "1px solid #00ff8833",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                Enjoying the stream?
              </p>
              <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 14 }}>
                Support Jack with a donation!
              </p>
              <a
                href="/"
                style={{
                  display: "inline-block",
                  padding: "12px 28px",
                  borderRadius: 12,
                  background: "#00ff88",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                Donate 💚
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
