import type { SVGProps } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useImportInProgress } from "../hooks/useImportInProgress";
import { ROUTES } from "../lib/routes";
import BrandMark from "./BrandMark";

type SidebarProps = {
  onNavigate?: () => void;
};

const linkBase =
  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-muted transition-colors hover:bg-surface-2 hover:text-white";
const linkActive =
  "border-l-2 border-accent bg-accent/15 pl-[10px] text-white shadow-[inset_3px_0_0_0] shadow-accent";

function IconDashboard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconUpload(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <path d="M12 15V3m0 0 4 4m-4-4L8 7" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function IconAnalysis(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconSettings(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconReport(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

const navItems = [
  { to: ROUTES.dashboard, label: "Dashboard", Icon: IconDashboard },
  { to: ROUTES.upload, label: "Upload Footage", Icon: IconUpload },
  { to: ROUTES.analysis, label: "Analysis", Icon: IconAnalysis },
  { to: ROUTES.reports, label: "Reports", Icon: IconReport },
] as const;

const navDisabledDuringImport: Partial<
  Record<(typeof navItems)[number]["to"], string>
> = {
  [ROUTES.analysis]:
    "Analysis is unavailable while a video upload or import is in progress.",
  [ROUTES.reports]:
    "Reports are unavailable while a video upload or import is in progress.",
};

export default function Sidebar({ onNavigate }: SidebarProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const importInProgress = useImportInProgress();

  const onLogout = () => {
    auth.logout();
    onNavigate?.();
    void navigate(ROUTES.login, { replace: true });
  };

  return (
    <aside
      id="primary-navigation"
      className="flex h-full min-h-0 w-full flex-col border-r border-border bg-surface-1 md:w-64"
    >
      <div className="border-b border-border px-4 py-5">
        <BrandMark />
      </div>

      <nav
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
        aria-label="Primary"
      >
        {navItems.map(({ to, label, Icon }) => {
          const disabledHint = navDisabledDuringImport[to];
          const disabled = Boolean(disabledHint) && importInProgress;

          if (disabled) {
            return (
              <span
                key={to}
                title={disabledHint}
                aria-disabled="true"
                className={`${linkBase} cursor-not-allowed border-l-2 border-transparent pl-[10px] opacity-45`}
              >
                <Icon className="size-5 shrink-0 text-current opacity-90" />
                <span>{label}</span>
              </span>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "border-l-2 border-transparent pl-[10px]"}`
              }
            >
              <Icon className="size-5 shrink-0 text-current opacity-90" />
              <span>{label}</span>
            </NavLink>
          );
        })}

        <div className="mt-auto border-t border-border pt-3">
          <button
            type="button"
            onClick={onLogout}
            className={`${linkBase} w-full border-l-2 border-transparent pl-[10px] text-left`}
          >
            <IconSettings className="size-5 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
