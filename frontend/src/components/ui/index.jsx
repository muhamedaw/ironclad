// ─── Button ──────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-display font-bold tracking-widest uppercase rounded-lg transition-all duration-200 select-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 active:scale-95';

  const variants = {
    primary: 'bg-charcoal-900 text-cream-100 hover:bg-charcoal-800 disabled:bg-steel-600 disabled:cursor-not-allowed',
    secondary: 'bg-cream-100 text-charcoal-900 border border-cream-200 hover:bg-cream-200 disabled:opacity-50 disabled:cursor-not-allowed',
    amber: 'bg-amber-400 text-charcoal-900 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'bg-transparent text-charcoal-900 hover:bg-cream-100 disabled:opacity-50',
    danger: 'bg-rust-500 text-cream-50 hover:bg-rust-600 disabled:opacity-50',
    outline: 'border border-charcoal-900 text-charcoal-900 hover:bg-charcoal-900 hover:text-cream-100',
  };

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Loading…
        </>
      ) : children}
    </button>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
export function Badge({ children, color = 'default', className = '' }) {
  const colors = {
    default: 'bg-cream-200 text-steel-700',
    amber: 'bg-amber-400/20 text-amber-600 border border-amber-400/30',
    rust: 'bg-rust-500/15 text-rust-500 border border-rust-500/30',
    green: 'bg-green-500/15 text-green-700 border border-green-500/30',
    charcoal: 'bg-charcoal-900 text-cream-100',
    steel: 'bg-steel-700 text-cream-200',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Input ───────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-display font-semibold tracking-widest uppercase text-steel-600 mb-1.5">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-cream-100 border ${error ? 'border-rust-500' : 'border-cream-200'} rounded-lg px-3.5 py-2.5 text-sm font-mono text-charcoal-900 placeholder-steel-400
          focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-colors
          ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-mono text-rust-500">{error}</p>}
    </div>
  );
}

// ─── Divider ─────────────────────────────────────────────────────
export function Divider({ label }) {
  if (!label) return <hr className="border-cream-200" />;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 border-t border-cream-200" />
      <span className="text-xs font-mono text-steel-400">{label}</span>
      <div className="flex-1 border-t border-cream-200" />
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────
export function EmptyState({ icon = '🔍', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="font-display font-bold text-xl tracking-wide text-charcoal-900 mb-2">{title}</h3>
      {description && <p className="text-sm font-mono text-steel-400 max-w-xs">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── QuantitySelector ────────────────────────────────────────────
export function QuantitySelector({ value, onChange, min = 1, max = 99 }) {
  return (
    <div className="inline-flex items-center border border-cream-200 rounded-lg overflow-hidden bg-cream-50">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-9 h-9 flex items-center justify-center text-steel-600 hover:bg-cream-100 hover:text-charcoal-900 disabled:opacity-30 transition-colors font-mono text-lg"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-mono font-medium text-charcoal-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 flex items-center justify-center text-steel-600 hover:bg-cream-100 hover:text-charcoal-900 disabled:opacity-30 transition-colors font-mono text-lg"
      >
        +
      </button>
    </div>
  );
}
