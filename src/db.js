import { createClient } from '@supabase/supabase-js'
//
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// window.storage ile aynı arayüz — App.jsx'te hiçbir şey değişmez
export const db = {
  async get(key) {
    try {
      const { data, error } = await supabase
        .from('storage')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      if (error || !data) return null
      return { value: data.value }
    } catch (e) {
      return null
    }
  },

  async set(key, value) {
    try {
      // JSON.stringify zorunlu — Supabase text kolonu string bekler
      const strValue = typeof value === 'string' ? value : JSON.stringify(value)
      await supabase
        .from('storage')
        .upsert({ key, value: strValue, updated_at: new Date().toISOString() })
    } catch (e) {
      console.error('db.set error:', e)
    }
  }
}
