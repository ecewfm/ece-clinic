// api/track.js — public, read-only. Two modes:
//   GET ?id=TRK-XXXX → status of a single booking (limited, safe fields)
//   GET ?slots=1     → booking COUNTS per 30-min EST slot (no patient data),
//                      used by the booking page to warn when a slot is busy.
const { readTab, cors } = require("./_google");

// Floor an ISO datetime to its 30-minute slot key in EST, e.g. "2026-06-25T13:30".
function slotKeyEST(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t).value;
  const min = Number(g("minute"));
  const slotMin = min < 30 ? "00" : "30";
  let hh = g("hour"); if (hh === "24") hh = "00";
  return `${g("year")}-${g("month")}-${g("day")}T${hh}:${slotMin}`;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const rows = await readTab("Bookings");

    // --- slot-count mode (no patient data) ---
    if (req.query && (req.query.slots === "1" || req.query.slots === "true")) {
      const counts = {};
      rows.forEach((b) => {
        if (b.status === "completed" || b.status === "cancelled") return;
        const k = slotKeyEST(b.date);
        if (!k) return;
        counts[k] = (counts[k] || 0) + 1;
      });
      return res.status(200).json({ counts });
    }

    // --- single-booking status mode ---
    const id = (req.query && req.query.id) || "";
    if (!id) return res.status(400).json({ error: "tracking id required" });
    const b = rows.find((r) => (r.trackingId || "").toUpperCase() === String(id).toUpperCase());
    if (!b) return res.status(404).json({ error: "not_found" });
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
