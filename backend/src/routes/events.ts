import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { pool } from "../db.js";

const eventsRouter = Router();

// List events (public - used by client sidebar)
eventsRouter.get("/", async (_req, res) => {
  try {
    const result = await pool.query(`SELECT id, title, datetime, mention_date, module, kind, created_by, created_at FROM events ORDER BY datetime ASC`);
    return res.json({ data: result.rows });
  } catch (err) {
    // Log detailed error for server-side debugging but return a graceful empty response
    console.error('GET /api/events failed (DB error):', err);
    // Return empty list so public UI doesn't show a 500; frontend can show fallback message.
    return res.json({ data: [] });
  }
});

// Create event (admin / super_admin)
eventsRouter.post("/", authenticate, requireRole(["admin", "super_admin"]), async (req, res) => {
  const { title, datetime, mention_date, module, kind } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO events (title, datetime, mention_date, module, kind, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, datetime, mention_date, module, kind, created_by, created_at`,
      [title, datetime, mention_date || null, module || "", kind || "other", res.locals.userId]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Update event (admin / super_admin)
eventsRouter.put("/:id", authenticate, requireRole(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.params;
  const { title, datetime, mention_date, module, kind } = req.body;
  try {
    const result = await pool.query(
      `UPDATE events SET title = $1, datetime = $2, mention_date = $3, module = $4, kind = $5 WHERE id = $6 RETURNING id, title, datetime, mention_date, module, kind, created_by, created_at`,
      [title, datetime, mention_date || null, module || "", kind || "other", id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event (admin / super_admin)
eventsRouter.delete("/:id", authenticate, requireRole(["admin", "super_admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM events WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default eventsRouter;
