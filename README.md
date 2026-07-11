# einvoice — Malaysia MyInvois (LHDN e-Invois) toolkit

A Claude Code **skill**, a zero-dependency Node CLI, and an **MCP server**
(`myinvois-mcp`) for submitting, checking and cancelling Malaysian e-invoices
through the official MyInvois API.

> Unofficial. Not affiliated with or endorsed by LHDN. You are responsible for
> your own tax submissions.

## MCP server (`myinvois-mcp`)

Works in any MCP client (Claude Desktop, Claude Code, Cursor, …). 11 tools:
`validate_tin`, `search_tin`, `get_supplier_profile`, `draft_invoice`,
`prepare_ubl_submission`, `confirm_submission`, `get_submission`,
`get_document`, `list_recent_documents`, `cancel_document`, `reject_document`.

Nothing is submitted in one step: `draft_invoice` returns a summary + one-time
confirmation token, and only `confirm_submission` sends it to LHDN. Sandbox is
the default environment; production is explicit opt-in. Credentials stay in
env vars / local files — the server is local stdio, no telemetry, no middleman.

Claude Desktop / any MCP client config (after `npm publish`, use `npx`):

```json
{
  "mcpServers": {
    "myinvois": {
      "command": "npx",
      "args": ["-y", "myinvois-mcp"],
      "env": {
        "MYINVOIS_CLIENT_ID": "…",
        "MYINVOIS_CLIENT_SECRET": "…",
        "MYINVOIS_ENV": "sandbox"
      }
    }
  }
}
```

Local checkout instead of npx: `"command": "node", "args": ["<repo>/mcp/server.mjs"]`.
Claude Code: `claude mcp add myinvois -- node <repo>/mcp/server.mjs`.
Env vars may also live in `~/.myinvois.env`; the supplier profile in
`~/.myinvois-profile.json` (override with `MYINVOIS_PROFILE`).

## Layout

```
skills/myinvois/
  SKILL.md               # skill instructions (symlink this folder into ~/.claude/skills)
  scripts/myinvois.mjs   # the CLI (Node >= 18, no npm install needed)
  templates/invoice-v1.0.json
  references/api.md      # endpoint + field cheat sheet
  references/curls.md    # every endpoint as a copy-paste curl
postman/                 # official LHDN Postman collection + env files
docs/setup-guide.html    # visual "where to click" onboarding guide
docs/serve.mjs           # serves the docs: node docs/serve.mjs → http://localhost:8642
```

**New here? Open the setup guide first** — it walks the whole portal flow with
mock screens, generates your `.env` and supplier profile, and tracks progress:

```
node docs/serve.mjs        # then open http://localhost:8642
```
(or just double-click `docs/setup-guide.html`)

## Quick start

1. Get sandbox credentials: https://preprod-mytax.hasil.gov.my → MyInvois portal
   → Taxpayer Profile → Register ERP → copy Client ID + Secret.
2. Create `~/.myinvois.env`:
   ```
   MYINVOIS_CLIENT_ID=...
   MYINVOIS_CLIENT_SECRET=...
   MYINVOIS_ENV=sandbox
   ```
3. Test:
   ```
   node skills/myinvois/scripts/myinvois.mjs token
   node skills/myinvois/scripts/myinvois.mjs validate-tin C1234567890 BRN 201901234567
   ```
4. Copy `skills/myinvois/templates/invoice-v1.0.json`, fill in the ALL_CAPS
   placeholders, then:
   ```
   node skills/myinvois/scripts/myinvois.mjs submit my-invoice.json --stamp
   node skills/myinvois/scripts/myinvois.mjs submission <submissionUid>
   ```

Switch to production by changing `MYINVOIS_ENV=prod` and using production
credentials (registered separately at https://mytax.hasil.gov.my).
