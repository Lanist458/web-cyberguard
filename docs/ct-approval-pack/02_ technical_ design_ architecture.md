# Web CyberGuard — Technical Design & Architecture

## 1. Guiding Principles
- Defense-in-depth (heuristics + ML + deep analysis)
- Local-first decisions; cloud escalation only when required
- Signed threat intelligence and update artifacts
- Privacy-preserving telemetry and reporting
- Opt-in user enablement, clear user controls

## 2. Architecture Overview
### Client-side (Pi Browser integrated)
- Navigation monitor (URL loads / redirect chains)
- Content analyzer (DOM, scripts) where permitted
- Policy engine: scoring + enforcement (block/warn/safe view)
- Local threat cache + update manager
- Reporting module
- UI: dashboard, settings, alerts

### Cloud Threat Intelligence
- Threat Intel API (score URL, lookup IOCs)
- Report Intake API
- Analysis workers:
  - headless detonation
  - content fingerprinting
  - clustering/campaign detection
- Update publishing service (signed bundles)
- Analyst console for validation & moderation

## 3. Integration Modes (CT decision)
### Mode A: Official Pi Browser Security Module (preferred)
Requires CT-provided hooks for:
- URL navigation events
- ability to block/warn before page load
- limited DOM/script access for detection
- safe UI overlays and/or safe rendering mode

### Mode B: Official Security DApp (fallback)
Provides:
- link verification and safe navigation guidance
- reporting and transparency features
Enforcement is weaker without deep browser hooks.

## 4. “Scan” Definitions Inside Pi Browser
Because Pi Browser is not an OS-level antivirus environment:

- Quick Scan: current page/DApp (URL, DOM, scripts, forms)
- Full Scan: recent pages/DApps + storage/caches within app scope (only what Pi Browser exposes)

Quarantine/Delete map to:
- blocklist/isolate site and disable scripts (quarantine)
- clear site storage & revoke permissions within browser scope (delete/remove)

## 5. Update & Signature Model
- Threat feeds and rule updates are delivered as signed bundles
- Clients verify signatures before applying updates
- Canary rollout supported; rollback supported

## 6. Observability & Abuse Controls
- Rate-limiting on reports
- Reputation scoring for reporters (optional)
- Monitoring false positives/negatives and model drift
