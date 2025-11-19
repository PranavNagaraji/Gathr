#!/usr/bin/env node
// Simple backend smoke tests (Node 18+)
// No external deps; reads optional tests/.env for config

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadDotEnv(rel = '.env') {
  try {
    const p = path.resolve(__dirname, rel);
    const txt = await fs.readFile(p, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let [, k, v] = m;
      // Strip surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {}
}

await loadDotEnv('.env');

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const CLERK_BEARER = process.env.CLERK_BEARER || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const TEST_AI = /^true$/i.test(process.env.TEST_AI || 'false');

function h(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(CLERK_BEARER ? { Authorization: `Bearer ${CLERK_BEARER}` } : {}),
    ...extra,
  };
}

function logResult(name, ok, details = '') {
  const icon = ok ? '✓' : '✗';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}${icon} ${name}${reset}${details ? ` - ${details}` : ''}`);
}

async function t_root() {
  const res = await fetch(`${BACKEND_URL}/`);
  const txt = await res.text();
  const ok = res.ok && /Hello from backend/i.test(txt);
  logResult('GET /', ok, ok ? '' : ` (status=${res.status})`);
  return ok;
}

async function t_complaints_list_admin() {
  const res = await fetch(`${BACKEND_URL}/api/complaints/list`, {
    method: 'GET',
    headers: h({ 'x-admin-email': ADMIN_EMAIL }),
  });
  const ok = res.ok;
  logResult('GET /api/complaints/list (adminEmailGate)', ok, ok ? '' : ` (status=${res.status})`);
  return ok;
}

async function t_customer_getShops() {
  const body = { lat: 12.9716, long: 77.5946 };
  const res = await fetch(`${BACKEND_URL}/api/customer/getShops`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify(body),
  });
  let ok = res.ok;
  let info = '';
  try {
    const data = await res.json();
    ok = ok && data && typeof data === 'object' && 'shops' in data;
    info = ok ? ` shops=${Array.isArray(data.shops) ? data.shops.length : 0}` : '';
  } catch {}
  logResult('POST /api/customer/getShops', ok, info);
  return ok;
}

async function t_customer_searchLocalItems() {
  const body = { lat: 12.9716, long: 77.5946, q: '', page: '1', limit: '5' };
  const res = await fetch(`${BACKEND_URL}/api/customer/searchLocalItems`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify(body),
  });
  let ok = res.ok;
  try {
    const data = await res.json();
    ok = ok && data && typeof data === 'object' && 'items' in data && 'page' in data;
  } catch {}
  logResult('POST /api/customer/searchLocalItems', ok, ok ? '' : ` (status=${res.status})`);
  return ok;
}

async function t_merchant_ai_optional() {
  if (!TEST_AI || !CLERK_BEARER) {
    logResult('POST /api/merchant/ai/generateFromImage (optional)', true, 'skipped');
    return true;
  }
  // Minimal 1x1 png base64 as placeholder; model may still return error without real image or missing GEMINI_API_KEY
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBhRuo7mQAAAAASUVORK5CYII=';
  // clerkId must map to a real merchant in your DB to return 200; otherwise 403 is expected.
  const body = { clerkId: process.env.MERCHANT_CLERK_ID || 'TEST', base64Image: tinyPng, hints: 'test' };
  const res = await fetch(`${BACKEND_URL}/api/merchant/ai/generateFromImage`, {
    method: 'POST',
    headers: h(),
    body: JSON.stringify(body),
  });
  // Accept 200 (success), 500 (Gemini not configured), and 401/403 (auth or user not found) as non-failures for smoke
  const ok = [200, 500, 401, 403].includes(res.status);
  const info = res.status === 401 || res.status === 403 ? 'skipped: unauthorized or merchant not found' : '';
  logResult('POST /api/merchant/ai/generateFromImage (optional)', ok, ok ? info : ` (status=${res.status})`);
  return ok;
}

async function main() {
  console.log(`Running smoke tests against ${BACKEND_URL}\n`);
  let pass = 0, fail = 0;
  const tests = [
    ['root', t_root],
    ['complaints_list_admin', t_complaints_list_admin],
    ['customer_getShops', t_customer_getShops],
    ['customer_searchLocalItems', t_customer_searchLocalItems],
    ['merchant_ai_optional', t_merchant_ai_optional],
  ];
  for (const [name, fn] of tests) {
    try {
      const ok = await fn();
      ok ? pass++ : fail++;
    } catch (e) {
      logResult(name, false, ` error=${e.message || e}`);
      fail++;
    }
  }
  console.log(`\nSummary: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
