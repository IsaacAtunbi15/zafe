import { supabase } from './supabase';

export async function signUp(email, password, name='') {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase.auth.signUp({ email, password, options: { data: { name } } });
}
export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signOut() {
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}
export async function resetPassword(email, redirectTo=window.location.origin) {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}
export function onAuthStateChange(callback) {
  if (!supabase) return { data: { subscription: { unsubscribe() {} } } };
  return supabase.auth.onAuthStateChange(callback);
}
