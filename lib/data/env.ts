/**
 * Public Supabase connection settings. Only the URL and the publishable (anon)
 * key are ever shipped to the browser; both are safe to expose because every
 * table is protected by row-level security. The service-role key lives only
 * in lib/data/admin.ts, which is server-only.
 */
export function supabaseEnv(): { url: string; key: string; configured: boolean } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";
  return { url, key, configured: Boolean(url && key) };
}
