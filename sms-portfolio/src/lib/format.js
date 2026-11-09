export const pkr = (value) => `PKR ${Math.round(Number(value) || 0).toLocaleString('en-US')}`

export const pkrCompact = (value) =>
  `PKR ${new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)}`

export const pct = (value) => (value == null || Number.isNaN(value) ? '–' : `${Math.round(value)}%`)

/** Local calendar date as YYYY-MM-DD (avoids the UTC shift of toISOString). */
export function toISODate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysAgo(count, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() - count)
  return d
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export const formatDate = (iso) => (iso ? dateFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00`)) : '–')
export const formatShortDate = (iso) => shortFmt.format(new Date(`${iso.slice(0, 10)}T00:00:00`))

export function formatTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

export function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}
