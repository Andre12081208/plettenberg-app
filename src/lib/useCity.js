import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useCity() {
  const [city, setCity] = useState({ name: 'Plettenberg', primaryColor: '#1f4d3d' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData?.user?.id
      if (!userId) return

      let cityId = null
      const { data: priv } = await supabase.from('private_profiles').select('city_id').eq('id', userId).maybeSingle()
      if (priv?.city_id) cityId = priv.city_id
      if (!cityId) {
        const { data: biz } = await supabase.from('business_profiles').select('city_id').eq('id', userId).maybeSingle()
        if (biz?.city_id) cityId = biz.city_id
      }
      if (!cityId) return

      const { data: cityRow } = await supabase.from('cities').select('name, primary_color').eq('id', cityId).maybeSingle()
      if (cityRow && !cancelled) setCity({ name: cityRow.name, primaryColor: cityRow.primary_color })
    }
    load()
    return () => { cancelled = true }
  }, [])

  return city
}
