import { createClient } from '@supabase/supabase-js'

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')) 
  ? rawUrl 
  : 'https://ltjzvdclfhcundlbjqta.supabase.co'

const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseAnonKey = (rawKey && typeof rawKey === 'string' && rawKey.length > 20) 
  ? rawKey 
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0anp2ZGNsZmhjdW5kbGJqcXRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MDc0NDgsImV4cCI6MjEwMjI4MzQ0OH0.9cEdF_P43Ng0sbWCO5oVF7DxGGoT4aQBwQuwJHbd4So'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


