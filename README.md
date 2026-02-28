# Stream Donations

A live donation tracker for streaming with Venmo/Zelle integration, soundbite board, and OBS overlay support.

## Features

- **Live Donation Tracking** - Automatically polls Gmail for Venmo/Zelle payment notifications
- **Soundbite Board** - Play custom sound effects with individual volume controls
- **OBS Overlays** - Display recent donations on stream with automatic refresh
- **Admin Dashboard** - Manage donations, configure settings, and control the soundbite board

## Setup Instructions

### 1. Install Bun (if not already installed)

Bun is a fast JavaScript runtime and package manager. If you don't have it:

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Clone the Repository

```bash
git clone https://github.com/<your-username>/stream-donations.git
cd stream-donations
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Install `gog` CLI Tool (Required for Gmail Integration)

The donation polling feature requires the `gog` command-line tool to read Gmail for Venmo/Zelle notifications.

**Install `gog`:**
```bash
# macOS/Linux
curl -fsSL https://raw.githubusercontent.com/anthropics/google-cli/main/install.sh | bash

# Or follow the instructions at: https://github.com/anthropics/google-cli
```

**Configure Gmail access:**
After installing, you'll need to authenticate with your Google account so the app can read your emails for payment notifications.

### 5. Run the Development Server

```bash
bun dev
```

### 6. Access the Site

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Important Notes

### Local Storage

This app currently uses a local JSON file to store donations:
- File location: `/data/donations.json` (created automatically on first run)
- This file is NOT shared when you push to GitHub (it's in `.gitignore`)
- Each person running the app locally will have their own separate donation data
- This is intentional for privacy - your actual donation data stays on your computer

### Payment Details

The following payment details are intentionally included in the code:
- **Venmo handle:** `@jackfahey`
- **Zelle phone:** `(949) 290-0196`

These are public-facing details shown to viewers for making donations.

### Gmail Polling

- Requires the `gog` CLI tool to be installed and configured
- Each person needs to authenticate with their own Gmail account
- The app polls for Venmo and Zelle payment notification emails
- Without `gog`, the automatic donation detection won't work

## Project Structure

- `/app` - Next.js app directory with pages and API routes
- `/components` - React components
- `/data` - Local JSON storage (gitignored)
- `/public/sounds` - Soundbite audio files

## Tech Stack

- **Framework:** Next.js 15
- **Runtime:** Bun
- **Styling:** Tailwind CSS
- **Storage:** Local JSON files (for now)

## Future Plans

- Migrate to a database (Neon PostgreSQL) for production deployment
- Deploy to Vercel for 24/7 availability
- Handle Gmail polling in a cloud environment
