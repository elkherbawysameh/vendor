import { Router } from "express";

const router = Router();

const ACCOUNTS_MANAGER = "balghafli@qoyod.com";
const ACCOUNTS_EMPLOYEE = "ohamdy@qoyod.com";
const ADMIN = "s.elkherbawy@qoyod.com";

export function getRole(email: string): "admin" | "accounts_manager" | "accounts_employee" | "employee" {
  if (email === ADMIN) return "admin";
  if (email === ACCOUNTS_MANAGER) return "accounts_manager";
  if (email === ACCOUNTS_EMPLOYEE) return "accounts_employee";
  return "employee";
}

// POST /auth/login
router.post("/auth/login", (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith("@qoyod.com")) {
    return res.status(400).json({ error: "Email must end with @qoyod.com" });
  }
  const role = getRole(normalized);
  res.cookie("user_email", normalized, {
    signed: true,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax",
  });
  return res.json({ email: normalized, role, name: null });
});

// GET /auth/me
router.get("/auth/me", (req, res) => {
  const email = req.signedCookies?.user_email as string | undefined;
  if (!email) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const role = getRole(email);
  return res.json({ email, role, name: null });
});

// POST /auth/logout
router.post("/auth/logout", (_req, res) => {
  res.clearCookie("user_email");
  return res.json({ ok: true });
});

export default router;
