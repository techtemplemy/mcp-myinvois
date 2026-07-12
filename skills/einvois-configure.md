---
name: einvois-configure
description: Configure MyInvois company profile and client book. Set up local JSON files to store supplier details and buyer details for future e-invoices.
references:
  - ../docs/guide-configure.html
  - einvois-get-access.md
  - einvois-get-access-1.md
  - einvois-get-access-2.md
---

# einvois-configure  Company & Client Setup (one-time only)

You are helping a user set up their company profile and client book for MyInvois.

> [!TIP]
> If you are using **browser-use** or **Playwright**, copy the instructions below to your agent context to extract details from an existing ERP or webpage.

```json
{
  "task": "Extract company and client details for MyInvois configuration.",
  "tools": ["browser-use", "playwright"],
  "instructions": [
    "Navigate to the user's ERP or accounting system.",
    "Extract the company TIN, BRN, MSIC code, address, and contact info.",
    "Extract a list of frequent clients (Name, TIN, BRN, email)."
  ]
}
```

## 1. Supplier Profile Setup

Collect the user's company details conversationally or extract them via browser automation, then validate the TIN+BRN via the API before saving.
Ensure that the frontend (FE) and any CSV imports/exports gracefully support multi-line rows for addresses (e.g., `line1`, `line2`, `line3`).

Write to `~/.myinvois-profile.json`:

```json
{
  "tin": "C1234567890",
  "brn": "202001234567",
  "sst": "NA",
  "ttx": "NA",
  "msic": "62010",
  "businessActivity": "Software development",
  "name": "EXAMPLE SDN BHD",
  "address": { 
    "line1": "Suite 123", 
    "line2": "Menara ABC", 
    "line3": "Jalan Ampang", 
    "city": "Kuala Lumpur", 
    "postcode": "50000", 
    "stateCode": "14" 
  },
  "phone": "+60123456789",
  "email": "billing@example.com",
  "nextInvoiceNumber": "INV-2026-0001"
}
```

## 2. Client Book Setup

Maintain a client book to easily lookup buyers. Write to `~/.myinvois-clients.json` or `~/.myinvois-clients.csv` (columns: `name,tin,idType,idValue,phone,email`).

When a user names a buyer, look them up here first. If it's a new buyer, fetch their BRN, use `search-tin`, then `validate-tin` and offer to save them in the client book.

## Verification

Use the CLI to test the setup:
```sh
node skills/myinvois/scripts/myinvois.mjs validate-tin <TIN> BRN <BRN>
```

## Skill chain

- **Previous:** `einvois-get-access` → `einvois-get-access-1` → `einvois-get-access-2` (API credentials)
- **Next:** `einvois-create-einvoice-submit` (submit your first e-invoice)

See `docs/guide-configure.html` for the in-browser profile builder with a no-AI fallback.
