// api/setup.js — ONE-TIME setup. Creates any missing tabs and writes the exact
// header rows the app expects. Safe to run more than once: it only (re)writes
// row 1 headers and never touches your data rows below them.
//
// Protected by SETUP_KEY. Call it as:
//   https://YOUR-APP.vercel.app/api/setup?key=YOUR_SETUP_KEY
// Set SETUP_KEY in Vercel env vars. If SETUP_KEY is not set, setup is disabled
// (so a stranger can't reset your headers).
const { ensureTabsAndHeaders, cors } = require("./_google");

const SPEC = {
  Users: ["email", "password", "name", "role", "id"],
  Staff: ["id", "name", "role", "email", "status", "site", "building", "lastIdleAt"],
  Bookings: ["id", "trackingId", "employee", "zohoEmail", "reason", "mode", "site",
             "building", "date", "status", "assignedTo", "meet", "eventId",
             "createdAt", "acceptedAt", "consultEndAt"],
  Settings: ["key", "value"],
};

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const key = (req.query && req.query.key) || "";
    const expected = process.env.SETUP_KEY || "";
    if (!expected) {
      return res.status(403).json({
        error: "Setup is disabled. Add a SETUP_KEY environment variable in Vercel, then call /api/setup?key=YOUR_KEY",
      });
    }
    if (key !== expected) {
      return res.status(401).json({ error: "Invalid or missing ?key=" });
    }
    const report = await ensureTabsAndHeaders(SPEC);
    res.status(200).json({
      ok: true,
      message: "Tabs and headers are set. You can now add your Users and Staff rows.",
      report,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
