# Malaysia e-Invoice (MyInvois) — for humans and their AI

Talk to Claude, get a validated LHDN e-invoice. This repo gives your AI the
skill + MCP tools to handle the whole journey — getting API access on the
hasil.gov.my portal, keeping your company & client records, submitting, and
sending the result to your customer.

> Unofficial · not affiliated with LHDN · you are responsible for your own tax
> submissions. Sandbox by default — nothing touches production unless you opt in.

## Where are you in the journey?

```mermaid
flowchart TD
    A{"Do you have MyInvois<br/>API keys?"} -->|no| B["① Get access<br/>guided portal walkthrough"]
    A -->|yes| C["② Configure once<br/>your company · your clients"]
    B --> C
    C --> D{"Day-to-day"}
    D --> E["③ Submit an e-invoice<br/>new client → purchase → send"]
    D --> F["④ Check invoices<br/>status · history · cancel"]
    D --> G["⑤ Record a supplier bill<br/>self-billed, foreign vendors"]
    E --> H["📧 Email PDF + QR<br/>to your client"]
```

Each step below has a **copy-paste prompt for Claude** and a no-AI fallback.
Prefer clicking through screens? The **[visual setup guide](https://techtemplemy.github.io/e-invoice-malaysia-mcp/setup-guide.html)**
covers ①–③ with mock portal screenshots.

---

## ① Get access — you have no API keys yet

> 💬 **Say to Claude:** *"Use the myinvois skill. I'm new to Malaysia e-invoicing —
> get me MyInvois sandbox API access for my company, step by step. Open the
> portal pages for me as we go."*

Claude walks you through the LHDN portal (it can open the hasil.gov.my pages
in a browser alongside you), warns you about the two traps everyone hits
(registering under your *personal* profile instead of the company; clock-skew
rejections), saves your keys to `~/.myinvois.env`, and proves the connection
with a live token call.

*No AI?* Follow [setup guide phase 1](https://techtemplemy.github.io/e-invoice-malaysia-mcp/setup-guide.html) — it generates the `.env` file for you.

## ② Configure once — you have keys

> 💬 **Say to Claude:** *"Use the myinvois skill. I already have my MyInvois
> client ID and secret — set up my credentials, my company profile, and my
> client book."*

Claude collects your seller details (TIN, BRN, MSIC, address), **validates your
TIN against LHDN live**, and writes two small local files that every future
invoice reuses: `~/.myinvois-profile.json` (you) and `~/.myinvois-clients.json`
(who you bill). Nothing is stored anywhere else.

*No AI?* [Setup guide phase 2](https://techtemplemy.github.io/e-invoice-malaysia-mcp/setup-guide.html) has in-browser generators for both files.

## ③ Submit an e-invoice

**a — new client?**
> 💬 *"Save a new client: ACME Sdn Bhd, BRN 201901234567 — look up and validate
> their TIN first."*  → MCP: `search_tin` → `validate_tin` → client book.

**b — the purchase / invoice itself**
> 💬 *"Here's my invoice PDF — submit it to MyInvois. Show me the summary before
> sending."*  (or just describe the line items in chat)

Your AI extracts buyer + lines, builds the UBL document from your profile,
**always shows you a summary and waits for your yes** (`draft_invoice` →
`confirm_submission`, enforced in code), then returns the LHDN validation link.

**c — send it out**
> 💬 *"Email the invoice PDF with the validation link and QR to
> accounts@acme.com."*  — works if your Claude has an email connector (Gmail /
> Outlook); otherwise make the QR with `npx qrcode "<link>" -o qr.png` and
> attach it yourself. The **[invoice maker](https://techtemplemy.github.io/e-invoice-malaysia-mcp/invoice-maker.html)**
> builds a print-ready PDF with the QR embedded — fonts, logo, your colours.

## ④ Check invoices

> 💬 *"Show my e-invoices from the last month"* · *"What's the status of
> INV-2026-0012?"* · *"Cancel INV-2026-0012 — wrong amount."*

MCP: `list_recent_documents`, `get_document`, `cancel_document` (cancel window
is 72 hours; cancelling asks you to confirm first).

## ⑤ Record a supplier bill (self-billed)

Foreign vendors (OpenAI, Hostinger, AWS…) never send Malaysian e-invoices —
**you** must issue a *self-billed* one to claim the expense, by end of the
month after payment.

> 💬 *"Here's my OpenAI receipt — create the self-billed e-invoice for it."*

The vendor goes in as supplier (generic TIN `EI00000000030`), your company as
buyer, type 11 — same confirm-before-submit flow.

---

## Install

**Claude Code (skill — recommended start):**
```sh
git clone https://github.com/techtemplemy/e-invoice-malaysia-mcp
cp -r e-invoice-malaysia-mcp/skills/myinvois ~/.claude/skills/myinvois
```

**Claude Desktop / Cursor / any MCP client:**
```json
{ "mcpServers": { "myinvois": {
    "command": "npx", "args": ["-y", "e-invoice-malaysia-mcp"],
    "env": { "MYINVOIS_CLIENT_ID": "…", "MYINVOIS_CLIENT_SECRET": "…", "MYINVOIS_ENV": "sandbox" }
} } }
```

<details>
<summary><b>For developers — CLI, API reference, layout</b></summary>

### Zero-dependency CLI (Node ≥ 18, no install)

```sh
node skills/myinvois/scripts/myinvois.mjs token
node skills/myinvois/scripts/myinvois.mjs validate-tin C1234567890 BRN 202001234567
node skills/myinvois/scripts/myinvois.mjs search-tin BRN 202001234567
node skills/myinvois/scripts/myinvois.mjs submit my-invoice.json --stamp
node skills/myinvois/scripts/myinvois.mjs submission <submissionUid>
node skills/myinvois/scripts/myinvois.mjs document <uuid>
```
11 commands total — also `recent`, `raw`, `cancel`, `reject`, `doctypes`.

### MCP server (`e-invoice-malaysia-mcp`)

11 tools: `validate_tin`, `search_tin`, `get_supplier_profile`, `draft_invoice`,
`prepare_ubl_submission`, `confirm_submission`, `get_submission`, `get_document`,
`list_recent_documents`, `cancel_document`, `reject_document`.
Two-step submit (one-time confirmation token, 10-min TTL), sandbox default,
local stdio, no telemetry. Local checkout: `claude mcp add myinvois -- node <repo>/mcp/server.mjs`.

### Repo layout

```
docs/                        # static site: setup guide · invoice maker · landing
skills/myinvois/             # standalone Claude Code skill
  SKILL.md                   #   3-phase workflows
  scripts/myinvois.mjs       #   the CLI
  templates/ references/     #   UBL template · field rules · every endpoint as curl
lib/ + mcp/server.mjs        # the npm package (this repo root)
postman/                     # official LHDN Postman collection + environments
```

### Field-tested

Real sandbox submissions, validations, and rejections — every trap we hit is
documented in [references/api.md](skills/myinvois/references/api.md)
(wrong-role ERP registration, CF321 clock skew, ERR236 consolidated
classification…).

</details>

## License

MIT — see [LICENSE](LICENSE).
