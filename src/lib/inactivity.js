export const INACTIVITY_HOME_LIMIT_MS = 5 * 60 * 1000

export function isInactivityExpired() {
  const last = Number(localStorage.getItem('pb_lastInteractionAt') || 0)
  return Date.now() - last > INACTIVITY_HOME_LIMIT_MS
}

export function markActivity() {
  localStorage.setItem('pb_lastInteractionAt', String(Date.now()))
}
