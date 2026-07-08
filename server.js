import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

// --- Security headers (Finding #3) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://sdk.minepi.com"],
      connectSrc: ["'self'", "https://api.minepi.com"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// --- Rate limiting (Finding #4) ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many attempts. Try again later." },
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests. Try again later." },
});

const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

// --- Origin validation on API routes (Finding #13) ---
function validateOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (!origin) return next(); // same-origin requests, server-to-server calls
  const allowedOrigins = [
    /^https:\/\/.*\.piapp\.store$/,
    /^pi:\/\/.*$/,
  ];
  if (allowedOrigins.some(pattern => pattern.test(origin))) {
    return next();
  }
  return res.status(403).json({ ok: false, error: "Origin not allowed" });
}

// --- CSRF protection (Finding #1, #11) ---
function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function setCsrfCookie(res, token) {
  res.cookie("wcg_csrf", token, {
    httpOnly: false,        // client JS needs to read this
    secure: true,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

function csrfMiddleware(req, res, next) {
  // Skip CSRF check for GET/HEAD/OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const tokenCookie = req.cookies?.wcg_csrf;
  const tokenHeader = req.headers["x-csrf-token"];
  if (!tokenCookie || !tokenHeader || tokenCookie !== tokenHeader) {
    return res.status(403).json({ ok: false, error: "CSRF validation failed" });
  }
  return next();
}

// Endpoint to provision a CSRF token for the client
app.get("/api/csrf-token", (req, res) => {
  const token = generateCsrfToken();
  setCsrfCookie(res, token);
  return res.json({ ok: true, csrfToken: token });
});

// Apply origin and CSRF validation to all API routes
app.use("/api/", validateOrigin);
app.use("/api/", csrfMiddleware);

// --- In-memory sessions (OK for MVP verification; can be replaced later) ---
// sid -> { username, piUser, createdAt, expiresAt }
const sessions = new Map();

function newSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

function setSessionCookie(res, sid) {
  res.cookie("wcg_sid", sid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.cookie("wcg_sid", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
    path: "/",
  });
}

// --- Session garbage collection (Finding #5) ---
// Clean up expired sessions every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of sessions) {
    if (now > session.expiresAt) sessions.delete(sid);
  }
}, 60_000);

// --- Pi API validation with timeout (Finding #9) ---
async function validatePiAccessToken(accessToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout
  try {
    const r = await fetch("https://api.minepi.com/v2/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!r.ok) {
      // Log full error server-side, throw generic (Finding #2)
      const status = r.status;
      const text = await r.text().catch(() => "");
      console.error(`Pi token validation failed: ${status} ${text}`);
      throw new Error("Pi token validation failed");
    }
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

// --- API ---
app.post("/api/auth/pi", authLimiter, async (req, res) => {
  try {
    const { accessToken } = req.body ?? {};

    // Input validation (Finding #10): length + format
    if (!accessToken || typeof accessToken !== "string" || accessToken.length > 2048) {
      return res.status(400).json({ ok: false, error: "Invalid accessToken" });
    }
    if (!/^[A-Za-z0-9._~+\/-]+$/.test(accessToken)) {
      return res.status(400).json({ ok: false, error: "Invalid accessToken format" });
    }

    const piMe = await validatePiAccessToken(accessToken);
    const username = piMe?.username;
    if (!username) {
      return res.status(401).json({ ok: false, error: "Pi validation did not return username" });
    }

    const sid = newSessionId();
    const now = Date.now();
    const expiresAt = now + (1000 * 60 * 60 * 24 * 7); // 7 days
    sessions.set(sid, { username, piUser: piMe, createdAt: now, expiresAt });
    setSessionCookie(res, sid);

    return res.json({ ok: true, username });
  } catch (e) {
    // Generic error, never expose upstream details (Finding #2)
    console.error("auth/pi error:", e);
    return res.status(401).json({ ok: false, error: "Authentication failed. Please try again." });
  }
});

app.get("/api/session", (req, res) => {
  const sid = req.cookies?.wcg_sid;
  const s = sid ? sessions.get(sid) : null;
  if (!s) return res.status(401).json({ loggedIn: false });
  return res.json({ loggedIn: true, username: s.username });
});

app.post("/api/logout", (req, res) => {
  const sid = req.cookies?.wcg_sid;
  if (sid) sessions.delete(sid);
  clearSessionCookie(res);
  return res.json({ ok: true });
});

// --- Static frontend ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Health
app.get("/health", healthLimiter, (req, res) => res.json({ ok: true }));

// --- Explicit 404 for common probe paths (Finding #12) ---
const blockedPaths = [
  "/admin", "/config", "/.env", "/.git", "/wp-admin", "/phpmyadmin",
];
app.use((req, res, next) => {
  if (blockedPaths.some(p => req.path === p || req.path.startsWith(p + "/"))) {
    return res.status(404).json({ error: "Not found" });
  }
  next();
});

// SPA fallback: serve index.html for unknown GET routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Web CyberGuard running on port ${port}`));
