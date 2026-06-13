# Web CyberGuard — Threat Model for Pi Browser Ecosystem

## 1. Primary Threat Categories
1. Phishing (domain impersonation, fake login/KYC)
2. Scam campaigns (social engineering, urgency coercion)
3. Malicious DApps (credential harvesting, hidden flows)
4. Injected scripts (obfuscation, malicious libraries)
5. Redirect cloaking and traffic laundering
6. Community poisoning attempts (fake reports/signature poisoning)

## 2. Attack Trees (Examples)
### A) Fake KYC / Fake Pi login
- user clicks link → clone page → enters credentials/PII → attacker exfiltrates
Mitigations:
- template matching, form pattern detection
- domain similarity/official allowlist
- warn/block before data entry

### B) Malicious DApp with hidden script injection
- DApp loads benign UI + injected obfuscated JS
Mitigations:
- script fingerprinting
- obfuscation heuristics
- cloud detonation and campaign correlation

### C) Report poisoning
- attacker submits大量 fake reports to blacklist competitors
Mitigations:
- quorum validation, reputation scoring
- never auto-promote single-source IOCs

## 3. Trust Boundaries
- Client vs Cloud
- Signed update boundary (critical)
- Admin/analyst access boundary
- Reporter identity boundary (privacy + abuse controls)

## 4. Security Requirements
- No seed phrase collection
- Signed updates with pinned trust keys
- Strict access control for publishing IOCs
- Incident response runbook for compromised publisher key
