import { createClient } from '@supabase/supabase-js';

const meta = import.meta as any;
const supabaseUrl = (meta.env && meta.env.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (meta.env && meta.env.VITE_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
