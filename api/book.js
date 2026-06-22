// api/book.js — POST a new booking. Public + employee both use this.
// For online consultations we create a Google Meet event immediately so the
// link exists; assignment happens later when a nurse/doctor confirms.
const { appendRow, createMeetEvent, cors } = require("./_google");

const COLS = ["id","employee","idNumber","reason","mode","date","status","assignedTo","meet","eventId"];

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { employee, idNumber, reason, mode, date } = req.body || {};
    if (!employee || !idNumber || !reason || !date)
      return res.status(400).json({ error: "employee, idNumber, reason and date are required" });

    const id = "b" + Date.now();
    let meet = "", eventId = "";

    if (mode === "online") {
      const start = new Date(date);
      const end = new Date(start.getTime() + 30 * 60000); // 30-min slot
      try {
        const ev = await createMeetEvent({
          summary: `Online consultation — ${employee} (ID ${idNumber})`,
          description: `Reason: ${reason}\nID number: ${idNumber}\nBooking: ${id}`,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          attendees: [],
        });
        meet = ev.meet; eventId = ev.eventId;
      } catch (calErr) {
        // Don't fail the booking if Calendar/Meet hiccups; staff can add a link later.
        console.error("Meet creation failed:", calErr.message);
      }
    }

    const booking = { id, employee, idNumber, reason, mode: mode || "onsite",
      date, status: "pending", assignedTo: "", meet, eventId };
    await appendRow("Bookings", COLS, booking);
    res.status(200).json(booking);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
