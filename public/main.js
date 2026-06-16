const $ = (id) => document.getElementById(id);

const debugEl = $("debug");
const sessionEl = $("session");
const statusEl = $("status");

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
    statusEl.textContent = `Signed in as ${s.username}`;
    statusEl.className = "ok";
  } else {
    statusEl.textContent = "Not signed in";
    statusEl.className = "bad";
  }
}

async function authenticateWithPi() {
  if (!window.Pi) throw new Error("Pi SDK not available. Open this app inside Pi Browser.");

  // REQUIRED: treat Pi.init(...) as Promise and await it fully
  await window.Pi.init({ version: "2.0" });

  // REQUIRED: scope username
  const authResult = await window.Pi.authenticate(
    ["username"],
    () => {
      // Not used for this app; callback kept for SDK compatibility.
      return {};
    }
  );

  const accessToken = authResult?.accessToken;
  if (!accessToken) throw new Error("Missing accessToken from Pi.authenticate");

  const r = await fetch("/api/auth/pi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken })
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    throw new Error(data.error || "Backend auth failed");
  }

  return data;
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  await renderSession();
}

$("btnSignIn").addEventListener("click", async () => {
  try {
    logDebug("Signing in…");
    await authenticateWithPi();
    await renderSession();
    logDebug("Sign-in OK");
  } catch (e) {
    logDebug({ error: String(e?.message ?? e) });
    await renderSession();
  }
});

$("btnLogout").addEventListener("click", async () => {
  try {
    logDebug("Logging out…");
    await logout();
    logDebug("Logged out");
  } catch (e) {
    logDebug({ error: String(e?.message ?? e) });
  }
});

// REQUIRED: auto-trigger Pi authentication on load (also keep manual button)
(async () => {
  try {
    await renderSession();
    const s = await getSession();
    if (!s.loggedIn) {
      logDebug("Auto-auth starting…");
      await authenticateWithPi();
    }
    await renderSession();
    logDebug("Auto-auth completed.");
  } catch (e) {
    logDebug({
      note: "Auto-auth failed or user cancelled; use the Sign in button.",
      error: String(e?.message ?? e)
    });
    await renderSession();
  }
})();
