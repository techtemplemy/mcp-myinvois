---
name: myinvois
description: Submit, check, and cancel Malaysia LHDN e-invoices (MyInvois / e-Invois) via the official API — guided setup, back-office config (supplier profile, client book), and turning an invoice PDF into a validated e-invoice. Use when the user mentions Malaysia e-invoice, einvois, MyInvois, LHDN, TIN validation/search, or wants to submit an invoice PDF to LHDN.
---

# MyInvois (Malaysia LHDN e-Invoice)

Zero-dependency Node CLI wrapping the official MyInvois API (sandbox + production).
**This folder is fully standalone** — copy or symlink it into `~/.claude/skills/`
and it works without the rest of the repo (no npm install, Node ≥ 18 only).
A visual companion guide with the same flow lives at `docs/setup-guide.html`
in the repo (plain static HTML — users can just double-click it).

Everything is three phases. Detect where the user is and start there:

| Phase | Have they done it? | Workflow |
|---|---|---|
| 1 · Access | `~/.myinvois.env` exists and `token` works | Setup |
| 2 · Back office | `~/.myinvois-profile.json` complete (no FILL_ME), optionally `~/.myinvois-clients.json` | Configure |
| 3 · Generate | — (repeats every invoice) | Generate & send |

## Commands

Run with: `node <this-skill-dir>/scripts/myinvois.mjs <command> [args]`

| Command | What it does |
|---|---|
| `token` | Get/cache an access token (~55 min). Good connectivity test. |
| `validate-tin <TIN> <idType> <idValue>` | Verify a TIN matches an ID. idType: NRIC, BRN, PASSPORT, ARMY. |
| `search-tin <idType> <idValue> [name...]` | Reverse lookup: TIN from NRIC/BRN/name. `-` skips a param. 60 RPM limit. |
| `submit <invoice.json> [--stamp]` | Hash + base64 + submit UBL JSON. `--stamp` re-dates to now−5min UTC (always use it; LHDN rejects future/stale times). |
| `submission <submissionUid>` | Poll a submission until processed. |
| `document <uuid>` | Details incl. validation results and `longId`. |
| `raw <uuid>` | Raw document source + metadata. |
| `recent [key=value ...]` | Last-31-days documents, e.g. `recent direction=Sent status=Valid`. |
| `cancel <uuid> <reason>` | Issuer cancels a valid document (72h window). |
| `reject <uuid> <reason>` | Buyer rejects a received document (72h window). |
| `doctypes` | Document types/versions published by LHDN. |

All print JSON to stdout; errors exit non-zero. Curl equivalents: `references/curls.md`.
Field rules, state/tax/CLASS codes, common rejections: `references/api.md`.

## Phase 1 — Setup: company-specific access

Goal: a working `~/.myinvois.env`. Walk the user through, one step at a time:

1. Sandbox portal: https://preprod-mytax.hasil.gov.my — log in with personal ID.
2. **Switch the role dropdown to the COMPANY** (critical — an ERP registered
   under the personal profile owns the wrong TIN and every company invoice
   fails with "authenticated TIN and documents TIN is not matching").
3. MyInvois portal → Taxpayer Profile → **Register ERP** → Client ID + Secret
   (secret shown once).
4. Write `~/.myinvois.env`:
   ```
   MYINVOIS_CLIENT_ID=...
   MYINVOIS_CLIENT_SECRET=...
   MYINVOIS_ENV=sandbox        # sandbox | prod
   # MYINVOIS_ONBEHALF=<taxpayer TIN>   # intermediaries only
   ```
5. Verify: `token`, then `validate-tin <their TIN> BRN <their BRN>`.

Production later: same flow on https://mytax.hasil.gov.my, separate credentials,
flip `MYINVOIS_ENV=prod`.

## Phase 2 — Back office: supplier, clients, invoice defaults

**Supplier profile — `~/.myinvois-profile.json`** (collect conversationally,
validate TIN+BRN via API before saving):

```json
{
  "tin": "C1234567890", "brn": "202001234567", "sst": "NA", "ttx": "NA",
  "msic": "62010", "businessActivity": "Software development",
  "name": "EXAMPLE SDN BHD",
  "address": { "line1": "...", "city": "...", "postcode": "50000", "stateCode": "14" },
  "phone": "+60123456789", "email": "billing@example.com",
  "nextInvoiceNumber": "INV-2026-0001"
}
```

**Client book — `~/.myinvois-clients.json`** (`{"clients":[{name,tin,idType,idValue,email?,address?}]}`).
When the user names a buyer, look them up here first. When a new business buyer
appears: get their BRN → `search-tin` → `validate-tin` → offer to save them.
Consumers who don't request an e-invoice don't go in the book — they belong in
the monthly consolidated invoice (buyer TIN `EI00000000010`, CLASS `004`).

## Phase 3 — Generate & send (every invoice)

**From the user's own PDF** (preferred): read the PDF; extract invoice number,
buyer, line items (description, qty, unit price), tax, totals. The PDF must
minimally contain: unique invoice number, line items, buyer name (+ TIN/BRN for
business buyers unless in the client book), totals + SST if charged. Seller
details always come from the profile, never the PDF. Missing data → ask, don't
guess.

**From chat details**: same, just collect the fields conversationally.

**Self-billed (foreign vendor receipt, e.g. OpenAI/Hostinger)**: type `11`;
the vendor is the supplier with generic TIN `EI00000000030`, registration `NA`,
their real country code; the user's company is the buyer. Deadline: end of the
month after payment.

Then, for all cases:

1. Fill `templates/invoice-v1.0.json` (profile → supplier block; extracted
   data → buyer + lines). Rules in `references/api.md`. General Public buyer
   requires CLASS `004` on every line (LHDN ERR236).
2. **Show a compact summary table (buyer, lines, totals, tax) and get an
   explicit yes before submitting** — this is a legal tax document.
3. `submit <file> --stamp` → `submission <uid>` until Valid.
4. Deliver: validation link `{portal}/{uuid}/share/{longId}` (from
   `document <uuid>`; portal = preprod.myinvois.hasil.gov.my or
   myinvois.hasil.gov.my). Offer a QR image: `npx qrcode "<link>" -o invoice-qr.png`.
   The user sends their client the original PDF + link/QR.
5. Bump `nextInvoiceNumber` in the profile — but only if the document
   validated (Invalid documents never existed; their number is reusable).

If validation fails, read the error details from `document <uuid>`, fix, resubmit.

## Notes

- Invoice version 1.0 needs no digital signature (v1.1 = XAdES, not implemented).
- Token calls are rate-limited; the script caches tokens — don't bypass it.
- Credit (02) / debit (03) / refund (04) notes: same flow + `BillingReference`
  to the original document UUID.
- Official docs: https://sdk.myinvois.hasil.gov.my/
