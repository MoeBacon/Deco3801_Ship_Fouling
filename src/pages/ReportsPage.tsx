import PageHeader from '../components/PageHeader'

export default function ReportsPage() {
  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col gap-6">
      <PageHeader breadcrumbs={['Inspections']} title="Reports" />

      <section className="rounded-xl border border-border bg-surface-1 p-6">
        <h2 className="text-base font-semibold text-white">Report builder</h2>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface-1 p-5">
          <p className="text-sm font-medium text-muted">Latest report</p>
          <p className="mt-2 text-lg font-semibold text-white">No report generated yet</p>
          <p className="mt-1 text-xs text-muted">Generate from an analysis run when AI output is available.</p>
        </article>

        <article className="rounded-xl border border-border bg-surface-1 p-5">
          <p className="text-sm font-medium text-muted">Export queue</p>
          <p className="mt-2 text-lg font-semibold text-white">0 pending exports</p>
          <p className="mt-1 text-xs text-muted">PDF and CSV exports will appear here.</p>
        </article>
      </section>
    </div>
  )
}
