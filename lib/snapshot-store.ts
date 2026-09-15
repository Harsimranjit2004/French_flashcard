import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { userSnapshots } from "../db/schema";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

export async function loadSnapshot(userId: string) {
  const config = supabaseConfig();
  if (!config) {
    const [row] = await getDb().select().from(userSnapshots).where(eq(userSnapshots.userId, userId)).limit(1);
    return row?.payload ?? null;
  }
  const endpoint = new URL(`${config.url}/rest/v1/user_snapshots`);
  endpoint.searchParams.set("user_id", `eq.${userId}`);
  endpoint.searchParams.set("select", "payload");
  endpoint.searchParams.set("limit", "1");
  const response = await fetch(endpoint, { headers: { apikey: config.key, authorization: `Bearer ${config.key}` } });
  if (!response.ok) throw new Error(`Supabase read failed (${response.status})`);
  const rows = await response.json() as Array<{ payload?: unknown }>;
  const payload = rows[0]?.payload;
  return payload == null ? null : typeof payload === "string" ? payload : JSON.stringify(payload);
}

export async function saveSnapshot(userId: string, payload: string) {
  const config = supabaseConfig();
  if (!config) {
    await getDb().insert(userSnapshots).values({ userId, payload, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: userSnapshots.userId, set: { payload, updatedAt: new Date().toISOString() } });
    return;
  }
  const endpoint = new URL(`${config.url}/rest/v1/user_snapshots`);
  endpoint.searchParams.set("on_conflict", "user_id");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { apikey: config.key, authorization: `Bearer ${config.key}`, "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, payload: JSON.parse(payload), updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Supabase write failed (${response.status})`);
}
