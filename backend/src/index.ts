import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./routes/auth.js";
import { subjectRouter } from "./routes/subjects.js";
import { requestRouter } from "./routes/requests.js";
import { fileRouter } from "./routes/files.js";
import { activityRouter } from "./routes/activity.js";
import { usersRouter } from "./routes/users.js";
import eventsRouter from "./routes/events.js";
import { pool } from "./db.js";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", date: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/requests", requestRouter);
app.use("/api/files", fileRouter);
app.use("/api/activity", activityRouter);
app.use("/api/users", usersRouter);
app.use("/api/events", eventsRouter);

// Cleanup: remove past events automatically (runs on startup and periodically)
import { cleanupPastEvents, cleanupStatus } from './cleanup.js';

// run cleanup on startup
cleanupPastEvents();
// schedule periodic cleanup (every 5 minutes)
setInterval(cleanupPastEvents, 1000 * 60 * 5);

// expose lightweight status endpoint so frontend/dev can verify cleanup ran
app.get('/api/internal/cleanup-status', (_req, res) => {
  res.json({ lastRun: cleanupStatus.lastRun, lastRemoved: cleanupStatus.lastRemoved });
});

// development helper: trigger cleanup immediately (useful for testing)
app.post('/api/internal/run-cleanup', async (_req, res) => {
  try {
    await cleanupPastEvents();
    res.json({ ok: true, status: { lastRun: cleanupStatus.lastRun, lastRemoved: cleanupStatus.lastRemoved } });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// development helper: insert a past event (for testing cleanup)
app.post('/api/internal/insert-past-event', async (_req, res) => {
  try {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 24h ago
    const result = await pool.query(`INSERT INTO events (title, datetime, mention_date, module, kind, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, title, datetime`, ['__test_past_event__', past, null, '', 'other', null]);
    res.json({ ok: true, event: result.rows[0] });
  } catch (err: any) {
    console.error('insert-past-event failed', err);
    res.status(500).json({ ok: false, error: { name: err?.name, message: err?.message, stack: err?.stack } });
  }
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`API running on ${port}`);
});
