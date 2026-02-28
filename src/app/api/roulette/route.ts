import { NextResponse } from "next/server";
import { getRoulette, setRoulette } from "@/lib/store";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  const state = await getRoulette();
  return NextResponse.json({
    active: state.active,
    redVotes: state.redVotes,
    blackVotes: state.blackVotes,
    sessionId: state.sessionId,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const voterId = String(body.voterId || "");
  const choice = String(body.choice || "");

  if (!voterId || (choice !== "red" && choice !== "black")) {
    return NextResponse.json({ success: false, reason: "invalid" }, { status: 400 });
  }

  const state = await getRoulette();

  if (!state.active) {
    return NextResponse.json({ success: false, reason: "closed" });
  }

  const lastVoteTime = state.voterTimestamps[voterId];
  if (lastVoteTime) {
    const elapsed = Date.now() - lastVoteTime;
    if (elapsed < COOLDOWN_MS) {
      return NextResponse.json({
        success: false,
        reason: "cooldown",
        remainingMs: COOLDOWN_MS - elapsed,
      });
    }
  }

  state.voterTimestamps[voterId] = Date.now();
  if (choice === "red") {
    state.redVotes += 1;
  } else {
    state.blackVotes += 1;
  }
  await setRoulette(state);

  return NextResponse.json({
    success: true,
    redVotes: state.redVotes,
    blackVotes: state.blackVotes,
    sessionId: state.sessionId,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const action = String(body.action || "");

  const state = await getRoulette();

  if (action === "open") {
    state.active = true;
  } else if (action === "close") {
    state.active = false;
  } else if (action === "reset") {
    state.active = false;
    state.redVotes = 0;
    state.blackVotes = 0;
    state.sessionId = randomUUID();
    state.voterTimestamps = {};
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  await setRoulette(state);
  return NextResponse.json({
    active: state.active,
    redVotes: state.redVotes,
    blackVotes: state.blackVotes,
    sessionId: state.sessionId,
  });
}
