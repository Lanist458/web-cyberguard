# Web CyberGuard — Product Requirements Document (PRD)

## 1. Product Summary
**Web CyberGuard** is a Pi Browser-integrated, AI-powered security feature that provides real-time protection against:
- phishing sites and impersonation domains
- scam pages and malicious DApp flows
- malicious scripts and suspicious web behaviors
- scam language patterns in web-based messaging surfaces (where permitted)

**Positioning:** Opt-in security feature users enable.

## 2. Target Users
- Pi Network users browsing DApps in Pi Browser
- Pi DApp developers and ecosystem partners
- Moderation and support teams responding to scam campaigns

## 3. Core User Goals
- Safely browse Pi DApps and links without falling into phishing traps
- Detect suspicious pages before entering credentials or proceeding
- Report new threats and benefit from community-driven protection
- Receive actionable warnings without excessive false positives

## 4. Key Features (MVP → Advanced)
### 4.1 Automated Threat Detection
- Real-time URL risk scoring
- Heuristic detection for typosquatting/homoglyph domains
- Page-template matching for fake login/KYC/support impersonation
- Script fingerprinting for malicious or obfuscated payloads
- Cloud-assisted ML classification for uncertain cases
- “Zero-day” early warning via anomaly + rapid reporting

### 4.2 Dynamic Database Updates (Automatic)
- Signed threat feed updates (default: automatic)
- User-configurable update cadence (weekly to automatic)
- Safe rollback and staged rollout of updates

### 4.3 Scam & Phishing Protection
- URL analysis (known bad, suspicious patterns)
- Content and form analysis (credential harvest patterns)
- NLP-based scam intent classification for web messaging surfaces (opt-in and privacy controlled)

### 4.4 Community Feedback Loop
- One-click “Report Threat”
- Threat report ingestion, clustering, analyst review
- Community-driven signature propagation after validation

### 4.5 Performance Optimization
- Local fast-path heuristics
- Cache and risk-based escalation to cloud
- Low resource usage; avoid blocking UI unless high risk

### 4.6 Alerts & Notifications
- Block / Warn / Info levels
- Explainable reason tags
- Recommended next steps (close tab, verify official domain, report)

## 5. UI Requirements (Locked)
### 5.1 Settings
- Profile: PN username, full name, email, nationality, residence, contact number (recommend optional fields unless CT requires)
- 2FA: SMS + biometric (fingerprint/face where supported)
- Dark/Light mode
- Free lifetime + donation support
- T&C, Privacy Policy, Support

### 5.2 Dashboard
- Real-time monitoring panel + notification settings
- Manual scans: Quick Scan / Full Scan
- Actions upon detection: Quarantine, Delete/Remove
- Update schedule selector (weekly → automatic)

## 6. Non-Functional Requirements
- Privacy-by-design; never collect seed phrases/private keys
- Signed updates and integrity validation
- High availability backend
- Audit logs and incident response workflow
