import type { ReactNode } from 'react'

type PageHeaderProps = {
  breadcrumbs: string[]
  title: string
  actions?: ReactNode
}

export default function PageHeader({ breadcrumbs, title, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted sm:text-sm">
          {breadcrumbs.join(' / ')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
