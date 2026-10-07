import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!supabaseConfigured) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY. On Vercel add them under Project > Settings > Environment Variables, then redeploy.');
}

// Placeholder values keep the app from crashing on load when the variables are missing;
// the forms show a clear "not configured" message instead.
export const supabase = createClient(supabaseUrl || 'https://not-configured.invalid', supabaseKey || 'not-configured');

// Turn Supabase / network errors into plain words.
export function friendlyError(err, fallback = 'Something went wrong. Please try again.') {
  const m = String(err?.message || '');
  if (!supabaseConfigured) return 'The app is not connected to Supabase yet (missing environment variables on Vercel).';
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'Cannot reach Supabase. Check your internet connection and the VITE_SUPABASE_URL value.';
  if (/already registered|already been registered/i.test(m)) return 'That email is already registered. Try signing in instead.';
  if (/profiles_adm_no_key|adm_no/i.test(m) && /duplicate|unique/i.test(m)) return 'That admission number is already registered.';
  if (/rate limit/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your email first (check your inbox), then sign in.';
  if (/invalid login credentials/i.test(m)) return 'Wrong email or password.';
  return m || fallback;
}
