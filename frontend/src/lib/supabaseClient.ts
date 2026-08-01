import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('Supabase Client Init - URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING')
console.log('Supabase Client Init - Key:', supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'MISSING')

export const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
