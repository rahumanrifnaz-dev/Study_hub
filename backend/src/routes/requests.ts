import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { query } from "../db.js";

export const requestRouter = Router();

requestRouter.get(
  "/",
  authenticate,
  requireRole(["super_admin"]),
  async (_req, res) => {
    const rows = await query(
      "SELECT ar.id, p.full_name, p.email, ar.status FROM admin_requests ar JOIN profiles p ON p.id = ar.user_id WHERE ar.status = 'pending'"
    );
    res.json(rows);
  }
);

requestRouter.post(
  "/:requestId/approve",
  authenticate,
  requireRole(["super_admin"]),
  async (req, res) => {
    const { requestId } = req.params;
    await query("UPDATE admin_requests SET status = 'approved' WHERE id = $1", [
      requestId,
    ]);
    await query(
      "UPDATE profiles SET role = 'admin' WHERE id = (SELECT user_id FROM admin_requests WHERE id = $1)",
      [requestId]
    );
    res.json({ status: "approved" });
  }
);

requestRouter.post(
  "/:requestId/reject",
  authenticate,
  requireRole(["super_admin"]),
  async (req, res) => {
    const { requestId } = req.params;
    await query("UPDATE admin_requests SET status = 'rejected' WHERE id = $1", [
      requestId,
    ]);
    res.json({ status: "rejected" });
  }
);
