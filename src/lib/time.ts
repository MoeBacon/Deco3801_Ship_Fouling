export function formatTimestamp(seconds?: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '—'
  const sec = Math.floor(seconds)
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Under 1 min: seconds; 1 min to under 1 h: minutes; 1 h+: hours (and minutes/seconds when needed). */
export function formatFootageDurationAdaptive(sec: number): { display: string; hint: string } {
  if (!Number.isFinite(sec) || sec < 0) {
    return { display: '—', hint: '' }
  }
  if (sec < 60) {
    return { display: `${sec.toFixed(1)}s`, hint: 'Seconds' }
  }
  if (sec < 3600) {
    const min = sec / 60
    return { display: `${min.toFixed(1)} min`, hint: 'Minutes' }
  }
  const h = Math.floor(sec / 3600)
  const remAfterH = sec - h * 3600
  const m = Math.floor(remAfterH / 60)
  const s = remAfterH - m * 60
  const parts: string[] = [`${h} hr`]
  if (m > 0) parts.push(`${m} min`)
  if (s >= 0.05) parts.push(`${s.toFixed(1)}s`)
  return { display: parts.join(' '), hint: 'Hours' }
}
