#!/usr/bin/env node
// MyInvois (Malaysia LHDN e-Invoice) CLI — zero dependencies, Node >= 18.
// Docs: https://sdk.myinvois.hasil.gov.my/

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const ENVS = {
  sandbox: "https://preprod-api.myinvois.hasil.gov.my",
  prod: "https://api.myinvois.hasil.gov.my",
};

// ---------- config ----------

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function config() {
  const file = { ...loadDotEnv(join(homedir(), ".myinvois.env")), ...loadDotEnv(join(process.cwd(), ".env")) };
  const get = (k) => process.env[k] ?? file[k];
  const env = (get("MYINVOIS_ENV") || "sandbox").toLowerCase();
  if (!ENVS[env]) fail(`MYINVOIS_ENV must be "sandbox" or "prod", got "${env}"`);
  const clientId = get("MYINVOIS_CLIENT_ID");
  const clientSecret = get("MYINVOIS_CLIENT_SECRET");
  if (!clientId || !clientSecret)
    fail("Missing MYINVOIS_CLIENT_ID / MYINVOIS_CLIENT_SECRET (env var, ./.env, or ~/.myinvois.env)");
  // Intermediaries acting on behalf of a taxpayer set MYINVOIS_ONBEHALF=<taxpayer TIN>
  return { env, base: ENVS[env], clientId, clientSecret, onBehalfOf: get("MYINVOIS_ONBEHALF") };
}

class CliError extends Error {}

function fail(msg) {
  throw new CliError(msg);
}

// ---------- auth ----------

async function getToken(cfg) {
  const cacheFile = join(tmpdir(), `myinvois-token-${cfg.env}-${cfg.clientId.slice(0, 8)}${cfg.onBehalfOf ? "-" + cfg.onBehalfOf : ""}.json`);
  if (existsSync(cacheFile)) {
    try {
      const c = JSON.parse(readFileSync(cacheFile, "utf8"));
      if (c.expiresAt > Date.now() + 60_000) return c.token;
    } catch {}
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
  if (!res.ok) fail(`token request failed: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  writeFileSync(
    cacheFile,
    JSON.stringify({ token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 })
  );
  return data.access_token;
}

async function api(cfg, method, path, body) {
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

function print(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ---------- commands ----------

const commands = {
  async token(cfg) {
    const t = await getToken(cfg);
    print({ env: cfg.env, token: t.slice(0, 24) + "...(cached)" });
  },

  async "validate-tin"(cfg, tin, idType, idValue) {
    if (!tin || !idType || !idValue) fail("usage: validate-tin <TIN> <NRIC|BRN|PASSPORT|ARMY> <idValue>");
    const r = await api(cfg, "GET",
      `/api/v1.0/taxpayer/validate/${encodeURIComponent(tin)}?idType=${encodeURIComponent(idType)}&idValue=${encodeURIComponent(idValue)}`);
    print({ tin, idType, idValue, valid: r.status === 200, httpStatus: r.status, ...(r.ok ? {} : { response: r.json }) });
    if (!r.ok && r.status !== 404) process.exitCode = 1;
  },

  async "search-tin"(cfg, idType, idValue, ...name) {
    if (!idType) fail("usage: search-tin <NRIC|BRN|PASSPORT|ARMY> <idValue> [taxpayerName...]");
    const q = new URLSearchParams();
    if (idType && idType !== "-") q.set("idType", idType);
    if (idValue && idValue !== "-") q.set("idValue", idValue);
    if (name.length) q.set("taxpayerName", name.join(" "));
    const r = await api(cfg, "GET", `/api/v1.0/taxpayer/search/tin?${q}`);
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok && r.status !== 404) process.exitCode = 1;
  },

  async submit(cfg, file, flag) {
    if (!file) fail("usage: submit <invoice.json> [--stamp]");
    const doc = JSON.parse(readFileSync(file, "utf8"));
    const inv = doc.Invoice?.[0];
    if (!inv) fail("not a UBL JSON invoice (missing Invoice[0])");
    if (flag === "--stamp") {
      // 5 min behind now: LHDN rejects any future-dated document (CF321) and
      // client clocks are rarely in perfect sync with theirs.
      const now = new Date(Date.now() - 5 * 60_000);
      inv.IssueDate = [{ _: now.toISOString().slice(0, 10) }];
      inv.IssueTime = [{ _: now.toISOString().slice(11, 19) + "Z" }];
    }
    const codeNumber = inv.ID?.[0]?._;
    if (!codeNumber) fail("Invoice[0].ID[0]._ (invoice number) is required");
    const raw = JSON.stringify(doc);
    const payload = {
      documents: [{
        format: "JSON",
        codeNumber,
        documentHash: createHash("sha256").update(raw, "utf8").digest("hex"),
        document: Buffer.from(raw, "utf8").toString("base64"),
      }],
    };
    const r = await api(cfg, "POST", "/api/v1.0/documentsubmissions", payload);
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok || r.json.rejectedDocuments?.length) process.exitCode = 1;
    if (r.json.submissionUid)
      console.error(`hint: run "submission ${r.json.submissionUid}" to check processing status`);
  },

  async submission(cfg, uid) {
    if (!uid) fail("usage: submission <submissionUid>");
    for (let i = 0; i < 10; i++) {
      const r = await api(cfg, "GET", `/api/v1.0/documentsubmissions/${encodeURIComponent(uid)}?pageSize=100`);
      if (!r.ok) { print({ httpStatus: r.status, ...r.json }); process.exitCode = 1; return; }
      if (r.json.overallStatus !== "InProgress" || i === 9) { print(r.json); return; }
      await new Promise((s) => setTimeout(s, 2000));
    }
  },

  async document(cfg, uuid) {
    if (!uuid) fail("usage: document <uuid>");
    const r = await api(cfg, "GET", `/api/v1.0/documents/${encodeURIComponent(uuid)}/details`);
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok) process.exitCode = 1;
  },

  async cancel(cfg, uuid, ...reason) {
    if (!uuid || !reason.length) fail("usage: cancel <uuid> <reason...>");
    const r = await api(cfg, "PUT", `/api/v1.0/documents/state/${encodeURIComponent(uuid)}/state`, {
      status: "cancelled",
      reason: reason.join(" "),
    });
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok) process.exitCode = 1;
  },

  async reject(cfg, uuid, ...reason) {
    if (!uuid || !reason.length) fail("usage: reject <uuid> <reason...>");
    const r = await api(cfg, "PUT", `/api/v1.0/documents/state/${encodeURIComponent(uuid)}/state`, {
      status: "rejected",
      reason: reason.join(" "),
    });
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok) process.exitCode = 1;
  },

  async raw(cfg, uuid) {
    if (!uuid) fail("usage: raw <uuid>");
    const r = await api(cfg, "GET", `/api/v1.0/documents/${encodeURIComponent(uuid)}/raw`);
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok) process.exitCode = 1;
  },

  async recent(cfg, ...pairs) {
    // recent [key=value ...] e.g. recent pageSize=20 direction=Sent status=Valid
    const q = new URLSearchParams({ pageNo: "1", pageSize: "20" });
    for (const p of pairs) {
      const [k, v] = p.split("=");
      if (!k || v === undefined) fail(`bad filter "${p}", expected key=value`);
      q.set(k, v);
    }
    const r = await api(cfg, "GET", `/api/v1.0/documents/recent?${q}`);
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok) process.exitCode = 1;
  },

  async doctypes(cfg) {
    const r = await api(cfg, "GET", "/api/v1.0/documenttypes");
    print({ httpStatus: r.status, ...r.json });
    if (!r.ok) process.exitCode = 1;
  },
};

// ---------- main ----------

const [cmd, ...args] = process.argv.slice(2);
if (!cmd || !commands[cmd]) {
  console.error(`usage: myinvois.mjs <command>\ncommands: ${Object.keys(commands).join(", ")}`);
  process.exitCode = 1;
} else {
  try {
    await commands[cmd](config(), ...args);
  } catch (e) {
    console.error(`error: ${e instanceof CliError ? e.message : e.stack || e}`);
    process.exitCode = 1;
  }
}
