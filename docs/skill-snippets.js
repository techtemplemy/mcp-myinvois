// Granular skill.md excerpts, one per journey. The "copy skill instructions"
// button on each guide page copies these — paste into any AI assistant
// (Claude, or others) as working instructions for that journey.
window.SKILL_SNIPPETS = {

access: '# MyInvois skill — journey 1: get API access (one-time only)\n\
\n\
You are helping a Malaysian taxpayer get MyInvois (LHDN e-invoice) API\n\
credentials. Guide them step by step; open portal pages for them when you can.\n\
\n\
1. Sandbox portal: https://preprod-mytax.hasil.gov.my — log in with personal\n\
   ID (first time: use "First Time Login" to activate the sandbox account).\n\
2. CRITICAL: switch the role dropdown to the COMPANY before anything else.\n\
   An ERP registered under the personal profile owns the wrong TIN — every\n\
   company invoice later fails with "authenticated TIN and documents TIN is\n\
   not matching", and they must re-register.\n\
3. MyInvois portal -> Taxpayer Profile -> Register ERP (any name, longest\n\
   secret expiry). Client ID + Secret are shown ONCE — copy both immediately.\n\
4. Save to ~/.myinvois.env:\n\
   MYINVOIS_CLIENT_ID=...\n\
   MYINVOIS_CLIENT_SECRET=...\n\
   MYINVOIS_ENV=sandbox\n\
5. Verify. CLI (clone https://github.com/techtemplemy/e-invoice-malaysia-mcp):\n\
   node skills/myinvois/scripts/myinvois.mjs token\n\
   node skills/myinvois/scripts/myinvois.mjs validate-tin <TIN> BRN <BRN>\n\
   Or MCP: validate_tin via `npx -y e-invoice-malaysia-mcp`.\n\
\n\
Production later: same flow at https://mytax.hasil.gov.my (separate keys),\n\
then MYINVOIS_ENV=prod. Never mix sandbox and production credentials.\n',

configure: '# MyInvois skill — journey 2: configure & setup (one-time only)\n\
\n\
Collect the seller’s details conversationally and VALIDATE the TIN+BRN pair\n\
against LHDN before saving (CLI validate-tin, or MCP validate_tin).\n\
\n\
Write ~/.myinvois-profile.json (the seller — reused on every invoice):\n\
{ "tin":"C...", "brn":"...", "sst":"NA", "ttx":"NA",\n\
  "msic":"5-digit MSIC code", "businessActivity":"one line",\n\
  "name":"REGISTERED COMPANY NAME",\n\
  "address":{"line1":"...","city":"...","postcode":"...","stateCode":"01-17"},\n\
  "phone":"+60...", "email":"...", "nextInvoiceNumber":"INV-2026-0001" }\n\
\n\
Write ~/.myinvois-clients.json (who they bill):\n\
{ "clients":[ {"name":"...","tin":"C...","idType":"BRN","idValue":"...","email":"..."} ] }\n\
\n\
New business buyer: ask for their BRN -> search-tin (reverse lookup) ->\n\
validate-tin -> offer to save to the client book.\n\
Consumers who don’t request an e-invoice do NOT go in the book — they belong\n\
in a monthly consolidated invoice (buyer TIN EI00000000010, classification 004).\n',

submit: '# MyInvois skill — journey 3: submit an e-invoice\n\
\n\
From the user’s PDF (or chat details) extract: invoice number, buyer, line\n\
items (description, qty, unit price), tax, totals. Seller details always come\n\
from ~/.myinvois-profile.json — never the PDF. Missing data -> ask, don’t guess.\n\
\n\
Buyer TIN: check ~/.myinvois-clients.json first; else search-tin from their\n\
BRN, then validate-tin. General Public buyer (EI00000000010) requires\n\
classification code 004 on every line (LHDN rule ERR236).\n\
\n\
ALWAYS show a summary table (buyer, lines, totals, tax) and get an explicit\n\
yes BEFORE submitting — this is a legal tax document.\n\
\n\
CLI:  submit invoice.json --stamp   then   submission <submissionUid>\n\
MCP:  draft_invoice -> confirm_submission (two-step, one-time token)\n\
\n\
Afterwards deliver the validation link {portal}/{uuid}/share/{longId} and a\n\
QR image (npx qrcode "<link>" -o qr.png) for the user to email their client.\n\
Bump nextInvoiceNumber in the profile ONLY if the document came back Valid.\n',

check: '# MyInvois skill — journey 4: check, cancel, reject\n\
\n\
Document statuses: Submitted (processing), Valid, Invalid, Cancelled.\n\
\n\
CLI:  recent direction=Sent status=Valid\n\
      document <uuid>            (full details + share-link longId)\n\
      cancel <uuid> <reason>     (issuer, within 72h of validation)\n\
      reject <uuid> <reason>     (buyer side, within 72h)\n\
MCP:  list_recent_documents, get_document, cancel_document, reject_document.\n\
\n\
Rules: after the 72h window, fix mistakes with a credit note (type 02)\n\
referencing the original UUID instead of cancelling. Documents that came back\n\
Invalid never legally existed — their invoice numbers may be reused. The\n\
verify link {portal}/{uuid}/share/{longId} opens without any login.\n\
Confirm with the user before any cancel or reject.\n',

selfbill: '# MyInvois skill — journey 5: self-billed e-invoice (foreign supplier)\n\
\n\
Foreign vendors (OpenAI, Hostinger, AWS...) never issue Malaysian e-invoices.\n\
To claim the expense the USER issues one on the vendor’s behalf: a\n\
SELF-BILLED invoice, type 11. The roles flip:\n\
- Supplier = the foreign vendor — generic TIN EI00000000030, registration\n\
  number "NA", their real country code (e.g. USA, LTU)\n\
- Buyer = the user’s company, from ~/.myinvois-profile.json\n\
- Deadline: end of the month AFTER payment\n\
\n\
Extract vendor name, amount, currency and date from the receipt; convert to\n\
MYR if needed (ask the user which rate to use). Then the normal flow:\n\
summary -> explicit yes -> submit -> validation link.\n\
MCP: draft_invoice with typeCode "11".\n\
\n\
Warn once: imported services may also trigger reverse-charge service tax —\n\
a separate filing; tell the user to confirm with their accountant.\n',
};
