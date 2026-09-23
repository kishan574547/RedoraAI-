import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || ''
const supabaseKey = (import.meta && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY)) || ''

if (!supabaseUrl || !supabaseKey) {
  console.warn('[LifeOS] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined in environment.')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder-key')

export default supabase
