/**
 * One-time helper script to get a Gmail OAuth refresh token.
 *
 * Run with: node scripts/get-gmail-token.mjs
 *   (or: bun scripts/get-gmail-token.mjs)
 *
 * Before running, set these two environment variables:
 *   GMAIL_CLIENT_ID=your-client-id
 *   GMAIL_CLIENT_SECRET=your-client-secret
 *
 * Or just paste them into the prompts below.
 */

import { createInterface } from "readline";
import { google } from "googleapis";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const clientId =
  process.env.GMAIL_CLIENT_ID || (await ask("Paste your GMAIL_CLIENT_ID: "));
const clientSecret =
  process.env.GMAIL_CLIENT_SECRET ||
  (await ask("Paste your GMAIL_CLIENT_SECRET: "));

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "urn:ietf:wg:oauth:2.0:oob" // "copy/paste" redirect (no web server needed)
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  prompt: "consent", // forces Google to return a refresh_token every time
});

console.log("\n─────────────────────────────────────────────────────────");
console.log("1. Open this URL in your browser and sign in with your Gmail:\n");
console.log(authUrl);
console.log("\n─────────────────────────────────────────────────────────");
console.log('2. Google will show a code. Copy it.\n');

const code = await ask("Paste the code here: ");

const { tokens } = await oauth2Client.getToken(code.trim());

console.log("\n─────────────────────────────────────────────────────────");
console.log("Success! Add these to your Vercel environment variables:\n");
console.log(`GMAIL_CLIENT_ID=${clientId}`);
console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
console.log("─────────────────────────────────────────────────────────\n");

rl.close();
