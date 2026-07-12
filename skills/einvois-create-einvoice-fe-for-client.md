---
name: einvois-create-einvoice-fe-for-client
description: Create a frontend UI for clients to view and manage their generated e-invoices, leveraging the LHDN MyInvois data.
---

# einvois-create-einvoice-fe-for-client  Build Client Frontend

You are helping the user generate a beautiful, responsive frontend UI to show e-invoices to their clients.

> [!TIP]
> If you are an AI generating UI (e.g., v0, Claude Artifacts), use the JSON below as your generation prompt instructions.

```json
{
  "task": "Generate a modern, responsive web app to view MyInvois e-invoices.",
  "tech_stack": ["HTML", "Tailwind CSS", "Vanilla JS" ],
  "instructions": [
    "Create a clean dashboard showing a list of recent invoices.",
    "Design a detail view for a specific invoice, displaying Seller, Buyer, Line Items, and Total.",
    "Include the LHDN Validation Status prominently (Valid / Invalid / Submitted).",
    "Embed the LHDN QR code (or a placeholder for it) in the top right corner of the invoice detail view.",
    "Ensure the UI uses a premium color palette (e.g., dark blue, soft yellow accents like the project theme)."
  ]
}
```

## Requirements for Frontend

1. **Aesthetics**: The design should be modern, clean, and professional. Avoid raw browser defaults. Use Tailwind CSS for rapid styling or a dedicated framework if requested.
2. **Data Integration**: Ensure the frontend can consume the output of the MyInvois API (specifically the `document <uuid>` response).
3. **Core Features**:
   - List View: Table or cards showing Date, Invoice #, Client Name, Amount, and Status.
   - Detail View: A digital replica of the PDF invoice with the official QR validation code.
4. **Export Options**: Add a button to print the invoice or download it as PDF.

## Next Steps
Once the UI is generated, integrate it with the Node.js backend/CLI output to make it dynamic.
