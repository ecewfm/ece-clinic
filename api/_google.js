// api/_google.js — shared Google auth, Sheets, and Calendar helpers.
// Uses OAuth2 with a long-lived REFRESH TOKEN from the clinic Google account.
// No Workspace admin / domain-wide delegation needed. The account that signs in
// once (to produce the refresh token) must own or have edit access to the Sheet.

const { google } = require("googleapis");

const SHEET_ID = process.env.SHEET_ID;
const CALENDAR_ID = process.env.CALENDAR_ID || "primary";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Build an authenticated OAuth2 client. googleapis auto-refreshes the access
// token from the refresh token on each call, so this works indefinitely.
function oauthClient() {
  const c = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  c.setCredentials({ refresh_token: REFRESH_TOKEN });
  return c;
}

async function getSheets() {
  return google.sheets({ version: "v4", auth: oauthClient() });
}
async function getCalendar() {
  return google.calendar({ version: "v3", auth: oauthClient() });
}

// ---- Sheet helpers (each tab is a simple table with a header row) ----
async function readTab(tab) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:Z10000`,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const head = rows[0];
  return rows.slice(1).map((r) => {
    const o = {};
    head.forEach((h, i) => (o[h] = r[i] ?? ""));
    return o;
  });
}

async function appendRow(tab, headerOrder, obj) {
  const sheets = await getSheets();
  const values = [headerOrder.map((h) => obj[h] ?? "")];
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

// Update a single row matched by a key column == keyValue.
async function updateRow(tab, headerOrder, keyCol, keyValue, patch) {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A1:Z10000`,
  });
  const rows = res.data.values || [];
  const head = rows[0] || headerOrder;
  const keyIdx = head.indexOf(keyCol);
  let target = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][keyIdx] === keyValue) { target = i; break; }
  }
  if (target === -1) return false;
  const current = {};
  head.forEach((h, i) => (current[h] = rows[target][i] ?? ""));
  Object.assign(current, patch);
  const newRow = head.map((h) => current[h] ?? "");
  const rowNumber = target + 1; // 1-based incl. header
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [newRow] },
  });
  return true;
}

// Create a Calendar event WITH a Google Meet link.
async function createMeetEvent({ summary, description, startISO, endISO, attendees }) {
  const calendar = await getCalendar();
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary,
      description,
      start: { dateTime: startISO },
      end: { dateTime: endISO },
      attendees: (attendees || []).map((e) => ({ email: e })),
      conferenceData: {
        createRequest: {
          requestId: "ece-" + Date.now(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });
  const meet =
    res.data.hangoutLink ||
    (res.data.conferenceData?.entryPoints || []).find((p) => p.entryPointType === "video")?.uri ||
    "";
  return { eventId: res.data.id, meet };
}

async function listCalendarEvents(timeMinISO, timeMaxISO) {
  const calendar = await getCalendar();
  const res = await calendar.events.list({
    calendarId: CALENDAR_ID,
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 250,
  });
  return (res.data.items || []).map((e) => ({
    id: e.id,
    summary: e.summary || "",
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    meet: e.hangoutLink || "",
  }));
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

module.exports = {
  SHEET_ID, CALENDAR_ID,
  readTab, appendRow, updateRow,
  createMeetEvent, listCalendarEvents, cors,
};
