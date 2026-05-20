import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BrandMark from "../components/BrandMark";
import { useAuth } from "../features/auth/AuthContext";
import { ROUTES } from "../lib/routes";
import shipHullImg from "../assets/ship-hull.jpg";
import krovLogoImg from "../assets/krov-logo.png";

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setLoginError(null);
    const result = await auth.login(username, password);
    setLoading(false);
    if (!result.ok) {
      setLoginError(result.message);
      return;
    }
    void navigate(ROUTES.dashboard, { replace: true });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto bg-surface-0 lg:flex-row">
      <section
        className="relative flex min-h-[min(100dvh,52rem)] flex-1 flex-col justify-between overflow-hidden px-5 py-8 sm:px-8 sm:py-10 lg:h-full lg:min-h-0 lg:px-12 lg:py-12 xl:px-16"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(11, 18, 32, 1) 0%, rgba(11, 18, 32, 0.9) 20%, rgba(11, 18, 32, 0.4) 50%, rgba(11, 18, 32, 0.1) 70%), url('${shipHullImg}')`,
          backgroundPosition: "right center",
          backgroundSize: "cover",
          backgroundAttachment: "fixed",
        }}
      >
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
            Professional biofouling inspection and compliance reporting for
            maritime operators worldwide.
          </p>
        </div>

        <div className="relative z-10 flex flex-col items-end justify-between gap-6 lg:flex-row lg:items-end">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium tracking-wide text-muted">
              Partnered with
            </p>
            <img src={krovLogoImg} alt="KROV" className="h-auto w-20 sm:w-24" />
          </div>
          <p className="text-sm italic font-light text-slate-400 opacity-75 lg:text-right lg:text-base">
            Solving an old problem with a new approach
          </p>
        </div>
      </section>

      <section className="flex w-full flex-1 flex-col justify-center bg-white px-5 py-10 sm:px-8 sm:py-12 lg:h-full lg:min-h-0 lg:w-[26%] lg:shrink-0 lg:px-10 xl:px-12">
        <div className="mx-auto w-full max-w-md flex-1 space-y-8 lg:flex lg:max-w-none lg:flex-col lg:justify-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm text-slate-600">
              Sign in to your account to continue
            </p>
          </div>

          <form
            className="space-y-5"
            onSubmit={(e) => {
              void onSubmit(e);
            }}
          >
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="email"
              >
                Email or Username
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder="yourname@gmail.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-accent/40 placeholder:text-slate-400 focus:border-accent focus:ring-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
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

            {loginError ? (
              <p className="text-sm text-red-600">{loginError}</p>
            ) : null}

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="size-4 rounded border-slate-300 text-accent focus:ring-accent"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <a
              href="#access"
              className="font-semibold text-accent hover:text-accent-hover"
              onClick={(e) => e.preventDefault()}
            >
              Request access
            </a>
          </p>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            By signing in you agree to our{" "}
            <a
              href="#terms"
              className="underline-offset-2 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#privacy"
              className="underline-offset-2 hover:underline"
              onClick={(e) => e.preventDefault()}
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
