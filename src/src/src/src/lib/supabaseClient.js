import { createClient } from '@supabase/supabase-js'

// Diese Werte sind bewusst hier direkt eingetragen: der Publishable Key
// ist für den Einsatz im Browser gedacht und darf öffentlich sichtbar sein.
// Niemals den "secret" bzw. "service_role" Key hier eintragen.
const SUPABASE_URL = 'https://zwsojyxvynxbeufrbbty.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_n3u0HbVswPOoEgA6XWyn5Q_5bFmmaJS'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
