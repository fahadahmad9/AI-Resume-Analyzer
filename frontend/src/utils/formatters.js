export function humanizeKey(value) {
  return String(value || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase())
}

export function clampScore(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return null
  return Math.max(0, Math.min(100, Number(value)))
}

export function scoreBand(value) {
  const score = clampScore(value)
  if (score === null) return 'neutral'
  if (score < 50) return 'danger'
  if (score < 75) return 'warning'
  return 'success'
}

export function formatDateRange(item) {
  if (!item) return ''
  if (typeof item === 'string') return ''
  return [item.startDate || item.start || item.from, item.endDate || item.end || item.to]
    .filter(Boolean)
    .join(' - ')
}

export function itemText(item) {
  if (typeof item === 'string') return item
  return item?.title || item?.name || item?.description || item?.text || ''
}

export function itemBullets(item) {
  if (typeof item === 'string') return []
  const bullets = item?.bullets || item?.responsibilities || item?.highlights || []
  return Array.isArray(bullets) ? bullets : []
}
