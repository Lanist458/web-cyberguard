// public/main.js
// Pi Browser authentication client with CSRF token support

(function () {
  function $(id) { return document.getElementById(id); }

  const debugEl = $("debug");
  const sessionEl = $("session");
  const statusEl = $("status");
  const btnSignIn = $("btnSignIn");
  const btnLogout = $("btnLogout");

  // --- CSRF token for POST requests ---
  let csrfToken = "";

  async function fetchCsrfToken() {
    try {
      const r = await fetch("/api/csrf-token", { method: "GET" });
      if (r.ok) {
        const d = await r.json();
        csrfToken = d.csrfToken || "";
        logDebug({ note: "csrf-token-fetched", ok: !!csrfToken });
      }
    } catch (e) {
      logDebug({ note: "csrf-token-failed", error: String(e?.message ?? e) });
    }
  }

  function csrfHeaders(extra) {
    const h = { ...(extra || {}) };
    if (csrfToken) h["X-CSRF-Token"] = csrfToken;
    return h;
  }

  function logDebug(obj) {
    try { debugEl.textContent = (typeof obj === "string") ? obj : JSON.stringify(obj, null, 2); }
    catch (e) { debugEl.textContent = String(obj); }
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = cls || "muted";
  }

  function hasPiSdk() {
    return !!(window.Pi && typeof window.Pi.init === "function" && typeof window.Pi.authenticate === "function");
  }

  function sandboxEnabled() {
    try {
      const u = new URL(window.location.href);
      const qs = u.searchParams.get("sandbox");
      if (qs === "true") return true;
      if (qs === "false") return false;
    } catch (e) {}
    return localStorage.getItem("wcg_sandbox") === "true";
  }

  function persistSandboxFromQuery() {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get("sandbox") === "true") localStorage.setItem("wcg_sandbox", "true");
      if (u.searchParams.get("sandbox") === "false") localStorage.setItem("wcg_sandbox", "false");
    } catch (e) {}
  }

  async function getSession() {
    const r = await fetch("/api/session", { method: "GET" });
    if (!r.ok) return { loggedIn: false };
    return await r.json();
  }

  async function renderSession() {
    const s = await getSession();
    sessionEl.textContent = JSON.stringify(s, null, 2);
    if (s.loggedIn) setStatus("Signed in as " + s.username, "ok");
    else setStatus("Not signed in", "bad");
  }

  async function authenticateWithPi() {
    if (!window.Pi) throw new Error("Pi SDK not available (window.Pi missing). Must open inside Pi Browser.");
    if (typeof window.Pi.init !== "function") throw new Error("Pi SDK present but Pi.init is not a function.");
    if (typeof window.Pi.authenticate !== "function") throw new Error("Pi SDK present but Pi.authenticate is not a function.");

    const SANDBOX = sandboxEnabled();

    // REQUIRED by Pi App Studio: await Pi.init(...) fully before calling Pi.authenticate(...)
    await window.Pi.init({ version: "2.0", sandbox: SANDBOX });

    const authResult = await window.Pi.authenticate(["username"], function () { return {}; });
    const accessToken = authResult && authResult.accessToken;
    if (!accessToken) throw new Error("Missing accessToken from Pi.authenticate() result");

    const r = await fetch("/api/auth/pi", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ accessToken: accessToken })
    });

    let data = {};
    try { data = await r.json(); } catch (e) {}

    if (!r.ok || !data.ok) throw new Error((data && data.error) ? data.error : "Backend auth failed");
    return data;
  }

  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
      headers: csrfHeaders(),
    });
    await renderSession();
  }

  function wireUi() {
    btnSignIn.onclick = async function () {
      try {
        logDebug({
          action: "sign-in-click",
          hasPi: !!window.Pi,
          hasPiSdk: hasPiSdk(),
          url: window.location.href,
          sandbox: sandboxEnabled()
        });

        const result = await authenticateWithPi();
        logDebug({ ok: true, action: "sign-in-result", result: result });

        await renderSession();
      } catch (e) {
        logDebug({ ok: false, action: "sign-in-error", error: String(e && e.message ? e.message : e) });
        await renderSession();
      }
    };

    btnLogout.onclick = async function () {
      try {
        logDebug({ action: "logout-click" });
        await logout();
        logDebug({ ok: true, action: "logout-ok" });
      } catch (e) {
        logDebug({ ok: false, action: "logout-error", error: String(e && e.message ? e.message : e) });
      }
    };
  }

  async function onLoad() {
    persistSandboxFromQuery();

    // Fetch CSRF token first so subsequent POSTs work
    await fetchCsrfToken();

    // Always render session first
    await renderSession();

    // Show SDK status immediately
    logDebug({
      note: "loaded",
      hasPi: !!window.Pi,
      hasPiSdk: hasPiSdk(),
      sandbox: sandboxEnabled(),
      userAgent: navigator.userAgent
    });

    // Auto-auth attempt (required), but non-fatal
    try {
      const s = await getSession();
      if (!s.loggedIn) {
        logDebug({ note: "auto-auth-start", hasPi: !!window.Pi, hasPiSdk: hasPiSdk() });
        await authenticateWithPi();
        logDebug({ note: "auto-auth-ok" });
        await renderSession();
      }
    } catch (e) {
      logDebug({
        note: "auto-auth-failed-or-cancelled",
        error: String(e && e.message ? e.message : e),
        hasPi: !!window.Pi,
        hasPiSdk: hasPiSdk()
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      if (!btnSignIn || !btnLogout || !debugEl || !sessionEl || !statusEl) {
        throw new Error("Missing required DOM elements. Check index.html ids.");
      }
      wireUi();
      onLoad();
    } catch (e) {
      logDebug({ fatal: true, error: String(e && e.message ? e.message : e) });
    }
  });
})();
