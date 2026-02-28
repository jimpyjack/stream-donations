"use client";

import { useEffect, useState } from "react";

interface RouletteData {
  active: boolean;
  redVotes: number;
  blackVotes: number;
}

interface Theme {
  textColor: string;
  fontFamily: string;
}

export default function RouletteOverlay() {
  const [data, setData] = useState<RouletteData>({ active: false, redVotes: 0, blackVotes: 0 });
  const [theme, setTheme] = useState<Theme>({ textColor: "#ffffff", fontFamily: "Inter" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rouletteRes, themeRes] = await Promise.all([
          fetch("/api/roulette"),
          fetch("/api/theme"),
        ]);
        const rouletteData = await rouletteRes.json();
        const themeData = await themeRes.json();
        setData(rouletteData);
        setTheme({ textColor: themeData.textColor, fontFamily: themeData.fontFamily });
      } catch {
        // retry next poll
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!data.active) return null;

  const total = data.redVotes + data.blackVotes;
  const redPct = total > 0 ? (data.redVotes / total) * 100 : 50;
  const blackPct = total > 0 ? (data.blackVotes / total) * 100 : 50;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        right: 20,
        fontFamily: `${theme.fontFamily}, Inter, system-ui, sans-serif`,
        color: theme.textColor,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Vote counts row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 18,
          fontWeight: 900,
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        <span style={{ color: "#ef4444" }}>🔴 Red: {data.redVotes}</span>
        <span style={{ opacity: 0.7 }}>
          {total} votes
        </span>
        <span style={{ color: "#aaaaaa" }}>⚫ Black: {data.blackVotes}</span>
      </div>

      {/* Split bar */}
      <div
        style={{
          height: 16,
          borderRadius: 9999,
          overflow: "hidden",
          display: "flex",
          boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            width: `${redPct}%`,
            background: "#dc2626",
            transition: "width 0.5s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 8,
          }}
        >
          {redPct > 15 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", opacity: 0.9 }}>
              {redPct.toFixed(0)}%
            </span>
          )}
        </div>
        <div
          style={{
            width: `${blackPct}%`,
            background: "#333",
            transition: "width 0.5s ease",
            display: "flex",
            alignItems: "center",
            paddingLeft: 8,
          }}
        >
          {blackPct > 15 && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", opacity: 0.9 }}>
              {blackPct.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
