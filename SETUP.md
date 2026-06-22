// get-refresh-token.js — run ONCE on your computer to produce GOOGLE_REFRESH_TOKEN.
//
// Usage:
//   1) npm install googleapis     (in this folder)
//   2) Put your OAuth client id/secret below or as env vars.
//   3) node get-refresh-token.js
//   4) Open the printed URL, sign in as the CLINIC Google account, approve.
//   5) Copy the ?code=... value from the redirected URL back into the terminal.
//   6) Copy the printed refresh_token into Vercel as GOOGLE_REFRESH_TOKEN.

const { google } = require("googleapis");
const readline = require("readline");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "PASTE_CLIENT_ID_HERE";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "PASTE_CLIENT_SECRET_HERE";
// Must match a redirect URI you registered on the OAuth client.
const REDIRECT = "http://localhost:53682/";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.events",
];

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);

const url = oauth2.generateAuthUrl({
  access_type: "offline",     // <-- required to get a refresh token
  prompt: "consent",          // <-- forces a fresh refresh token every run
  scope: SCOPES,
});

console.log("\n1) Open this URL in your browser and sign in as the CLINIC account:\n");
console.log(url);
console.log("\n2) After approving, the browser will try to load a localhost page that fails — that's fine.");
console.log("   Copy the value of `code=` from that URL's address bar.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2.getToken(code.trim());
    if (!tokens.refresh_token) {
      console.error("\nNo refresh_token returned. Re-run; make sure prompt:'consent' and access_type:'offline' are set, and revoke prior access at https://myaccount.google.com/permissions if needed.");
      return;
    }
    console.log("\n==================  COPY THIS  ==================");
    console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("================================================\n");
    console.log("Paste it into Vercel as the GOOGLE_REFRESH_TOKEN env var.");
  } catch (e) {
    console.error("Token exchange failed:", e.message);
  }
});
