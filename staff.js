// api/book.js — POST a new booking. Public + employee both use this.
// For online consultations we create a Google Meet event immediately so the
// link exists; assignment happens later when a nurse/doctor confirms.
const { appendRow, createMeetEvent, cors } = require("./_google");

const COLS = ["id","trackingId","employee","zohoEmail","reason","mode","site","building","date","status","assignedTo","meet","eventId","createdAt","acceptedAt","consultEndAt"];

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { employee, zohoEmail, reason, mode, site, building, date } = req.body || {};
    if (!employee || !zohoEmail || !reason || !date)
      return res.status(400).json({ error: "employee, zohoEmail, reason and date are required" });

    const id = "b" + Date.now();
    const trackingId = "TRK-" + Math.floor(1000 + Math.random() * 9000);
    const createdAt = new Date().toISOString();
    let meet = "", eventId = "";

    if (mode === "online") {
      const start = new Date(date);
      const end = new Date(start.getTime() + 30 * 60000); // 30-min slot
      try {
        const ev = await createMeetEvent({
          summary: `Online consultation — ${employee} (${trackingId})`,
          description: `Reason: ${reason}\nZoho email: ${zohoEmail}\nSite: ${site||"-"} / Building: ${building||"-"}\nTracking: ${trackingId}`,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          attendees: zohoEmail ? [zohoEmail] : [],
        });
        meet = ev.meet; eventId = ev.eventId;
      } catch (calErr) {
        console.error("Meet creation failed:", calErr.message);
      }
    }

    const booking = { id, trackingId, employee, zohoEmail, reason, mode: mode || "onsite",
      site: site || "", building: building || "", date, status: "pending", assignedTo: "",
      meet, eventId, createdAt, acceptedAt: "", consultEndAt: "" };
    await appendRow("Bookings", COLS, booking);
    res.status(200).json(booking);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
