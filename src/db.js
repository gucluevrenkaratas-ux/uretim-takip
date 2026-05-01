import { createClient } from '@supabase/supabase-js'

// URL sonundaki slash veya /rest/v1 varsa temizle
const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')

const supabase = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const db = {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from('app_data')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      if (error || !data) return null
      return JSON.parse(data.value)
    } catch (e) {
      return null
    }
  },

  async set(key, value) {
    try {
      const strValue = typeof value === 'string' ? value : JSON.stringify(value)
      await supabase
        .from('app_data')
        .upsert({ key, value: strValue, updated_at: new Date().toISOString() })
    } catch (e) {
      console.error('db.set error:', e)
    }
  }
}
