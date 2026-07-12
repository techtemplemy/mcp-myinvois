---
name: einvois-get-access
description: "Get Malaysia MyInvois (LHDN e-invoice) API credentials for a company — guided walkthrough of the hasil.gov.my portal, sandbox first. One-time setup. Can drive the browser (browser-use / Playwright / computer-use). Delegates to einvois-get-access-1 (MyTax portal) and einvois-get-access-2 (ERP registration & key capture)."
references:
  - https://preprod-mytax.hasil.gov.my
  - https://preprod.myinvois.hasil.gov.my
  - ../docs/guide-access.html
  - einvois-get-access-1.md
  - einvois-get-access-2.md
---

# einvois-get-access — get API access (one-time only)

You are helping a Malaysian taxpayer get MyInvois API credentials.
Work step by step, ONE step at a time. Toolkit: https://github.com/techtemplemy/mcp-myinvois

This skill is split into two detailed sub-skills. Load and follow them in order:

1. **`einvois-get-access-1`** — MyTax portal: login + switch to company role + role application
2. **`einvois-get-access-2`** — MyInvois ERP registration + API key capture + verify connection

## Quick reference (browser automation)

> [!TIP]
> If you are using **browser-use** or **Playwright**, copy the task below to your agent context.

```json
{
  "task": "Navigate to preprod-mytax.hasil.gov.my and register a new ERP for MyInvois.",
  "tools": ["browser-use", "playwright"],
  "instructions": [
    "Navigate to https://preprod-mytax.hasil.gov.my.",
    "Wait for user to enter login credentials (NEVER type their password).",
    "Select the COMPANY role from the Pilihan Peranan dropdown (CRITICAL).",
    "Click MyInvois menu to open preprod.myinvois.hasil.gov.my.",
    "Navigate to Taxpayer Profile → Representatives → ERP tab → Register ERP.",
    "Fill ERP Name and expiry, click Register.",
    "Capture Client ID and Client Secret 1 & 2 when shown — they appear only once."
  ]
}
```

## Prerequisites (ask before starting)

- Company TIN (format `C1234567890`). Unknown? Check MyTax / e-Daftar.
- A MyTax account as company director or appointed representative.
- Node.js ≥ 18 (`node --version`).
- Sandbox is a full copy of production with fake data — **ALWAYS start there.**

## Critical warning

Skipping the company role switch and registering the ERP under the personal profile causes all company invoices to fail with:
```
authenticated TIN and documents TIN is not matching
```
The user will need to re-register. See `einvois-get-access-1` Part 2 for the exact steps.

## Visual guide

See `docs/guide-access.html` for annotated mock-up screenshots of every step (steps 01–07).
Actual portal screenshots with numbered indicators are in `docs/assets/examples/`:
- `00-mytax00-home.png` — login page
- `00-mytax1-switch-profile.png` — role switch modal
- `00-mytax2-profile-emp.png` — company nav + MyInvois menu
- `00-mytax01-add-checkprofile-role.png` — role application form
- `01-myinvois-register.png` — registration complete
- `02-myinvois-switch-role1.png` / `03-myinvois-switch-role2.png` — preprod taxpayer switch
- `04-myinvois-profile-info.png` — profile TIN/BRN confirmation
- `05-myinvois-generate-erp.png` — ERP tab navigation
- `06-myinvois-erp-code1.png` — Register ERP modal
- `06-myinvois-erp-code2.png` — Client ID & Secret display
- `07-myinvois-verify.png` — Valid status confirmation

## After completing this skill

Proceed to: **`einvois-configure`** (supplier profile + client book).
