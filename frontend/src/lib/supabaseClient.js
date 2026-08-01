import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://ywcdkmmpvgyfxmjdawul.supabase.co'
const DEFAULT_SUPABASE_KEY = 'sb_publishable_S1g6usn_rfOkb4Wz9H7FQg_YcIG-DSs'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3Y2RrbW1wdmd5ZnhtamRhd3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MjM1ODIsImV4cCI6MjA5OTM5OTU4Mn0.g1DBGh0qxE3c5fYA_hcMYFqyr-QEKNuYxWPIVxsHUe8'

const supabaseUrl = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL
const supabaseKey = (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_KEY || DEFAULT_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
