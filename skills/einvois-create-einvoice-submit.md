---
name: einvois-create-einvoice-submit
description: Extract details from an invoice (PDF or chat) and submit it to MyInvois for validation.
---

# einvois-create-einvoice-submit  Generate & Send (Every Invoice)

You are helping the user extract invoice details and submit them to LHDN MyInvois API.

> [!TIP]
> If you are an AI agent extracting data, copy the JSON below to define the structure you need to extract from user-provided documents or chat.

```json
{
  "task": "Extract invoice data and submit via MyInvois CLI or MCP tool",
  "data_schema": {
    "buyer": {
      "name": "string",
      "tin": "string",
      "brn": "string"
    },
    "invoice": {
      "invoiceNumber": "string",
      "lines": [
        {"description": "string", "quantity": "number", "unitPrice": "number"}
      ],
      "taxes": "number",
      "total": "number"
    }
  },
  "instructions": [
    "Extract the data schema from the provided PDF or chat description.",
    "Lookup buyer in ~/.myinvois-clients.json if existing.",
    "Draft the UBL JSON using the templates provided.",
    "ALWAYS show the user a summary table before confirming submission.",
    "Submit via MCP confirm_submission or CLI submit command.",
    "Return the validation link and QR code instructions to the user."
  ]
}
```

## Steps

1. **Extract Information**: From a provided PDF or text, identify the unique invoice number, buyer details, and line items (description, qty, unit price).
2. **Handle Buyer**: Ensure the buyer is valid (TIN/BRN). If it's a general consumer, use CLASS `004` and generic TIN `EI00000000010`.
3. **Draft the Document**: Combine the supplier profile from `~/.myinvois-profile.json` with the buyer details.
4. **Summary & Consent (CRITICAL)**: Always present a clear table of what will be submitted and ask for consent before hitting the MyInvois API.
5. **Submit**: Use `submit <file> --stamp` or MCP `confirm_submission` tool. Wait for the `Valid` status.
6. **Delivery**: Provide the validation link and optionally generate a QR code `npx qrcode "<link>" -o qr.png`.
