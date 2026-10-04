import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { query } from "../db.js";

export const usersRouter = Router();

// Get all users (for super admin)
usersRouter.get("/", authenticate, requireRole(["super_admin"]), async (_req, res) => {
  const users = await query(
    "SELECT id, full_name, email, role FROM profiles ORDER BY created_at DESC"
  );
  res.json(users);
});

// Change user role (for super admin)
usersRouter.post(
  "/:userId/role",
  authenticate,
  requireRole(["super_admin"]),
  async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body as { role: string };
    if (!role || !["member", "admin", "super_admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    await query("UPDATE profiles SET role = $1 WHERE id = $2", [role, userId]);
    res.json({ success: true });
  }
);
