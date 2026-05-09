import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '../components/BrandMark'
import { useAuth } from '../features/auth/AuthContext'
import { ROUTES } from '../lib/routes'

export default function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = auth.login(username, password)
    if (!result.ok) {
      setLoginError(result.message)
      return
    }
    setLoginError(null)
    void navigate(ROUTES.dashboard, { replace: true })
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-surface-0 lg:flex-row">
      <section className="relative flex min-h-[min(100dvh,52rem)] flex-1 flex-col justify-between overflow-hidden bg-surface-0 px-5 py-8 sm:px-8 sm:py-10 lg:h-full lg:min-h-0 lg:flex-[1.15] lg:px-12 lg:py-12 xl:px-16">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-[min(100vw,28rem)] rounded-full bg-accent/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 size-[min(100vw,24rem)] rounded-full bg-accent/5 blur-3xl"
          aria-hidden
        />

        <BrandMark className="relative z-10 shrink-0" />

        <div className="relative z-10 mt-10 max-w-xl space-y-4 sm:mt-12 sm:space-y-5 lg:mt-0 lg:flex-1 lg:justify-center lg:self-start lg:pt-8">
          <h1 className="text-[clamp(1.75rem,4vw+1rem,3.25rem)] font-semibold leading-[1.12] tracking-tight text-white">
            Protecting hulls. Protecting oceans.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Professional biofouling inspection and compliance reporting for maritime operators
            worldwide.
          </p>
        </div>

        <div className="relative z-10 mt-10 grid max-w-lg grid-cols-2 gap-3 sm:mt-12 sm:gap-4 lg:mt-12 lg:mb-0">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
            <p className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">2,400+</p>
            <p className="mt-1 text-xs text-muted sm:text-sm">Vessels inspected</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
            <p className="text-xl font-semibold text-white sm:text-2xl lg:text-3xl">98.6%</p>
            <p className="mt-1 text-xs text-muted sm:text-sm">Compliance rate</p>
          </div>
        </div>
      </section>

      <section className="flex w-full flex-1 flex-col justify-center bg-white px-5 py-10 sm:px-8 sm:py-12 lg:h-full lg:min-h-0 lg:w-[min(100%,28rem)] lg:shrink-0 lg:px-10 xl:w-[32rem] xl:px-12">
        <div className="mx-auto w-full max-w-md flex-1 space-y-8 lg:flex lg:max-w-none lg:flex-col lg:justify-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-sm text-slate-600">Sign in to your account to continue</p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="email">
                Email or Username
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder="you@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-accent/40 placeholder:text-slate-400 focus:border-accent focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <a
                  href="#forgot"
                  className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
                  onClick={(e) => e.preventDefault()}
                >
                  Forgot password?
                </a>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-accent/40 placeholder:text-slate-400 focus:border-accent focus:ring-2"
              />
            </div>

            {loginError ? <p className="text-sm text-red-600">{loginError}</p> : null}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300 text-accent focus:ring-accent"
              />
              Remember me
            </label>

            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
            >
              Sign In
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <a
              href="#access"
              className="font-semibold text-accent hover:text-accent-hover"
              onClick={(e) => e.preventDefault()}
            >
              Request access
            </a>
          </p>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            By signing in you agree to our{' '}
            <a href="#terms" className="underline-offset-2 hover:underline" onClick={(e) => e.preventDefault()}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#privacy" className="underline-offset-2 hover:underline" onClick={(e) => e.preventDefault()}>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  )
}
