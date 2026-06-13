# Web CyberGuard — Transparency (Donations + Spending)

## 1. Objective
Provide public accountability for maintenance donations and spending while Pi governance is evolving.

## 2. UX (Locked)
Tabs:
- Overview
- Donations (Incoming)
- Spending (Outgoing)
- Proofs & Exports

## 3. Spending Verification (2-of-3)
Spending entries are “Verified” when at least 2 signatures are valid from:
- `ops_maintainer`
- `sec_lead`
- `community_auditor` (interim: Mega Moderator-appointed auditor)

## 4. Signed Spending Statement
- RFC 8785 canonical JSON payload
- SHA-256 payload hash
- Ed25519 signatures
- `registryVersionUsed` stored as a flexible string

## 5. Open-Source Tooling
A CLI and library verify statements and allow third parties to independently audit spending entries.
