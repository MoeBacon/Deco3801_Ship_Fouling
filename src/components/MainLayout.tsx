import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import BrandMark from './BrandMark'
import Sidebar from './Sidebar'

export default function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="flex h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface-0 text-slate-100 md:flex-row">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <div
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,100%)] max-w-full transform transition-transform duration-200 ease-out md:static md:z-0 md:flex md:h-full md:shrink-0 md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onNavigate={closeMobileNav} />
      </div>

      <div id="app-main-content" className="flex min-h-0 min-w-0 flex-1 flex-col md:h-full md:min-h-0">
        <div id="app-mobile-header" className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-0 px-3 py-2.5 sm:px-4 md:hidden">
          <BrandMark variant="dark" compact className="min-w-0 flex-1" />
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-medium text-white hover:bg-surface-2"
            aria-expanded={mobileNavOpen}
            aria-controls="primary-navigation"
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            Menu
          </button>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-surface-0">
          <div className="flex min-h-full w-full min-w-0 flex-col px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 xl:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
