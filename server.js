import express from "express";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// --- In-memory sessions (OK for MVP verification; can be replaced later) ---
const sessions = new Map(); // sid -> { username, piUser, createdAt }

function newSessionId() {
  return crypto.randomBytes(32).toString("hex");
}

function setSessionCookie(res, sid) {
  // Pi App Studio hosting will be HTTPS; secure cookies should work.
  // SameSite= "none" is generally safest for first-party app usage.
  res.cookie("wcg_sid", sid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/"
  });
}

function clearSessionCookie(res) {
  res.cookie("wcg_sid", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
    path: "/"
  });
}

async function validatePiAccessToken(accessToken) {
  const r = await fetch("https://api.minepi.com/v2/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Pi token validation failed: ${r.status} ${text}`);
  }
  return await r.json();
}

// --- API ---
app.post("/api/auth/pi", async (req, res) => {
  try {
    const { accessToken } = req.body ?? {};
    if (!accessToken || typeof accessToken !== "string") {
      return res.status(400).json({ ok: false, error: "Missing accessToken" });
    }

    const piMe = await validatePiAccessToken(accessToken);
    const username = piMe?.username;
    if (!username) {
      return res.status(401).json({ ok: false, error: "Pi validation did not return username" });
    }

    const sid = newSessionId();
    sessions.set(sid, { username, piUser: piMe, createdAt: Date.now() });
    setSessionCookie(res, sid);

    return res.json({ ok: true, username });
  } catch (e) {
    return res.status(401).json({ ok: false, error: String(e?.message ?? e) });
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
app.use("/", express.static(path.join(__dirname, "public")));

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// SPA fallback (optional): serve index.html for unknown routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Web CyberGuard running on port ${port}`));
