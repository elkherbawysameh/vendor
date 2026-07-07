import { type Request, type Response, type NextFunction } from "express";
import { getRole } from "../routes/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const email = req.signedCookies?.user_email as string | undefined;
  if (!email) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as any).userEmail = email;
  (req as any).userRole = getRole(email);
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req as any).userRole as string | undefined;
    if (!role || !roles.includes(role)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    next();
  };
}
