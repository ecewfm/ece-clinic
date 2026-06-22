// api/booking-update.js — POST { id, ...patch } to confirm/assign/complete a booking.
const { updateRow, cors } = require("./_google");

const COLS = ["id","trackingId","employee","zohoEmail","reason","mode","site","building","date","status","assignedTo","meet","eventId","createdAt","acceptedAt","consultEndAt"];

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { id, ...patch } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    const clean = {};
    for (const k of Object.keys(patch)) if (COLS.includes(k)) clean[k] = patch[k];
    const ok = await updateRow("Bookings", COLS, "id", id, clean);
    if (!ok) return res.status(404).json({ error: "booking not found" });
    res.status(200).json({ id, ...clean });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
