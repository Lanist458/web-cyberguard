// public/main.js (drop-in replacement)
// Fix: Pi SDK often doesn't like <script type="module"> in some WebView contexts.
// This version is plain JS (no module), avoids optional chaining, and adds hard diagnostics.
// REQUIREMENT: await Pi.init(...) before Pi.authenticate(...), use ["username"] scope.

(function () {
  function $(id) { return document.getElementById(id); }

  var debugEl = $("debug");
  var sessionEl = $("session");
  var statusEl = $("status");
  var btnSignIn = $("btnSignIn");
  var btnLogout = $("btnLogout");

  function logDebug(obj) {
    try {
      debugEl.textContent = (typeof obj === "string") ? obj : JSON.stringify(obj, null, 2);
    } catch (e) {
      debugEl.textContent = String(obj);
    }
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = cls || "muted";
  }

  // Sandbox flag (optional): ?sandbox=true or localStorage wcg_sandbox=true
  function isSandboxEnabled() {
    try {
      var u = new URL(window.location.href);
      var qs = u.searchParams.get("sandbox");
      if (qs === "true") return true;
      if (qs === "false") return false;
    } catch (e) {}
    return (localStorage.getItem("wcg_sandbox") === "true");
  }

  function persistSandboxFromQuery() {
    try {
      var u = new URL(window.location.href);
      if (u.searchParams.get("sandbox") === "true") localStorage.setItem("wcg_sandbox", "true");
      if (u.searchParams.get("sandbox") === "false") localStorage.setItem("wcg_sandbox", "false");
    } catch (e) {}
  }

  var SANDBOX = isSandboxEnabled();

  async function getSession() {
    var r = await fetch("/api/session", { method: "GET" });
    if (!r.ok) return { loggedIn: false };
    return await r.json();
  }

  async function renderSession() {
    var s = await getSession();
    sessionEl.textContent = JSON.stringify(s, null, 2);
    if (s.loggedIn) setStatus("Signed in as " + s.username + (SANDBOX ? " (SANDBOX)" : ""), "ok");
    else setStatus("Not signed in" + (SANDBOX ? " (SANDBOX)" : ""), "bad");
  }

  function assertPiAvailable() {
    if (!window.Pi) throw new Error("Pi SDK not available (window.Pi missing). Open inside Pi Browser.");
    if (typeof window.Pi.init !== "function") throw new Error("Pi SDK present but Pi.init is not a function.");
    if (typeof window.Pi.authenticate !== "function") throw new Error("Pi SDK present but Pi.authenticate is not a function.");
  }

  async function authenticateWithPi() {
    assertPiAvailable();

    // REQUIRED: await Pi.init as Promise
    await window.Pi.init({ version: "2.0", sandbox: SANDBOX });

    // REQUIRED: username scope
    var authResult = await window.Pi.authenticate(["username"], function () { return {}; });

    var accessToken = authResult && authResult.accessToken;
    if (!accessToken) throw new Error("Missing accessToken from Pi.authenticate() result");

    var r = await fetch("/api/auth/pi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: accessToken })
    });

    var data = {};
    try { data = await r.json(); } catch (e) {}

    if (!r.ok || !data.ok) throw new Error((data && data.error) ? data.error : "Backend auth failed");

    return data;
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    await renderSession();
  }

  function wireUi() {
    if (!btnSignIn) throw new Error("btnSignIn not found in DOM");
    if (!btnLogout) throw new Error("btnLogout not found in DOM");
    if (!debugEl || !sessionEl || !statusEl) throw new Error("Required UI elements missing");

    btnSignIn.onclick = async function () {
      try {
        logDebug({ action: "sign-in-click", sandbox: SANDBOX, hasPi: !!window.Pi });
        await authenticateWithPi();
        await renderSession();
        logDebug({ ok: true, message: "Sign-in OK" });
      } catch (e) {
        logDebug({ ok: false, error: String(e && e.message ? e.message : e) });
        await renderSession();
      }
    };

    btnLogout.onclick = async function () {
      try {
        logDebug({ action: "logout-click" });
        await logout();
        logDebug({ ok: true, message: "Logged out" });
      } catch (e) {
        logDebug({ ok: false, error: String(e && e.message ? e.message : e) });
      }
    };
  }

  async function autoAuth() {
    try {
      persistSandboxFromQuery();
      SANDBOX = isSandboxEnabled();

      logDebug({
        note: "App loaded",
        sandbox: SANDBOX,
        userAgent: navigator.userAgent,
        hasPi: !!window.Pi
      });

      await renderSession();
      var s = await getSession();
      if (!s.loggedIn) {
        // Auto-auth on load (required), but don't block UI
        logDebug({ note: "Auto-auth starting…", hasPi: !!window.Pi, sandbox: SANDBOX });
        await authenticateWithPi();
        logDebug({ ok: true, note: "Auto-auth success" });
      }
      await renderSession();
    } catch (e) {
      logDebug({
        note: "Auto-auth failed/cancelled. Use Sign in button.",
        error: String(e && e.message ? e.message : e),
        hasPi: !!window.Pi
      });
      await renderSession();
    }
  }

  // Start after DOM ready; avoids binding failures in some WebViews
  document.addEventListener("DOMContentLoaded", function () {
    try {
      wireUi();
      autoAuth();
    } catch (e) {
      logDebug({ fatal: true, error: String(e && e.message ? e.message : e) });
    }
  });
})();
