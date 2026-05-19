function uniquifyDomIdsForPrintClone(root: HTMLElement): void {
  const withIds = [...root.querySelectorAll<HTMLElement>('[id]')]
  const suffix = `p${Date.now().toString(36)}`
  const pairs = withIds
    .map((el, i) => {
      const old = el.id
      if (!old) return null
      return { el, old, next: `${old}-${suffix}-${i}` }
    })
    .filter((p): p is { el: HTMLElement; old: string; next: string } => p !== null)

  const map = new Map<string, string>()
  for (const { el, old, next } of pairs) {
    map.set(old, next)
    el.id = next
  }

  const replaceUrls = (value: string): string => {
    let out = value
    for (const [oldId, newId] of map) {
      out = out.split(`url(#${oldId})`).join(`url(#${newId})`)
      out = out.split(`url('#${oldId}')`).join(`url('#${newId}')`)
      out = out.split(`url("#${oldId}")`).join(`url("#${newId}")`)
    }
    return out
  }

  const attrNames = ['clip-path', 'mask', 'fill', 'stroke', 'filter', 'href'] as const
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    for (const attr of attrNames) {
      const v = el.getAttribute(attr)
      if (!v || !v.includes('url(')) continue
      const next = replaceUrls(v)
      if (next !== v) el.setAttribute(attr, next)
    }
    const st = el.getAttribute('style')
    if (st && st.includes('url(')) {
      const next = replaceUrls(st)
      if (next !== st) el.setAttribute('style', next)
    }
  })
}

export function printInspectionReport(): void {
  const doc = document.getElementById('report-document')
  if (!doc) {
    window.print()
    return
  }

  const wrapper = document.createElement('div')
  wrapper.className = 'report-print-root'
  const clone = doc.cloneNode(true) as HTMLElement
  clone.id = 'report-document-print'
  uniquifyDomIdsForPrintClone(clone)
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)
  document.body.classList.add('printing-report')

  const cleanup = () => {
    document.body.classList.remove('printing-report')
    wrapper.remove()
    window.removeEventListener('afterprint', cleanup)
  }

  window.addEventListener('afterprint', cleanup)
  window.print()
}
