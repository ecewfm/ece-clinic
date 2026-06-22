// api/status.js — POST { userId, status } to update a staff member's aux status.
const { updateRow, cors } = require("./_google");

const STAFF_COLS = ["id", "name", "role", "email", "status"];
const VALID = ["available", "notavailable", "consultation", "break", "lunch"];

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { userId, status } = req.body || {};
    if (!userId || !VALID.includes(status))
      return res.status(400).json({ error: "userId and valid status required" });
    const ok = await updateRow("Staff", STAFF_COLS, "id", userId, { status });
    if (!ok) return res.status(404).json({ error: "staff not found" });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
