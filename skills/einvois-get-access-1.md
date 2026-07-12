---
name: einvois-get-access-1
description: "MyTax portal walkthrough: log in, switch to the company role, and apply for / verify the director role. Step 1 of 2 for getting MyInvois API access. References: guide-access.html steps 01–03."
references:
  - https://preprod-mytax.hasil.gov.my
  - https://mytax.hasil.gov.my
  - ../docs/guide-access.html
  - ../docs/assets/examples/00-mytax00-home.png
  - ../docs/assets/examples/00-mytax1-switch-profile.png
  - ../docs/assets/examples/00-mytax2-profile-emp.png
  - ../docs/assets/examples/00-mytax01-add-checkprofile-role.png
  - ../docs/assets/examples/00-mytax3-new-role.png
---

# einvois-get-access-1 — MyTax portal: login & company role

This is **Step 1 of 2** for getting Malaysia MyInvois API credentials.
Work ONE step at a time. Open portal pages for the user if you have browser access.

> **Next skill after this:** `einvois-get-access-2` — ERP registration & key capture in the MyInvois portal.

## Prerequisites (confirm before starting)

- Company **TIN** (format `C1234567890`). Unknown? Check MyTax or e-Daftar.
- A **MyTax account** as company director or appointed representative.
- **Node.js ≥ 18** for the CLI verification later (`node --version`).
- Sandbox is a full copy of production with fake data — **always start with sandbox.**

---

## Part 1: Initial Login to MyTax

**URL (sandbox):** `https://preprod-mytax.hasil.gov.my`
**URL (production later):** `https://mytax.hasil.gov.my`

> 📷 *Visual reference:* `docs/assets/examples/00-mytax00-home.png`

1. Open the URL above. Locate the login card on the right side of the banner.
2. Select your identification type from the dropdown (e.g., `MyKad/MyPR/MyKAS`).
3. Enter your identification number into the **No. Pengenalan** field.
4. Click the dark blue **Hantar / Submit** button.
5. Complete the digital certificate authentication when prompted.
   - **⚠ NEVER** type the user's password or certificate PIN yourself — pause and let them authenticate.
   - First time in sandbox? Production accounts do **not** carry over automatically. Point the user to **"First Time Login"** on the same page.

---

## Part 2: Switch to the Corporate Profile

> 📷 *Visual reference (indicator ①):* `docs/assets/examples/00-mytax1-switch-profile.png`
> 📷 *Visual reference (indicator ②):* `docs/assets/examples/00-mytax1-switch-profile.png`

6. After login, look at the left sidebar under **Pilihan Peranan** (Role Selection).
7. Click the blue dropdown showing your current role (usually `Individu`). *(①)*
8. A **Pilihan Peranan** modal appears. Locate the **Majikan** (Employer) row.
9. Click the dropdown arrow next to **Majikan** to see registered companies.
10. Click on your target corporate entity (e.g., `EXAMPLE SDN. BHD.`). *(②)*

> 📷 *Visual reference (indicators ① & ②):* `docs/assets/examples/00-mytax2-profile-emp.png`

11. Verify the blue bar on the dashboard now reads **Majikan — [Your Company Name] SDN. BHD.**
12. Click **MyInvois** in the top horizontal navigation menu. It opens `preprod.myinvois.hasil.gov.my` in a new tab.

> **🚨 CRITICAL:** If you skip the role switch and register the ERP under your *personal* profile, every company invoice will fail with:
> `authenticated TIN and documents TIN is not matching`
> The user will have to re-register under the company role.

---

## Part 3: Apply for the Director Role (if not yet applied)

> This part is only needed if the company role is **not yet showing** in the Majikan dropdown — i.e., first-time MyInvois users who need to submit a role application.

> 📷 *Visual reference (indicator ①):* `docs/assets/examples/00-mytax01-add-checkprofile-role.png`
> 📷 *Visual reference (indicator ②):* `docs/assets/examples/00-mytax01-add-checkprofile-role.png`
> 📷 *Visual reference (indicator ③):* `docs/assets/examples/00-mytax01-add-checkprofile-role.png`

13. In the MyInvois dashboard, click the orange **User Profile icon** (top-right corner). *(①)*
14. On the profile hub, click the **Role Application** tab in the main sub-navigation.
15. Set **Type of Application** → `New Application`. *(②)*
16. Set **Type of Role** → `Directors of the company / Organization Administrator`.
17. Enter the company TIN in the numeric input field.
    - If `Tax Payer Does Not Exist!` appears in red, double-check the TIN/BRN. *(see `00-mytax3-new-role.png`)*
18. Click **Upload** to attach supporting documents (max **2 MB** each, `.jpg` / `.png` / `.pdf` only).
19. Click **Submit** at the lower right to finalise. *(③)*

---

## ✅ Checkpoint

After completing this skill:
- The company role is visible in the **Pilihan Peranan** dropdown.
- The MyInvois portal opens correctly at `preprod.myinvois.hasil.gov.my` for the company.

**Proceed to:** `einvois-get-access-2` — register the ERP system and capture your API keys.