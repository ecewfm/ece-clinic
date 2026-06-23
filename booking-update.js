// api/change-password.js — POST { id, currentPassword, newPassword }
// Verifies the current password against the Users tab, then updates it.
// NOTE: passwords are plain text in the sheet until hashing is added (SETUP.md §8).
const { readTab, updateRow, cors } = require("./_google");

const USER_COLS = ["email", "password", "name", "role", "id"];

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { id, currentPassword, newPassword } = req.body || {};
    if (!id || !currentPassword || !newPassword)
      return res.status(400).json({ error: "id, currentPassword and newPassword are required" });
    if (String(newPassword).length < 4)
      return res.status(400).json({ error: "New password must be at least 4 characters" });

    const users = await readTab("Users");
    const u = users.find((x) => x.id === id);
    if (!u) return res.status(404).json({ error: "user not found" });
    if (u.password !== currentPassword)
      return res.status(401).json({ error: "Current password is incorrect" });

    const ok = await updateRow("Users", USER_COLS, "id", id, { password: newPassword });
    if (!ok) return res.status(500).json({ error: "could not update password" });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
