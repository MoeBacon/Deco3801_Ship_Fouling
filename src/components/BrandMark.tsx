type BrandMarkProps = {
  /** `dark`: light text for navy sidebars / hero. `light`: dark text on white panels. */
  variant?: 'light' | 'dark'
  /** Tighter mark for the mobile top bar. */
  compact?: boolean
  className?: string
}

/** Anchor mark (rounded blue tile + wordmark) — matches supplied Hull Fouling Inspector header art. */
function LogoAnchor({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8v14" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
    </svg>
  )
}

export default function BrandMark({ variant = 'dark', compact = false, className = '' }: BrandMarkProps) {
  const textClass = variant === 'dark' ? 'text-white' : 'text-slate-900'
  const iconTile =
    variant === 'dark'
      ? 'bg-accent text-white shadow-sm shadow-accent/35'
      : 'bg-accent text-white shadow-sm shadow-accent/25'

  return (
    <div className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl ${iconTile} ${
          compact ? 'size-9 sm:size-10' : 'size-10 sm:size-11'
        }`}
      >
        <LogoAnchor className={compact ? 'size-[1.35rem]' : 'size-6'} />
      </div>
      <span
        className={`min-w-0 font-bold leading-none tracking-tight ${textClass} ${
          compact ? 'truncate text-sm sm:text-base' : 'text-base sm:text-lg'
        }`}
      >
        Hull Fouling Inspector
      </span>
    </div>
  )
}
