# MyInvois API quick reference

Official SDK docs: https://sdk.myinvois.hasil.gov.my/

## Base URLs

| Env | API | Portal |
|---|---|---|
| Sandbox | https://preprod-api.myinvois.hasil.gov.my | https://preprod.myinvois.hasil.gov.my (login via https://preprod-mytax.hasil.gov.my) |
| Production | https://api.myinvois.hasil.gov.my | https://myinvois.hasil.gov.my (login via https://mytax.hasil.gov.my) |

## Endpoints used by the CLI

| Purpose | Method + path |
|---|---|
| Token | `POST /connect/token` (form: client_id, client_secret, grant_type=client_credentials, scope=InvoicingAPI) |
| Validate TIN | `GET /api/v1.0/taxpayer/validate/{tin}?idType={NRIC\|BRN\|PASSPORT\|ARMY}&idValue={value}` → 200 valid, 404 invalid |
| Submit documents | `POST /api/v1.0/documentsubmissions`  body `{documents:[{format:"JSON", codeNumber, documentHash: sha256hex, document: base64}]}` |
| Submission status | `GET /api/v1.0/documentsubmissions/{submissionUid}`  overallStatus: InProgress / Valid / Partially Valid / Invalid |
| Document details | `GET /api/v1.0/documents/{uuid}/details`  includes validation results and `longId` |
| Cancel | `PUT /api/v1.0/documents/state/{uuid}/state`  body `{status:"cancelled", reason}` (within 72h of validation) |

Validation/share link: `{portal}/{uuid}/share/{longId}`

## Document type codes (`InvoiceTypeCode`)

| Code | Type |
|---|---|
| 01 | Invoice |
| 02 | Credit note |
| 03 | Debit note |
| 04 | Refund note |
| 11–14 | Self-billed variants of 01–04 |

`listVersionID`: `1.0` (no signature) or `1.1` (requires XAdES digital signature).

## Frequently-hit field rules

- **IssueDate/IssueTime** must be UTC and recent (LHDN rejects documents whose
  issue time is too far in the past/future)  use the CLI `--stamp` flag.
- **CountrySubentityCode** = Malaysian state code (2 digits): 01 Johor, 02 Kedah,
  03 Kelantan, 04 Melaka, 05 Negeri Sembilan, 06 Pahang, 07 Pulau Pinang,
  08 Perak, 09 Perlis, 10 Selangor, 11 Terengganu, 12 Sabah, 13 Sarawak,
  14 W.P. Kuala Lumpur, 15 W.P. Labuan, 16 W.P. Putrajaya, 17 Not applicable.
- **IndustryClassificationCode** = supplier's 5-digit MSIC code (required with
  `name` attribute describing the business activity).
- **PartyIdentification** needs TIN plus one of BRN/NRIC/PASSPORT/ARMY; SST and
  TTX registration numbers use literal `"NA"` when not registered.
- **Tax category IDs**: 01 sales tax, 02 service tax, 03 tourism tax,
  04 high-value goods tax, 05 low-value goods tax, 06 not applicable, E exempt.
- **ItemClassificationCode** (`listID:"CLASS"`): 3-digit LHDN classification,
  e.g. 022 others; general buyer TIN for consolidated invoices is
  `EI00000000010`, foreign buyer `EI00000000020`.
- **unitCode**: UN/ECE Rec 20, `C62` = piece/unit.
- Amounts: max 2 decimals for MYR; `TaxInclusiveAmount` = `TaxExclusiveAmount`
  + total tax; line `ItemPriceExtension/Amount` is mandatory (subtotal before
  line discount).

## Common rejection causes

- `"The authenticated TIN and documents TIN is not matching"` on submit →
  the ERP credentials belong to a different taxpayer than the supplier TIN in
  the document. Classic cause: registering the ERP while the portal was in
  your *personal* profile (individual `IG…` TIN) instead of the company role.
  Diagnose by decoding the JWT: the `name` claim starts with the owning TIN.
  Fix: log in to the portal, switch role to the company, Register ERP again,
  use the new Client ID/Secret.

- Buyer/supplier TIN fails validation → always `validate-tin` first.
- Stale IssueTime → resubmit with `--stamp`.
- Duplicate `codeNumber` (invoice number) within recent submissions.
- Hash mismatch → the exact submitted bytes must hash to `documentHash`
  (the CLI guarantees this; don't re-serialize by hand).
- Missing SST/TTX identifications  include them with `"NA"`.
