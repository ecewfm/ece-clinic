// api/track.js — GET ?id=TRK-XXXX  → public, read-only status of a single booking.
// Returns only the fields needed for the tracking page (no internal IDs/eventId).
const { readTab, cors } = require("./_google");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const id = (req.query && req.query.id) || "";
    if (!id) return res.status(400).json({ error: "tracking id required" });
    const rows = await readTab("Bookings");
    const b = rows.find((r) => (r.trackingId || "").toUpperCase() === String(id).toUpperCase());
    if (!b) return res.status(404).json({ error: "not_found" });
    // Return a limited, safe subset.
    res.status(200).json({
      trackingId: b.trackingId,
      employee: b.employee,
      reason: b.reason,
      mode: b.mode,
      site: b.site,
      building: b.building,
      date: b.date,
      status: b.status,
      assignedTo: b.assignedTo,
      meet: b.meet,
      createdAt: b.createdAt,
      acceptedAt: b.acceptedAt,
      consultEndAt: b.consultEndAt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
