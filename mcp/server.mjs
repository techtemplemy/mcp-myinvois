#!/usr/bin/env node
// myinvois-mcp — unofficial MCP server for Malaysia's LHDN MyInvois e-invoice
// API. Not affiliated with or endorsed by LHDN. https://sdk.myinvois.hasil.gov.my/
//
// Safety design: nothing is ever sent to LHDN in one step. draft_invoice /
// prepare_ubl_submission return a summary + one-time confirmation token;
// only confirm_submission({ confirmationToken }) actually submits.

import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  loadConfig, apiCall, stampInvoice, submitDocument, pollSubmission,
  shareLink, loadProfile, saveProfile, bumpInvoiceNumber,
} from "../lib/core.mjs";
import { buildInvoice } from "../lib/ubl.mjs";

const cfg = loadConfig();
const pending = new Map(); // confirmationToken -> { doc, summary, expiresAt, invoiceNumber }
const PENDING_TTL_MS = 10 * 60_000;

const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify({ environment: cfg.env, ...data }, null, 2) }] });
const err = (message) => ({ isError: true, content: [{ type: "text", text: JSON.stringify({ environment: cfg.env, error: message }, null, 2) }] });
const wrap = (fn) => async (args) => {
  try { return await fn(args); } catch (e) { return err(e.message || String(e)); }
};

function stagePending(doc, summary) {
  for (const [t, p] of pending) if (p.expiresAt < Date.now()) pending.delete(t);
  const token = randomUUID();
  pending.set(token, { doc, summary, expiresAt: Date.now() + PENDING_TTL_MS, invoiceNumber: summary.invoiceNumber });
  return {
    staged: true,
    submitted: false,
    summary,
    confirmationToken: token,
    next: "Review the summary with the user. Submit ONLY after the user explicitly approves, by calling confirm_submission with this token. Token expires in 10 minutes.",
  };
}

const buyerSchema = z.object({
  tin: z.string().describe("Buyer TIN, e.g. C1234567890 / IG… / EI00000000010 (general public) / EI00000000020 (foreign buyer)"),
  idType: z.enum(["BRN", "NRIC", "PASSPORT", "ARMY"]).default("BRN"),
  idValue: z.string().default("NA").describe("BRN/NRIC value, or NA for generic TINs"),
  name: z.string().describe('Registered name, or "General Public" for consolidated'),
  sst: z.string().default("NA"),
  address: z.object({
    line1: z.string().default("NA"),
    city: z.string().default("NA"),
    postcode: z.string().default("NA"),
    stateCode: z.string().default("17").describe("Malaysian state code 01-17 (17 = not applicable)"),
    countryCode: z.string().default("MYS").describe("ISO3166-1 alpha-3"),
  }).default({}),
  phone: z.string().default("NA"),
  email: z.string().optional(),
});

const lineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().nonnegative().describe("Unit price in MYR"),
  classificationCode: z.string().default("022").describe("LHDN CLASS code, e.g. 022 others, 004 consolidated"),
  taxRate: z.number().min(0).max(1).default(0).describe("e.g. 0.08 for 8% service tax; 0 = no tax"),
  taxCategory: z.string().optional().describe("LHDN tax category; default 06 (not applicable) or 02 (service tax) when taxRate > 0"),
  unitCode: z.string().default("C62"),
});

const pkg = createRequire(import.meta.url)("../package.json");
const server = new McpServer({ name: pkg.name, version: pkg.version });

server.tool(
  "validate_tin",
  "Verify that a Malaysian TIN matches an ID (BRN/NRIC/passport). Returns valid true/false. Always validate a buyer before invoicing them.",
  { tin: z.string(), idType: z.enum(["BRN", "NRIC", "PASSPORT", "ARMY"]), idValue: z.string() },
  wrap(async ({ tin, idType, idValue }) => {
    const r = await apiCall(cfg, "GET", `/api/v1.0/taxpayer/validate/${encodeURIComponent(tin)}?idType=${encodeURIComponent(idType)}&idValue=${encodeURIComponent(idValue)}`);
    return ok({ tin, idType, idValue, valid: r.status === 200 });
  })
);

server.tool(
  "search_tin",
  "Find a taxpayer's TIN from their BRN, NRIC, or name (reverse lookup). Rate limited (60/min) — cache results.",
  {
    idType: z.enum(["BRN", "NRIC", "PASSPORT", "ARMY"]).optional(),
    idValue: z.string().optional(),
    taxpayerName: z.string().optional(),
  },
  wrap(async ({ idType, idValue, taxpayerName }) => {
    const q = new URLSearchParams();
    if (idType) q.set("idType", idType);
    if (idValue) q.set("idValue", idValue);
    if (taxpayerName) q.set("taxpayerName", taxpayerName);
    const r = await apiCall(cfg, "GET", `/api/v1.0/taxpayer/search/tin?${q}`);
    return r.ok ? ok(r.json) : err(`HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  })
);

server.tool(
  "get_supplier_profile",
  "Read the configured supplier (seller) profile used to build invoices.",
  {},
  wrap(async () => ok({ profile: loadProfile(cfg), profilePath: cfg.profilePath }))
);

server.tool(
  "draft_invoice",
  "Build a MyInvois e-invoice (UBL, version 1.0) from the supplier profile plus buyer and line items. Returns a human-reviewable summary and a confirmation token — it does NOT submit. Type codes: 01 invoice, 02 credit note, 03 debit note, 04 refund note, 11 self-billed invoice (foreign suppliers: buyer=you, supplier block uses TIN EI00000000030).",
  {
    invoiceNumber: z.string().optional().describe("Defaults to profile.nextInvoiceNumber"),
    typeCode: z.enum(["01", "02", "03", "04", "11", "12", "13", "14"]).default("01"),
    buyer: buyerSchema,
    lines: z.array(lineSchema).min(1),
  },
  wrap(async ({ invoiceNumber, typeCode, buyer, lines }) => {
    const profile = loadProfile(cfg);
    const num = invoiceNumber || profile.nextInvoiceNumber;
    if (!num) return err("no invoiceNumber given and profile has no nextInvoiceNumber");
    if (buyer.tin === "EI00000000010" && lines.some((l) => (l.classificationCode || "022") !== "004"))
      return err('LHDN rule ERR236: General Public buyer (EI00000000010) requires classificationCode "004" (consolidated) on every line');
    const { doc, summary } = buildInvoice(profile, { invoiceNumber: num, typeCode, buyer, lines });
    return ok(stagePending(doc, summary));
  })
);

server.tool(
  "prepare_ubl_submission",
  "Stage a raw, already-built UBL JSON invoice document for submission (advanced; use draft_invoice for the normal path). Returns summary + confirmation token; does NOT submit.",
  { ublDocument: z.record(z.any()).describe("Full UBL JSON with Invoice[0]") },
  wrap(async ({ ublDocument }) => {
    const inv = ublDocument.Invoice?.[0];
    if (!inv) return err("not a UBL JSON invoice (missing Invoice[0])");
    const summary = {
      invoiceNumber: inv.ID?.[0]?._,
      typeCode: inv.InvoiceTypeCode?.[0]?._,
      supplier: inv.AccountingSupplierParty?.[0]?.Party?.[0]?.PartyLegalEntity?.[0]?.RegistrationName?.[0]?._,
      buyer: inv.AccountingCustomerParty?.[0]?.Party?.[0]?.PartyLegalEntity?.[0]?.RegistrationName?.[0]?._,
      totalPayable: inv.LegalMonetaryTotal?.[0]?.PayableAmount?.[0]?._,
    };
    return ok(stagePending(ublDocument, summary));
  })
);

server.tool(
  "confirm_submission",
  "Submit a previously staged invoice to LHDN. Requires the confirmationToken from draft_invoice / prepare_ubl_submission, and must only be called after the user explicitly approved the summary. Re-stamps issue time, submits, polls until processed, returns status + validation link.",
  { confirmationToken: z.string() },
  wrap(async ({ confirmationToken }) => {
    const p = pending.get(confirmationToken);
    if (!p) return err("unknown or already-used confirmation token — stage the invoice again");
    if (p.expiresAt < Date.now()) { pending.delete(confirmationToken); return err("confirmation token expired (10 min) — stage the invoice again"); }
    pending.delete(confirmationToken);

    stampInvoice(p.doc);
    const sub = await submitDocument(cfg, p.doc);
    if (!sub.ok || sub.json.rejectedDocuments?.length)
      return err(`submission rejected: ${JSON.stringify(sub.json.rejectedDocuments ?? sub.json)}`);

    const uid = sub.json.submissionUid;
    const polled = await pollSubmission(cfg, uid);
    const docSummary = polled.json.documentSummary?.[0] ?? {};
    let longId = docSummary.longId;
    if (!longId && docSummary.uuid) {
      const det = await apiCall(cfg, "GET", `/api/v1.0/documents/${docSummary.uuid}/details`);
      longId = det.json.longId;
    }

    // Invalid documents never legally existed — their number can be reused,
    // so only advance the counter when the document went through.
    if (polled.json.overallStatus !== "Invalid") {
      try {
        const profile = loadProfile(cfg);
        if (profile.nextInvoiceNumber === p.invoiceNumber) {
          profile.nextInvoiceNumber = bumpInvoiceNumber(p.invoiceNumber);
          saveProfile(cfg, profile);
        }
      } catch {}
    }

    return ok({
      submitted: true,
      submissionUid: uid,
      uuid: docSummary.uuid,
      status: docSummary.status ?? polled.json.overallStatus,
      overallStatus: polled.json.overallStatus,
      validationLink: shareLink(cfg, docSummary.uuid, longId),
    });
  })
);

server.tool(
  "get_submission",
  "Check the processing status of a submission by submissionUid.",
  { submissionUid: z.string() },
  wrap(async ({ submissionUid }) => {
    const r = await apiCall(cfg, "GET", `/api/v1.0/documentsubmissions/${encodeURIComponent(submissionUid)}?pageSize=100`);
    return r.ok ? ok(r.json) : err(`HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  })
);

server.tool(
  "get_document",
  "Get a document's full details (validation results, longId for the share link) by UUID.",
  { uuid: z.string() },
  wrap(async ({ uuid }) => {
    const r = await apiCall(cfg, "GET", `/api/v1.0/documents/${encodeURIComponent(uuid)}/details`);
    if (!r.ok) return err(`HTTP ${r.status}: ${JSON.stringify(r.json)}`);
    return ok({ ...r.json, validationLink: shareLink(cfg, uuid, r.json.longId) });
  })
);

server.tool(
  "list_recent_documents",
  "List documents from the last 31 days, filterable (direction Sent/Received, status Valid/Invalid/Cancelled, etc).",
  {
    pageSize: z.number().int().min(1).max(100).default(20),
    pageNo: z.number().int().min(1).default(1),
    direction: z.enum(["Sent", "Received"]).optional(),
    status: z.enum(["Valid", "Invalid", "Cancelled", "Submitted"]).optional(),
  },
  wrap(async ({ pageSize, pageNo, direction, status }) => {
    const q = new URLSearchParams({ pageSize: String(pageSize), pageNo: String(pageNo) });
    if (direction) q.set("direction", direction);
    if (status) q.set("status", status);
    const r = await apiCall(cfg, "GET", `/api/v1.0/documents/recent?${q}`);
    return r.ok ? ok(r.json) : err(`HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  })
);

server.tool(
  "cancel_document",
  "Cancel a validated document you issued (within 72h). Only call after the user explicitly confirms the cancellation and reason.",
  { uuid: z.string(), reason: z.string().min(1) },
  wrap(async ({ uuid, reason }) => {
    const r = await apiCall(cfg, "PUT", `/api/v1.0/documents/state/${encodeURIComponent(uuid)}/state`, { status: "cancelled", reason });
    return r.ok ? ok(r.json) : err(`HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  })
);

server.tool(
  "reject_document",
  "As the buyer, request rejection of a received document (within 72h). Only call after the user explicitly confirms.",
  { uuid: z.string(), reason: z.string().min(1) },
  wrap(async ({ uuid, reason }) => {
    const r = await apiCall(cfg, "PUT", `/api/v1.0/documents/state/${encodeURIComponent(uuid)}/state`, { status: "rejected", reason });
    return r.ok ? ok(r.json) : err(`HTTP ${r.status}: ${JSON.stringify(r.json)}`);
  })
);

await server.connect(new StdioServerTransport());
