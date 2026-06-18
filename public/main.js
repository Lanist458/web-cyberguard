// public/main.js (replace your current file)
// ASSUMPTION: Pi Developer Portal requires "sandbox flag = true" for Testnet sandbox mode.
// This implementation:
// - Auto-auth on load + manual sign-in button
// - Treats Pi.init(...) as Promise; awaits before Pi.authenticate(...)
// - Uses "username" scope
// - Sends accessToken to backend for validation (/api/auth/pi)
// - Supports sandbox mode via URL query param ?sandbox=true OR localStorage "wcg_sandbox"="true"

const $ = (id) => document.getElementById(id);

const debugEl = $("debug");
const sessionEl = $("session");
const statusEl = $("status");
const btnSignIn = $("btnSignIn");
const btnLogout = $("btnLogout");

// ---- Sandbox flag (Dev Portal requirement) ----
function isSandboxEnabled() {
  const u = new URL(window.location.href);
  const qs = u.searchParams.get("sandbox");
  if (qs === "true") return true;
  if (qs === "false") return false;
  return localStorage.getItem("wcg_sandbox") === "true";
}

function setSandboxEnabled(v) {
  localStorage.setItem("wcg_sandbox", v ? "true" : "false");
}

const SANDBOX = isSandboxEnabled();

function logDebug(obj) {
  debugEl.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

async function getSession() {
  const r = await fetch("/api/session", { method: "GET" });
  if (!r.ok) return { loggedIn: false };
  return await r.json();
}

async function renderSession() {
  const s = await getSession();
  sessionEl.textContent = JSON.stringify(s, null, 2);

  if (s.loggedIn) {
    statusEl.textContent = `Signed in as ${s.username}${SANDBOX ? " (SANDBOX)" : ""}`;
    statusEl.className = "ok";
  } else {
    statusEl.textContent = `Not signed in${SANDBOX ? " (SANDBOX)" : ""}`;
    statusEl.className = "bad";
  }
}

async function authenticateWithPi() {
  if (!window.Pi) throw new Error("Pi SDK not available. Open this app inside Pi Browser / Sandbox.");

  // REQUIRED: treat Pi.init(...) as Promise; await it fully before Pi.authenticate(...)
  // ASSUMPTION: Pi.init accepts sandbox flag. If Pi SDK ignores unknown props, this is still safe.
  await window.Pi.init({ version: "2.0", sandbox: SANDBOX });

  // REQUIRED: scope "username"
  const authResult = await window.Pi.authenticate(
    ["username"],
    () => {
      // Payment callback not used in this MVP; keep for SDK compatibility.
      return {};
    }
  );

  const accessToken = authResult?.accessToken;
  if (!accessToken) throw new Error("Missing accessToken from Pi.authenticate");

  // Send token to backend for validation + session
  const r = await fetch("/api/auth/pi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error(data.error || "Backend auth failed");

  return data;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  await renderSession();
}

btnSignIn?.addEventListener("click", async () => {
  try {
    logDebug({ action: "sign-in", sandbox: SANDBOX });
    await authenticateWithPi();
    await renderSession();
    logDebug({ ok: true, message: "Sign-in OK", sandbox: SANDBOX });
  } catch (e) {
    logDebug({ ok: false, error: String(e?.message ?? e), sandbox: SANDBOX });
    await renderSession();
  }
});

btnLogout?.addEventListener("click", async () => {
  try {
    logDebug({ action: "logout" });
    await logout();
    logDebug({ ok: true, message: "Logged out" });
  } catch (e) {
    logDebug({ ok: false, error: String(e?.message ?? e) });
  }
});

// Auto-trigger auth on load (Dev Portal requirement) but tolerate cancellation/failure.
(async () => {
  try {
    // Helpful UX: show sandbox state and allow toggling via query param
    logDebug({
      note: "Auto-auth starting…",
      sandbox: SANDBOX,
      sandboxHowTo: "Add ?sandbox=true to URL for Dev Portal sandbox, or set localStorage wcg_sandbox=true"
    });

    // If user explicitly toggles sandbox via query param, persist it
    const url = new URL(window.location.href);
    if (url.searchParams.get("sandbox") === "true") setSandboxEnabled(true);
    if (url.searchParams.get("sandbox") === "false") setSandboxEnabled(false);

    await renderSession();
    const s = await getSession();
    if (!s.loggedIn) await authenticateWithPi();
    await renderSession();

    logDebug({ ok: true, message: "Auto-auth completed.", sandbox: SANDBOX });
  } catch (e) {
    logDebug({
      ok: false,
      note: "Auto-auth failed or user cancelled; use Sign in button.",
      error: String(e?.message ?? e),
      sandbox: SANDBOX
    });
    await renderSession();
  }
})();
