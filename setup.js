// api/staff.js — GET list of staff; the frontend reads live status from here.
const { readTab, cors } = require("./_google");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const staff = await readTab("Staff"); // cols: id,name,role,email,status
    res.status(200).json(staff);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
