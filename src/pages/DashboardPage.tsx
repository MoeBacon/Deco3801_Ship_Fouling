import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { ROUTES } from '../lib/routes'

export default function DashboardPage() {
  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col gap-6">
      <PageHeader breadcrumbs={['Inspections']} title="Dashboard" />

      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Inspections (30d)</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-muted">Connect API to populate</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Avg. severity</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-muted">Low / Moderate / Severe</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Footage hours</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-muted">Imported ROV video</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-1 p-5 shadow-sm">
          <p className="text-sm font-medium text-muted">Reports issued</p>
          <p className="mt-2 text-3xl font-semibold text-white">—</p>
          <p className="mt-1 text-xs text-muted">PDF / CSV exports</p>
        </article>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-3 lg:items-stretch">
        <section className="flex min-h-0 min-w-0 flex-col rounded-xl border border-border bg-surface-1 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <p className="mt-2 shrink-0 text-sm text-muted">
            Past inspections, uploads, and analysis runs will appear here once the backend is wired
            up.
          </p>
          <div className="mt-6 flex min-h-[min(18rem,40vh)] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-surface-0/60 px-4 py-10 text-center text-sm text-muted sm:min-h-[min(20rem,45vh)]">
            No activity yet — start from{' '}
            <Link className="font-medium text-accent hover:underline" to={ROUTES.upload}>
              Upload Footage
            </Link>
            .
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-xl border border-border bg-surface-1 p-6">
          <h2 className="text-lg font-semibold text-white">Severity legend</h2>
          <p className="mt-2 text-sm text-muted">Status colours used across the app.</p>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-status-low" />
              <span className="text-white">Low fouling</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-status-mod" />
              <span className="text-white">Moderate</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-status-sev" />
              <span className="text-white">Severe</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
