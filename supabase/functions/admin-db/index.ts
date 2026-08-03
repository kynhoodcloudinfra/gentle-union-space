import { createClient } from 'npm:@supabase/supabase-js@2';

// Generic, password-gated proxy for the admin panel. The panel has no real
// user auth — it's a single shared password — so this function is the only
// place that password is checked, and it's the only thing holding the
// service-role key. The browser never sees service-role credentials, and
// never sees ADMIN_PASSWORD either (it's a function secret, not shipped in
// the client bundle).
//
// Only these tables may be touched, and only via the actions below.
const ALLOWED_TABLES = new Set(['questions', 'submissions', 'visits']);

// The shared supabase-js corsHeaders helper only allows a fixed set of
// headers (authorization, apikey, content-type, x-client-info, x-retry-count)
// — it doesn't know about our custom x-admin-password header, so browsers
// block the preflight and every real request fails with a generic "Failed to
// fetch" (curl bypasses CORS entirely, so this was invisible there).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-retry-count, x-admin-password',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    if (!adminPassword) {
      return json({ error: 'ADMIN_PASSWORD is not configured on the server' }, 500);
    }

    const suppliedPassword = req.headers.get('x-admin-password') ?? '';
    if (!timingSafeEqual(suppliedPassword, adminPassword)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server misconfigured' }, 500);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, table } = body ?? {};

    // action: 'ping' just verifies the password without touching a table —
    // used by the admin login screen.
    if (action === 'ping') {
      return json({ ok: true });
    }

    if (typeof table !== 'string' || !ALLOWED_TABLES.has(table)) {
      return json({ error: `Table not allowed: ${table}` }, 400);
    }

    if (action === 'select') {
      const { columns, eq, order, range, limit } = body;
      let q = admin.from(table).select(typeof columns === 'string' ? columns : '*');
      for (const f of eq ?? []) q = q.eq(f.column, f.value);
      if (order) q = q.order(order.column, { ascending: order.ascending !== false, nullsFirst: order.nullsFirst });
      if (range) q = q.range(range[0], range[1]);
      if (typeof limit === 'number') q = q.limit(limit);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === 'insert') {
      const { rows } = body;
      if (!rows) return json({ error: 'rows is required' }, 400);
      const { data, error } = await admin.from(table).insert(rows).select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === 'update') {
      const { patch, eq, in: inFilter } = body;
      if (!patch) return json({ error: 'patch is required' }, 400);
      let q = admin.from(table).update(patch);
      for (const f of eq ?? []) q = q.eq(f.column, f.value);
      if (inFilter) q = q.in(inFilter.column, inFilter.values);
      if ((eq ?? []).length === 0 && !inFilter) {
        return json({ error: 'update requires eq or in filter' }, 400);
      }
      const { data, error } = await q.select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    if (action === 'delete') {
      const { eq } = body;
      if (!eq || eq.length === 0) return json({ error: 'delete requires eq filter' }, 400);
      let q = admin.from(table).delete();
      for (const f of eq) q = q.eq(f.column, f.value);
      const { data, error } = await q.select();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('admin-db error', err);
    return json({ error: (err as Error).message }, 500);
  }
});
