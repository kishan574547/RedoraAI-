import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://ywcdkmmpvgyfxmjdawul.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Y2RrbW1wdmd5ZnhtamRhd3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MjM1ODIsImV4cCI6MjA5OTM5OTU4Mn0.g1DBGh0qxE3c5fYA_hcMYFqyr-QEKNuYxWPIVxsHUe8'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

console.log('Supabase Client Init - URL:', supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING')
console.log('Supabase Client Init - Key:', supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'MISSING')

export const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
