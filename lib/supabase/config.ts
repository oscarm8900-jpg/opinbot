// Server-side config — uses the same swap-detection as layout.tsx
const _v1 = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const _v2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const _isUrl = (v: string) => v.startsWith("https://") || v.startsWith("http://");

export const SUPABASE_URL = _isUrl(_v1) ? _v1 : _v2;
export const SUPABASE_ANON_KEY = _isUrl(_v1) ? _v2 : _v1;
