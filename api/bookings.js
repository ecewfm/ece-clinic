// api/bookings.js — GET all bookings from the sheet.
const { readTab, cors } = require("./_google");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    // cols: id,employee,idNumber,reason,mode,date,status,assignedTo,meet,eventId
    const rows = await readTab("Bookings");
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
