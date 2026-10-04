import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type Role = "member" | "admin" | "super_admin";

export interface AuthPayload {
  sub: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

export const authenticate = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ message: "Missing authorization header" });
  }

  const token = header.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as AuthPayload;
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    return next();
  };
};
