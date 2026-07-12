---
name: einvois-get-access-2
description: "MyInvois portal ERP registration: register your system, capture Client ID & Secret, write ~/.myinvois.env, and verify the connection. Step 2 of 2 for getting MyInvois API access. References: guide-access.html steps 04–07."
references:
  - https://preprod.myinvois.hasil.gov.my
  - https://profile.myinvois.hasil.gov.my/TaxpayerProfile
  - ../docs/guide-access.html
  - ../docs/assets/examples/01-myinvois-register.png
  - ../docs/assets/examples/02-myinvois-switch-role1.png
  - ../docs/assets/examples/03-myinvois-switch-role2.png
  - ../docs/assets/examples/04-myinvois-profile-info.png
  - ../docs/assets/examples/05-myinvois-generate-erp.png
  - ../docs/assets/examples/06-myinvois-erp-code1.png
  - ../docs/assets/examples/06-myinvois-erp-code2.png
  - ../docs/assets/examples/07-myinvois-verify.png
---

# einvois-get-access-2 — MyInvois ERP registration & key capture

This is **Step 2 of 2** for getting Malaysia MyInvois API credentials.
Prerequisite: company role is confirmed in MyTax (see `einvois-get-access-1`).

> **Next skill after this:** `einvois-configure` — set up your supplier profile and client book.

---

## Part 1: Complete the MyInvois Profile Registration

> 📷 *Visual reference (indicator ①):* `docs/assets/examples/01-myinvois-register.png`
> 📷 *Visual reference (indicator ②):* `docs/assets/examples/01-myinvois-register.png`

1. After navigating from MyTax into the MyInvois profile engine, confirm the **Registration Completed!** banner shows your `SDN. BHD.` name and Taxpayer Number. *(①)*
2. Click the blue **Finish Setup** button in the lower-right corner. *(②)*

---

## Part 2: Switch Taxpayer Context in Pre-Production

The MyInvois pre-production portal requires switching taxpayer context after login.

**URL:** `https://preprod-mytax.hasil.gov.my/`

> 📷 *Visual reference (indicators ① & ②):* `docs/assets/examples/02-myinvois-switch-role1.png`
> 📷 *Visual reference (indicators ① & ②):* `docs/assets/examples/03-myinvois-switch-role2.png`

3. Click your **User Initial Profile Dropdown** (top-right corner, shows your initial letter). *(①)*
4. From the dropdown menu, click **Switch Taxpayer**. *(②)*
5. On the **Switch Taxpayer** modal, click into the selection input bar. *(①)*
6. Click your corporate company listing from the choices below. *(②)*

---

## Part 3: Register Your ERP System

This registers your CLI/MCP server as an "ERP" in the MyInvois taxpayer profile so it can make API calls on your company's behalf.

> 📷 *Visual reference (indicators ①, ②, ③):* `docs/assets/examples/04-myinvois-profile-info.png`
> 📷 *Visual reference (indicators ① & ②):* `docs/assets/examples/05-myinvois-generate-erp.png`
> 📷 *Visual reference (indicators ①, ②, ③):* `docs/assets/examples/06-myinvois-erp-code1.png`

7. Confirm the profile page at `https://profile.myinvois.hasil.gov.my/TaxpayerProfile` shows your correct **TIN**, **BRN**, and **Taxpayer Name**. *(①②③)*
8. In the left column, navigate to **Taxes / Taxpayer Profile**. In the main pane under **Representatives**, choose the **ERP** sub-tab. *(①②)*
9. Click the **Register ERP** link on the right side of the panel. *(①)*
10. In the **Add ERP System** modal:
    - **ERP Name:** type a memorable identifier, e.g., `yourcompany-cli` or `yourname-prod`.
    - **Client Secret expiration:** choose the longest available (e.g., `1 Year`). *(②)*
11. Click the dark blue **Register** button to submit. *(③)*

> **🚨 Register under the right taxpayer!** ERP keys belong to whichever taxpayer profile you're in. Keys registered under a personal profile will cause all company invoices to fail with `authenticated TIN and documents TIN is not matching`.

---

## Part 4: Capture Your API Keys

> **⚠ These credentials are shown ONLY ONCE.** Do not close this window until all values are copied.

> 📷 *Visual reference (indicator ①):* `docs/assets/examples/06-myinvois-erp-code2.png`
> 📷 *Visual reference (indicator ②):* `docs/assets/examples/06-myinvois-erp-code2.png`
> 📷 *Visual reference (indicator ③):* `docs/assets/examples/06-myinvois-erp-code2.png`

12. Copy the **Client ID** using the copy icon. *(①)*
13. Copy **Client Secret 1** using its copy icon. *(②)*
14. Copy **Client Secret 2** (secondary backup credential). *(③)*
15. Tick *"I confirm I have copied & saved the Client Secrets"* and click **Done**.

> If the secret is lost, register a new ERP — old secrets are unrecoverable. Sandbox and production key pairs are completely separate.

---

## Part 5: Write `~/.myinvois.env`

Use the in-browser generator at `guide-access.html` step 06, or write the file manually:

```env
MYINVOIS_CLIENT_ID=your-client-id
MYINVOIS_CLIENT_SECRET=your-client-secret
MYINVOIS_ENV=sandbox
# MYINVOIS_ONBEHALF=<taxpayer TIN>   # intermediaries only
```

**PowerShell shortcut** (writes the file directly):
```powershell
@'
MYINVOIS_CLIENT_ID=your-client-id
MYINVOIS_CLIENT_SECRET=your-client-secret
MYINVOIS_ENV=sandbox
'@ | Set-Content -Encoding ascii "$HOME\.myinvois.env"
```

---

## Part 6: Verify the Connection

> 📷 *Visual reference (indicator ①):* `docs/assets/examples/07-myinvois-verify.png`

Run these from the project root:

```sh
node skills/myinvois/scripts/myinvois.mjs token
# Expect: { "env": "sandbox", "token": "eyJhbGciOi…(cached)" }

node skills/myinvois/scripts/myinvois.mjs validate-tin <TIN> BRN <BRN>
# Expect: "valid": true
```

Or via MCP:
```sh
npx -y mcp-myinvois
# then call: validate_tin
```

**Troubleshooting:**
- `invalid_client` → wrong environment or secret typo. Sandbox and production are separate key pairs.
- Check that `MYINVOIS_ENV=sandbox` matches the portal you registered in.

To go live later: repeat Parts 1–5 at `https://mytax.hasil.gov.my`, set `MYINVOIS_ENV=prod`. Nothing else changes.

---

## ✅ Checkpoint

After completing this skill:
- `~/.myinvois.env` exists with your Client ID, Secret, and environment.
- `validate-tin` returns `"valid": true` against the sandbox.

**Proceed to:** `einvois-configure` — set up your supplier profile (`~/.myinvois-profile.csv`) and client book.