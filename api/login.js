// api/login.js — POST { email, password, role }. Validates against the Users tab.
// NOTE: store hashed passwords in production. This compares against a Users sheet
// with columns: email,password,name,role,id. Swap to a hash check before going live.
const { readTab, cors } = require("./_google");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { email, password, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const users = await readTab("Users"); // email,password,name,role,id
    const u = users.find((x) => (x.email || "").toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password)
      return res.status(401).json({ error: "Invalid credentials" });
    if (role && u.role !== role)
      return res.status(403).json({ error: `This account is a ${u.role}.` });
    res.status(200).json({ id: u.id, name: u.name, role: u.role, email: u.email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
