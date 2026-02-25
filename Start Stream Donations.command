#!/bin/bash

# ─────────────────────────────────────────────
#  Stream Donations - One-Click Launcher
# ─────────────────────────────────────────────

cd "$(dirname "$0")"

# Clean up when the user presses Ctrl+C or closes the window
cleanup() {
  echo ""
  echo "  Shutting down..."
  kill $DEV_PID 2>/dev/null
  kill $TUNNEL_PID 2>/dev/null
  lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null
  echo "  Done! You can close this window."
  exit 0
}
trap cleanup INT TERM EXIT

clear
echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║     Stream Donations - Starting...    ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# Stop anything already running on port 3000
lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null
sleep 1

# Start the app in the background
echo "  [1/2] Starting the app..."
bun dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 3

# Start the named tunnel (always uses donate.jackfahey.org)
echo "  [2/2] Connecting donate.jackfahey.org..."
cloudflared tunnel run stream-donations > /dev/null 2>&1 &
TUNNEL_PID=$!
sleep 4

echo ""
echo ""
echo "  ╔═══════════════════════════════════════════════════════╗"
echo "  ║                    READY TO GO!                       ║"
echo "  ╠═══════════════════════════════════════════════════════╣"
echo "  ║                                                       ║"
echo "  ║  YOUR LINKS (always the same!):                       ║"
echo "  ║                                                       ║"
echo "  ║  Viewer Donate Page (share in stream chat):           ║"
echo "  ║  → https://donate.jackfahey.org                       ║"
echo "  ║                                                       ║"
echo "  ║  Admin Dashboard (for you):                           ║"
echo "  ║  → https://donate.jackfahey.org/admin                 ║"
echo "  ║                                                       ║"
echo "  ║  Streamlabs Overlay (paste into Browser Source):      ║"
echo "  ║  → https://donate.jackfahey.org/overlay               ║"
echo "  ║                                                       ║"
echo "  ╚═══════════════════════════════════════════════════════╝"
echo ""
echo "  Gmail is being checked for Venmo/Zelle payments"
echo "  every 10 seconds automatically."
echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  Press Ctrl+C to stop everything and quit   │"
echo "  └─────────────────────────────────────────────┘"
echo ""

# Keep running until Ctrl+C
wait $TUNNEL_PID 2>/dev/null
wait $DEV_PID 2>/dev/null
