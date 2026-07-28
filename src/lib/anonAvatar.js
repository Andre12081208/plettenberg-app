export const ANON_AVATAR_BANK = [
  { key: 'emoji:🦊', color: '#D98A4B' },
  { key: 'emoji:🦉', color: '#7B8FA6' },
  { key: 'emoji:🐢', color: '#6FA98A' },
  { key: 'emoji:🦁', color: '#D9B23C' },
  { key: 'emoji:🐧', color: '#4A6FA5' },
  { key: 'emoji:🦋', color: '#B07CC6' },
  { key: 'emoji:🐬', color: '#5AA9C9' },
  { key: 'emoji:🦔', color: '#A3714F' }
]

export function renderAnonAvatar(value) {
  if (!value) return { type: 'placeholder', content: '🕶️', color: '#9CA3AF' }
  if (value.startsWith('emoji:')) {
    const emoji = value.replace('emoji:', '')
    const bankEntry = ANON_AVATAR_BANK.find((b) => b.key === value)
    return { type: 'emoji', content: emoji, color: bankEntry?.color || '#9CA3AF' }
  }
  return { type: 'image', content: value }
}
