import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null

export const hasSupabase = !!supabase

export const HF_TOKEN = (import.meta.env.VITE_HF_TOKEN as string | undefined) || ''
export const hasHF = !!HF_TOKEN

export const GEMINI_KEY = (import.meta.env.VITE_GEMINI_KEY as string | undefined) || ''
export const hasGemini = !!GEMINI_KEY