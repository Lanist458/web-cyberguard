# Web CyberGuard — Privacy & Client Personal Data Protection

## 1. Privacy-by-Design
- Default local processing where possible
- Minimal telemetry by default
- Opt-in for sending full content/screenshots for deep analysis
- Encryption in transit (TLS) and at rest
- Explicit retention policy and user controls

## 2. Data We Must Never Collect
- seed phrases
- private keys
- raw authentication secrets

## 3. Data We May Collect (Minimized)
### For threat detection (default)
- URL + derived features (hashes/fingerprints)
- threat event metadata (timestamp, risk score, reason tags)
### Optional / explicit opt-in
- screenshot or full HTML for analyst verification

## 4. Profile Fields in Settings
Requested fields: PN username, full name, email, nationality, residence, phone.
Recommendation:
- make non-essential fields optional
- store securely
- provide “Delete my data” and “Export my data” controls

## 5. 2FA
- biometric via OS APIs where available
- SMS as fallback (note: weaker vs SIM-swap)
