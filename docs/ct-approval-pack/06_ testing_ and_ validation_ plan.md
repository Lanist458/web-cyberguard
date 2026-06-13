# Web CyberGuard — Testing & Validation Plan

## 1. Test Types
- Unit tests for URL normalization, heuristics, signature verification
- Integration tests: feed updates, rollback, reporting
- E2E tests: navigation to known malicious templates (sandbox)
- Performance tests: latency and memory in Pi Browser context

## 2. Simulated Attacks
- phishing kits (typosquats, redirects, cloaking)
- fake KYC/login templates
- malicious script injection and obfuscation variants
- scam text variations (multi-language)

## 3. Security Validation
- external audit recommended
- supply-chain checks and signed releases
- incident response drills (publisher key compromise, rollback)
