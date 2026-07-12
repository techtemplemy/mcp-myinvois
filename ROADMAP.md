# Roadmap

Vision: "set credentials once, throw a PDF at it, get a validated LHDN e-invoice."

## Phase 0  API foundation ✅
Zero-dep Node CLI (`skills/myinvois/scripts/myinvois.mjs`) covering the full
official API surface (verified against LHDN's official Postman collection in
`postman/`): token (+ intermediary onbehalfof), validate/search TIN, submit,
submission polling, document/raw/details, recent, cancel, reject, doctypes.

## Phase 1  guided setup ✅ (via the Claude skill)
SKILL.md walks a new user through: getting sandbox credentials (self-service
ERP registration), `~/.myinvois.env`, and a one-time supplier profile
(`~/.myinvois-profile.json`) holding all static seller fields + running
invoice number.

## Phase 2  PDF → e-invoice ✅ (inside Claude Code)
No OCR/ML infra needed: Claude reads the PDF, extracts buyer + lines + totals,
looks up/validates the buyer TIN, merges with the supplier profile into UBL
JSON, shows a confirmation summary, submits, returns the share link.
**Pending: live end-to-end test once sandbox credentials exist.**

## Phase 3  mapping web UI (next)
Seed exists: `docs/setup-guide.html`  a self-contained "Setup Invois" page
(mock portal screens with click markers, progress checklist in localStorage,
local .env + supplier-profile generators), served by `docs/serve.mjs`.
Next, grow it into a small local web app for non-Claude users / batch use:
- Refactor `myinvois.mjs` into `lib` (importable) + thin CLI.
- Single-page app: drop PDF/CSV → extraction (Claude API call) → side-by-side
  "extracted value ↔ UBL field" mapping table, editable → submit → status +
  QR/share link.
- Mapping presets saved per buyer (repeat customers auto-fill).

## Phase 3.5  MCP server ✅ (built + live-tested 2026-07-11)
`mcp-myinvois` (npm, repo root package; renamed from myinvois-mcp  name was taken): `lib/core.mjs` + `lib/ubl.mjs` shared core,
`mcp/server.mjs` stdio server on @modelcontextprotocol/sdk. 11 tools, two-step
draft→confirm submission (one-time token, 10-min TTL), ERR236 pre-flight guard,
sandbox default. End-to-end test submitted INV-2026-0003 → Valid via MCP.
Remaining to publish: npm account login → `npm publish`, then list on MCP
registries (official registry, Smithery, PulseMCP). Decision: no custom portal
until non-Claude users need to issue invoices.

## Phase 4  later
- Invoice v1.1 XAdES digital signature (needed for some scenarios; requires
  taxpayer soft cert).
- Consolidated monthly invoice helper (aggregate receipts → one 
  EI00000000010 invoice).
- Credit/debit/refund note flows with BillingReference to original UUID.
- MCP wrapper around `lib` if the toolkit is needed outside Claude Code.
