// api/settings.js — GET returns queue settings; POST updates them.
// Stored in a "Settings" tab as a simple two-column table: key | value
// Currently the only key is "routing" (longest_idle | site_building).
const { readTab, updateRow, appendRow, cors } = require("./_google");

const COLS = ["key", "value"];
const DEFAULTS = { routing: "longest_idle" };

async function readSettings() {
  let rows = [];
  try { rows = await readTab("Settings"); } catch (e) { rows = []; }
  const out = { ...DEFAULTS };
  rows.forEach((r) => { if (r.key) out[r.key] = r.value; });
  return out;
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    if (req.method === "GET") {
      return res.status(200).json(await readSettings());
    }
    if (req.method === "POST") {
      const patch = req.body || {};
      // upsert each key
      for (const k of Object.keys(patch)) {
        const ok = await updateRow("Settings", COLS, "key", k, { key: k, value: patch[k] });
        if (!ok) await appendRow("Settings", COLS, { key: k, value: patch[k] });
      }
      return res.status(200).json(await readSettings());
    }
    res.status(405).json({ error: "GET or POST only" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
