import { supabase } from './supabaseClient'

export async function maybeRemoveFromHomeBoard(userId, appType, matchValue) {
  const query = supabase.from('home_board_tiles').select('id').eq('user_id', userId).eq('app_type', appType)
  const { data } = appType === 'system'
    ? await query.eq('app_key', matchValue)
    : await query.eq('business_profile_id', matchValue)

  if (data && data.length > 0) {
    const alsoRemove = window.confirm('Diese App liegt auch auf deinem Homeboard. Möchtest du die Kachel dort auch entfernen?')
    if (alsoRemove) {
      await supabase.from('home_board_tiles').delete().in('id', data.map((d) => d.id))
    }
  }
}
