// api/calendar.js — GET ?from=ISO&to=ISO returns Google Calendar events
// (with Meet links) for the synced calendar view.
const { listCalendarEvents, cors } = require("./_google");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const now = new Date();
    const from = req.query.from || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const to = req.query.to || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    const events = await listCalendarEvents(from, to);
    res.status(200).json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
