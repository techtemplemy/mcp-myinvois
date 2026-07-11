---
name: myinvois
description: Submit, check, and cancel Malaysia LHDN e-invoices (MyInvois / e-Invois) via the official API — including turning an invoice PDF into a submitted e-invoice. Use when the user mentions Malaysia e-invoice, einvois, MyInvois, LHDN, TIN validation/search, or wants to submit an invoice PDF to LHDN.
---

# MyInvois (Malaysia LHDN e-Invoice)

Zero-dependency Node CLI wrapping the official MyInvois API (sandbox + production),
plus a guided workflow to turn a plain invoice PDF into a validated e-invoice.

## First-run setup (guide the user step by step)

Two files, created once:

**1. Credentials — `~/.myinvois.env`:**
```
MYINVOIS_CLIENT_ID=...
MYINVOIS_CLIENT_SECRET=...
MYINVOIS_ENV=sandbox        # sandbox | prod
# MYINVOIS_ONBEHALF=<taxpayer TIN>   # only for intermediaries
```
If missing, walk the user through getting credentials:
- Sandbox: https://preprod-mytax.hasil.gov.my → MyInvois portal → Taxpayer
  Profile → **Register ERP** → copy Client ID + Secret.
- Production: same flow via https://mytax.hasil.gov.my (separate credentials).
Then verify with the `token` command.

**2. Supplier profile — `~/.myinvois-profile.json`** (the seller's static details,
asked once, reused on every invoice):
```json
{
  "tin": "C1234567890",
  "brn": "201901234567",
  "sst": "NA",
  "ttx": "NA",
  "msic": "62010",
  "businessActivity": "Software development",
  "name": "EXAMPLE SDN BHD",
  "address": { "line1": "...", "city": "...", "postcode": "50000", "stateCode": "14" },
  "phone": "+60123456789",
  "email": "billing@example.com",
  "nextInvoiceNumber": "INV-2026-0001"
}
```
Collect these conversationally if the file doesn't exist. State codes and MSIC
guidance are in `references/api.md`.

## Commands

Run with: `node <this-skill-dir>/scripts/myinvois.mjs <command> [args]`

| Command | What it does |
|---|---|
| `token` | Get/cache an access token (~55 min). Good connectivity test. |
| `validate-tin <TIN> <idType> <idValue>` | Verify a TIN matches an ID. idType: NRIC, BRN, PASSPORT, ARMY. |
| `search-tin <idType> <idValue> [name...]` | Reverse lookup: find a TIN from NRIC/BRN/name. Use `-` to skip a param. 60 RPM limit. |
| `submit <invoice.json> [--stamp]` | Hash + base64 + submit UBL JSON. `--stamp` sets IssueDate/Time to now UTC (recommended). |
| `submission <submissionUid>` | Poll a submission until processed. |
| `document <uuid>` | Document details incl. validation results and `longId`. |
| `raw <uuid>` | Raw document source + metadata. |
| `recent [key=value ...]` | Last-31-days documents, e.g. `recent direction=Sent status=Valid`. |
| `cancel <uuid> <reason>` | Issuer cancels a valid document (72h window). |
| `reject <uuid> <reason>` | Buyer rejects a received document (72h window). |
| `doctypes` | List document types/versions published by LHDN. |

All commands print JSON to stdout; errors exit non-zero. Full curl equivalents:
`references/curls.md`. Official Postman collection: `postman/` in the repo root.

## Workflow A — invoice from a PDF (or image/text)

When the user provides an invoice PDF, YOU are the extraction engine:

1. Ensure setup is done (credentials + supplier profile above).
2. Read the PDF. Extract: invoice number, buyer (name, TIN/BRN if printed,
   address, contact), line items (description, qty, unit price, amount),
   tax type/amount, totals.
3. If the buyer's TIN is missing, try `search-tin` with their BRN or NRIC;
   if that fails ask the user. Then `validate-tin` before submitting.
4. Fill `templates/invoice-v1.0.json`: supplier block from the profile, buyer +
   lines from the PDF. Rules in `references/api.md` (state codes, tax category,
   CLASS codes, `ItemPriceExtension` mandatory, 2-decimal amounts).
5. **Show the user a compact summary table (buyer, lines, totals, tax) and get
   an explicit yes before submitting** — this is a legal tax document.
6. `submit <file> --stamp`, then `submission <uid>` until Valid.
7. Report the validation link `{portal}/{uuid}/share/{longId}` (from
   `document <uuid>`), and bump `nextInvoiceNumber` in the profile.

If validation fails, read the error codes in the submission response, fix the
JSON, and resubmit (new invoice numbers are NOT needed for rejected docs —
rejected documents never existed; only change the number if LHDN reports a
duplicate codeNumber).

## Workflow B — manual / scripted

Copy the template, fill placeholders, `submit --stamp`, poll, share link.
Same as A from step 4.

## Notes

- Invoice **version 1.0** needs no digital signature. v1.1 requires XAdES
  signing with a taxpayer certificate — not implemented yet.
- Token calls are rate-limited: the script caches tokens, don't bypass it.
- Credit (02) / debit (03) / refund (04) notes: same flow, change
  `InvoiceTypeCode` and reference the original in `BillingReference`.
- Consolidated invoice: buyer TIN `EI00000000010`, name "General Public".
- Official docs: https://sdk.myinvois.hasil.gov.my/
