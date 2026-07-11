# e-invoice-malaysia-mcp — MyInvois (LHDN e-Invois) toolkit

Issue validated Malaysian e-invoices from the terminal, from Claude, or from
any MCP client. Three ways in, one shared core:

**Live pages:** [setup guide](https://techtemplemy.github.io/e-invoice-malaysia-mcp/setup-guide.html) ·
[invoice maker](https://techtemplemy.github.io/e-invoice-malaysia-mcp/invoice-maker.html)

| I want to… | Use |
|---|---|
| Follow a visual "where do I click" walkthrough | **[setup guide](https://techtemplemy.github.io/e-invoice-malaysia-mcp/setup-guide.html)** ([source](docs/setup-guide.html)) — plain static HTML, also works by double-clicking the file |
| Make a print-ready invoice PDF with the LHDN QR | **[invoice maker](https://techtemplemy.github.io/e-invoice-malaysia-mcp/invoice-maker.html)** ([source](docs/invoice-maker.html)) — fonts, logo, accent colour, live totals, all in-browser |
| Use Claude Code only | the **skill** in `skills/myinvois/` — fully standalone |
| Use Claude Desktop / Cursor / any MCP client | the **MCP server** `myinvois-mcp` |
| Script it myself | the zero-dependency **CLI** `skills/myinvois/scripts/myinvois.mjs` + [curl reference](skills/myinvois/references/curls.md) |

> Unofficial. Not affiliated with or endorsed by LHDN. You are responsible for
> your own tax submissions.

## The whole thing is 3 steps

**1 · Setup — get your company-specific access** *(once ever)*
Register an ERP in the MyInvois portal (self-service, ~10 min) → Client ID +
Secret → save in `~/.myinvois.env`. The [setup guide](docs/setup-guide.html)
walks every click with mock portal screens — including the two traps we hit
in real testing (registering under the wrong role; clock-skew rejections).

**2 · Back office — who you are, who you bill** *(once, then maintain)*
- `~/.myinvois-profile.json` — your seller details (TIN, BRN, MSIC, address…)
- `~/.myinvois-clients.json` — your client book (name → TIN/BRN, verified once)

The guide has local generators for both files — nothing leaves the page.

**3 · Generate & send** *(every invoice)*
Drop your existing invoice PDF on Claude (the guide's prompt builder writes the
instruction for you), or give details in chat, or script the CLI. Result: a
validated e-invoice + LHDN share link — send your client the PDF plus the
link/QR (`npx qrcode "<link>" -o invoice-qr.png`).

## Standalone skill (Claude Code, no MCP needed)

`skills/myinvois/` is self-contained — SKILL.md + CLI + templates + references:

```sh
# clone-free install: copy the folder
git clone https://github.com/techtemplemy/e-invoice-malaysia-mcp
cp -r e-invoice-malaysia-mcp/skills/myinvois ~/.claude/skills/myinvois
# (or symlink it to stay updated:  mklink /J on Windows, ln -s elsewhere)
```

Then just talk to Claude Code: *"set up my Malaysia e-invoice access"*,
*"save my client Acme Sdn Bhd"*, *"submit this invoice PDF to MyInvois"* —
the skill covers setup, back office, and generation as guided workflows.

## MCP server (`myinvois-mcp`)

11 tools: `validate_tin`, `search_tin`, `get_supplier_profile`, `draft_invoice`,
`prepare_ubl_submission`, `confirm_submission`, `get_submission`, `get_document`,
`list_recent_documents`, `cancel_document`, `reject_document`.

Nothing submits in one step: `draft_invoice` returns a summary + one-time
confirmation token; only `confirm_submission` sends it to LHDN. Sandbox by
default, production is explicit opt-in. Local stdio — credentials stay in your
env, no telemetry, no middleman.

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
Env vars may also live in `~/.myinvois.env`; supplier profile path overridable
with `MYINVOIS_PROFILE`.

## Layout

```
docs/setup-guide.html        # static visual guide + local generators (start here)
skills/myinvois/             # standalone Claude Code skill
  SKILL.md                   #   3-phase workflows for Claude
  scripts/myinvois.mjs       #   zero-dep CLI (11 commands)
  templates/invoice-v1.0.json
  references/api.md          #   field rules, codes, common rejections
  references/curls.md        #   every endpoint as copy-paste curl
lib/ + mcp/server.mjs        # myinvois-mcp MCP server (npm package, this repo root)
postman/                     # official LHDN Postman collection + environments
ROADMAP.md
```

## CLI quick reference

```sh
node skills/myinvois/scripts/myinvois.mjs token
node skills/myinvois/scripts/myinvois.mjs validate-tin C1234567890 BRN 202001234567
node skills/myinvois/scripts/myinvois.mjs search-tin BRN 202001234567
node skills/myinvois/scripts/myinvois.mjs submit my-invoice.json --stamp
node skills/myinvois/scripts/myinvois.mjs submission <submissionUid>
node skills/myinvois/scripts/myinvois.mjs document <uuid>
```

Battle-tested on the LHDN sandbox: real submissions, real validations, real
rejections documented in [references/api.md](skills/myinvois/references/api.md).
