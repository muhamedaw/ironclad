// ─── ProductCardSkeleton ─────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div className="bg-cream-50 border border-cream-200 rounded-xl overflow-hidden">
      {/* Image */}
      <div className="aspect-[4/3] skeleton-shimmer" />
      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 skeleton-shimmer rounded" />
        <div className="space-y-1.5">
          <div className="h-4 w-full skeleton-shimmer rounded" />
          <div className="h-4 w-3/4 skeleton-shimmer rounded" />
        </div>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 w-3 skeleton-shimmer rounded-sm" />
          ))}
          <div className="h-3 w-8 skeleton-shimmer rounded ml-1" />
        </div>
        <div className="h-6 w-20 skeleton-shimmer rounded" />
        <div className="h-10 w-full skeleton-shimmer rounded-lg" />
      </div>
    </div>
  );
}

// ─── Grid skeleton ───────────────────────────────────────────────
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}

// ─── Loader spinner ──────────────────────────────────────────────
export function Loader({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className={`${s} ${className}`}>
      <svg className="animate-spin text-amber-400" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

// ─── Page-level skeleton ─────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader size="lg" />
        <p className="text-sm font-mono text-steel-400 tracking-widest animate-pulse">Loading…</p>
      </div>
    </div>
  );
}

// ─── Inline loading dots ─────────────────────────────────────────
export function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 0.15, 0.3].map((delay, i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  );
}
