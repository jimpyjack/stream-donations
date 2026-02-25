"use client";

import { useEffect, useState, useCallback } from "react";

interface Theme {
  preset: string;
  barColor: string;
  barBgColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  alertStyle: string;
  barStyle: string;
}

export default function MovieOverlayPage() {
  const [count, setCount] = useState(0);
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

  const poll = useCallback(async () => {
    try {
      const [countRes, themeRes] = await Promise.all([
        fetch("/api/movie-count"),
        fetch("/api/theme"),
      ]);
      const countData = await countRes.json();
      const themeData = await themeRes.json();
      setCount(countData.count ?? 0);
      setTheme(themeData);
    } catch {
      // retry next cycle
    }
  }, []);

  useEffect(() => {
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [poll]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        fontFamily: `${theme.fontFamily}, system-ui, sans-serif`,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Roboto+Mono:wght@400;700&family=Press+Start+2P&display=swap');
      `}</style>
      <div
        style={{
          background: `${theme.barBgColor}dd`,
          border: `2px solid ${theme.accentColor}`,
          borderRadius: 16,
          padding: "20px 36px",
          textAlign: "center",
          boxShadow: `0 0 24px ${theme.accentColor}44`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: theme.accentColor,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          Times Watched
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: theme.barColor,
            lineHeight: 1,
            textShadow: `0 0 16px ${theme.barColor}66`,
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
}
