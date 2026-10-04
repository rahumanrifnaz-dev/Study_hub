import { Router } from "express";
import jwt from "jsonwebtoken";
import { query } from "../db.js";

export const authRouter = Router();

// POST /api/auth/login
// Supabase-like auth flow: returns JWT with role claim.
authRouter.post("/login", async (req, res) => {
  const { email } = req.body as { email: string; password: string };

  let users = await query<{ id: string; role: string; full_name: string }>(
    "SELECT id, role, full_name FROM profiles WHERE email = $1",
    [email]
  );

  // If the profile doesn't exist in the backend DB, create a minimal member profile so
  // the backend can issue a JWT for the currently authenticated Supabase user.
  if (users.length === 0) {
    const displayName = email.split('@')[0];
    const inserted = await query<{ id: string; role: string; full_name: string }>(
      "INSERT INTO profiles (full_name, email, role) VALUES ($1, $2, $3) RETURNING id, role, full_name",
      [displayName, email, 'member']
    );
    users = inserted;
  }

  const user = users[0];
  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET ?? "dev-secret",
    { expiresIn: "1d" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.full_name,
      role: user.role,
    },
  });
});

// POST /api/auth/request-admin
// Member creates admin access request; RLS-ready to be validated server-side.
authRouter.post("/request-admin", async (req, res) => {
  const { userId } = req.body as { userId: string };
  await query(
    "INSERT INTO admin_requests (user_id, status) VALUES ($1, 'pending') ON CONFLICT DO NOTHING",
    [userId]
  );
  res.json({ status: "pending" });
});
