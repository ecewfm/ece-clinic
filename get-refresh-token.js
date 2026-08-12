# Copy these into Vercel → Project → Settings → Environment Variables.
# Do NOT commit real values to GitHub.

# The Google Sheet that stores all data (the long ID from the sheet URL).
SHEET_ID=

# OAuth credentials from your Google Cloud "OAuth client ID" (Web application).
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Long-lived token produced by running get-refresh-token.js once.
GOOGLE_REFRESH_TOKEN=

# Optional: a specific calendar. Defaults to the signed-in account's primary.
CALENDAR_ID=

# Secret for the one-time /api/setup endpoint that builds tabs/headers.
# Set any random string, run setup once, then remove or rotate it.
SETUP_KEY=
