// MyInvois core  auth, API calls, submission helpers. Shared by the MCP
// server (mcp/server.mjs). Zero dependencies, Node >= 18.
// IMPORTANT: never write to stdout here; the MCP transport owns it.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

export const ENVS = {
  sandbox: {
    api: "https://preprod-api.myinvois.hasil.gov.my",
    portal: "https://preprod.myinvois.hasil.gov.my",
  },
  prod: {
    api: "https://api.myinvois.hasil.gov.my",
    portal: "https://myinvois.hasil.gov.my",
  },
};

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

export function loadConfig() {
  const file = {
    ...loadDotEnv(join(homedir(), ".myinvois.env")),
    ...loadDotEnv(join(process.cwd(), ".env")),
  };
  const get = (k) => process.env[k] ?? file[k];
  const env = (get("MYINVOIS_ENV") || "sandbox").toLowerCase();
  if (!ENVS[env]) throw new Error(`MYINVOIS_ENV must be "sandbox" or "prod", got "${env}"`);
  const clientId = get("MYINVOIS_CLIENT_ID");
  const clientSecret = get("MYINVOIS_CLIENT_SECRET");
  if (!clientId || !clientSecret)
    throw new Error("Missing MYINVOIS_CLIENT_ID / MYINVOIS_CLIENT_SECRET (env var, ./.env, or ~/.myinvois.env)");
  return {
    env,
    base: ENVS[env].api,
    portal: ENVS[env].portal,
    clientId,
    clientSecret,
    onBehalfOf: get("MYINVOIS_ONBEHALF"),
    profilePath: get("MYINVOIS_PROFILE") || join(homedir(), ".myinvois-profile.json"),
  };
}

export async function getToken(cfg) {
  const cacheFile = join(
    tmpdir(),
    `myinvois-token-${cfg.env}-${cfg.clientId.slice(0, 8)}${cfg.onBehalfOf ? "-" + cfg.onBehalfOf : ""}.json`
  );
  if (existsSync(cacheFile)) {
    try {
      const c = JSON.parse(readFileSync(cacheFile, "utf8"));
      if (c.expiresAt > Date.now() + 60_000) return c.token;
    } catch { }
  }
  const res = await fetch(`${cfg.base}/connect/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cfg.onBehalfOf ? { onbehalfof: cfg.onBehalfOf } : {}),
    },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      grant_type: "client_credentials",
      scope: "InvoicingAPI",
    }),
  });
  if (!res.ok) throw new Error(`token request failed: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  writeFileSync(
    cacheFile,
    JSON.stringify({ token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 })
  );
  return data.access_token;
}

export async function apiCall(cfg, method, path, body) {
  const token = await getToken(cfg);
  const res = await fetch(`${cfg.base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return { status: res.status, ok: res.ok, json };
}

// LHDN rejects any future-dated document (CF321); client clocks are rarely in
// perfect sync with theirs, so stamp a few minutes in the past.
export function stampInvoice(doc, backdateMinutes = 5) {
  const inv = doc.Invoice?.[0];
  if (!inv) throw new Error("not a UBL JSON invoice (missing Invoice[0])");
  const now = new Date(Date.now() - backdateMinutes * 60_000);
  inv.IssueDate = [{ _: now.toISOString().slice(0, 10) }];
  inv.IssueTime = [{ _: now.toISOString().slice(11, 19) + "Z" }];
  return doc;
}

export async function submitDocument(cfg, doc) {
  const codeNumber = doc.Invoice?.[0]?.ID?.[0]?._;
  if (!codeNumber) throw new Error("Invoice[0].ID[0]._ (invoice number) is required");
  const raw = JSON.stringify(doc);
  const payload = {
    documents: [{
      format: "JSON",
      codeNumber,
      documentHash: createHash("sha256").update(raw, "utf8").digest("hex"),
      document: Buffer.from(raw, "utf8").toString("base64"),
    }],
  };
  return apiCall(cfg, "POST", "/api/v1.0/documentsubmissions", payload);
}

export async function pollSubmission(cfg, submissionUid, { tries = 8, delayMs = 2000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = await apiCall(cfg, "GET", `/api/v1.0/documentsubmissions/${encodeURIComponent(submissionUid)}?pageSize=100`);
    if (!last.ok || last.json.overallStatus !== "InProgress") return last;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}

export function shareLink(cfg, uuid, longId) {
  return longId ? `${cfg.portal}/${uuid}/share/${longId}` : null;
}

// Minimal CSV line parser: handles quoted fields with embedded commas/quotes.
function parseCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// key,value CSV (the setup guide's Excel-friendly format) -> profile object.
function profileFromCsv(text) {
  const flat = {};
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [k, v] = parseCsvLine(line);
    if (k) flat[k.trim()] = (v ?? "").trim();
  }
  const { addressLine1, city, postcode, stateCode, ...rest } = flat;
  return { ...rest, address: { line1: addressLine1, city, postcode, stateCode } };
}

function resolveProfilePath(cfg) {
  // accept .json or the Excel-friendly .csv, whichever exists
  const candidates = [cfg.profilePath];
  if (cfg.profilePath.endsWith(".json")) candidates.push(cfg.profilePath.replace(/\.json$/, ".csv"));
  return { path: candidates.find(existsSync), candidates };
}

export function loadProfile(cfg) {
  const { path, candidates } = resolveProfilePath(cfg);
  if (!path)
    throw new Error(`supplier profile not found at ${candidates.join(" or ")}  create it first (see setup guide)`);
  const raw = readFileSync(path, "utf8");
  const p = path.endsWith(".csv") ? profileFromCsv(raw) : JSON.parse(raw);
  const missing = Object.entries(p).filter(([, v]) => typeof v === "string" && v.startsWith("FILL_ME"));
  if (missing.length) throw new Error(`supplier profile has unfilled fields: ${missing.map(([k]) => k).join(", ")}`);
  return p;
}

export function saveProfile(cfg, profile) {
  const { path } = resolveProfilePath(cfg);
  const target = path || cfg.profilePath;
  if (target.endsWith(".csv")) {
    const esc = (x) => (/[",\n]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : String(x ?? ""));
    const { address = {}, ...rest } = profile;
    const rows = [["key", "value"],
    ...Object.entries(rest),
    ["addressLine1", address.line1 ?? ""], ["city", address.city ?? ""],
    ["postcode", address.postcode ?? ""], ["stateCode", address.stateCode ?? ""]];
    writeFileSync(target, rows.map((r) => r.map(esc).join(",")).join("\n") + "\n");
  } else {
    writeFileSync(target, JSON.stringify(profile, null, 2) + "\n");
  }
}

export function bumpInvoiceNumber(current) {
  // INV-2026-0007 -> INV-2026-0008 (increments the last digit run)
  return current.replace(/(\d+)(?!.*\d)/, (m) => String(Number(m) + 1).padStart(m.length, "0"));
}
