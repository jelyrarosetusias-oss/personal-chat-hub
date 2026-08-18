import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const isServerSupabaseConfigured = Boolean(
  supabaseUrl && 
  serviceRoleKey && 
  !supabaseUrl.includes('your-project-id') &&
  supabaseUrl.startsWith('http')
)

export const getSupabaseAdmin = () => {
  if (!isServerSupabaseConfigured) {
    return null
  }
  return createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
