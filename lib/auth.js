import { createClient } from '@/lib/supabase/server';

/**
 * Dev-only auth bypass.
 *
 * When DEV_AUTH_BYPASS=true AND we are not in a production build, every request
 * is treated as signed in as a fixed local user. This lets the app run (and be
 * driven by Playwright) without a Supabase project. It can never activate in a
 * production build: `next build` / Vercel always set NODE_ENV=production.
 */
export const DEV_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'dev@laser.local',
};

export function isDevAuthBypass() {
  return process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production';
}

/** Returns the signed-in user ({ id, email }) or null. Server-side only. */
export async function getUser() {
  if (isDevAuthBypass()) return DEV_USER;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
