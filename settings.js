// api/staff-manage.js — admin add/edit/remove staff.
// Writes to BOTH the Users tab (login) and the Staff tab (routing/display).
// site and building are stored as comma-separated lists (multi-select).
//
// POST actions:
//   { action:"create", name, email, password, role, site:[], building:[] }
//   { action:"update", id, name?, email?, password?, role?, site:[], building:[] }
//   { action:"delete", id }
const { readTab, appendRow, updateRow, deleteRowByKey, cors } = require("./_google");

const USER_COLS = ["email", "password", "name", "role", "id"];
const STAFF_COLS = ["id", "name", "role", "email", "status", "site", "building", "lastIdleAt"];

const asList = (v) => Array.isArray(v) ? v.join(",") : (v || "");

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const body = req.body || {};
    const action = body.action;

    if (action === "create") {
      const { name, email, password, role } = body;
      if (!name || !email || !password || !role)
        return res.status(400).json({ error: "name, email, password and role are required" });
      const id = "u" + Date.now();
      const site = asList(body.site), building = asList(body.building);
      // Users row (login)
      await appendRow("Users", USER_COLS, { email, password, name, role, id });
      // Staff row (only clinical staff appear/route; admins can be staff too)
      await appendRow("Staff", STAFF_COLS, {
        id, name, role, email, status: "notavailable", site, building, lastIdleAt: "",
      });
      return res.status(200).json({ ok: true, id });
    }

    if (action === "update") {
      const { id } = body;
      if (!id) return res.status(400).json({ error: "id required" });
      const staffPatch = {};
      if (body.name != null) staffPatch.name = body.name;
      if (body.role != null) staffPatch.role = body.role;
      if (body.email != null) staffPatch.email = body.email;
      if (body.site != null) staffPatch.site = asList(body.site);
      if (body.building != null) staffPatch.building = asList(body.building);
      await updateRow("Staff", STAFF_COLS, "id", id, staffPatch);
      // mirror name/role/email/password into Users
      const userPatch = {};
      if (body.name != null) userPatch.name = body.name;
      if (body.role != null) userPatch.role = body.role;
      if (body.email != null) userPatch.email = body.email;
      if (body.password) userPatch.password = body.password;
      if (Object.keys(userPatch).length)
        await updateRow("Users", USER_COLS, "id", id, userPatch);
      return res.status(200).json({ ok: true, id });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) return res.status(400).json({ error: "id required" });
      await deleteRowByKey("Staff", "id", id);
      await deleteRowByKey("Users", "id", id);
      return res.status(200).json({ ok: true, id });
    }

    res.status(400).json({ error: "unknown action" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
