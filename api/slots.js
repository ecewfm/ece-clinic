// api/slots.js — GET → public, returns booking COUNTS per date+time slot only.
// No patient data is exposed. Used by the booking page to warn when a slot is busy.
const { readTab, cors } = require("./_google");

// Round an ISO datetime to its 30-minute slot key in EST, e.g. "2026-06-25T13:30".
function slotKeyEST(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  // format the instant in America/New_York, then floor minutes to :00 or :30
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
    const counts = {};
    rows.forEach((b) => {
      // only count active requests (not completed/cancelled) toward "busy"
      if (b.status === "completed" || b.status === "cancelled") return;
      const k = slotKeyEST(b.date);
      if (!k) return;
      counts[k] = (counts[k] || 0) + 1;
    });
    res.status(200).json({ counts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
