import { useState } from 'react';
import { useFilters } from '../../context/AppContext';
import { BRANDS, MODELS, YEARS, CATEGORIES } from '../../data/products';

// ─── FilterDropdown primitive ────────────────────────────────────
export function FilterDropdown({ label, value, onChange, options, placeholder }) {
  return (
    <div className="w-full">
      <label className="block text-xs font-display font-semibold tracking-widest uppercase text-steel-600 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-cream-100 border border-cream-200 rounded-lg px-3 py-2.5 text-sm font-mono text-charcoal-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-colors cursor-pointer pr-8"
        >
          <option value="">{placeholder}</option>
          {options.map(o => (
            <option key={typeof o === 'object' ? o.id : o} value={typeof o === 'object' ? o.id : o}>
              {typeof o === 'object' ? o.label : o}
            </option>
          ))}
        </select>
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-steel-400">
          <ChevronIcon />
        </div>
      </div>
    </div>
  );
}

// ─── Main Sidebar ────────────────────────────────────────────────
export default function FilterSidebar({ isOpen, onClose }) {
  const { filters, setFilters, resetFilters, activeCount } = useFilters();
  const [priceRange, setPriceRange] = useState(filters.priceMax);

  // Cascading model options
  const modelOptions = filters.brand ? MODELS[filters.brand] || [] : [];

  function handleBrandChange(brand) {
    setFilters({ brand, model: '' }); // reset model when brand changes
  }

  function handlePriceCommit(val) {
    setFilters({ priceMax: Number(val) });
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
        <div className="flex items-center gap-2">
          <h2 className="font-display font-bold text-base tracking-widest uppercase text-charcoal-900">
            Filters
          </h2>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 bg-amber-400 text-charcoal-900 text-xs font-black rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs font-mono text-rust-500 hover:text-rust-600 transition-colors"
            >
              Clear all
            </button>
          )}
          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-steel-500 hover:text-charcoal-900"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

        {/* ── Vehicle Matcher ─────────────────────── */}
        <section>
          <SectionLabel>Vehicle Matcher</SectionLabel>
          <div className="space-y-3 p-3 bg-charcoal-900/5 rounded-xl border border-cream-200">
            <FilterDropdown
              label="Brand"
              value={filters.brand}
              onChange={handleBrandChange}
              options={BRANDS}
              placeholder="All Brands"
            />
            <FilterDropdown
              label="Model"
              value={filters.model}
              onChange={v => setFilters({ model: v })}
              options={modelOptions}
              placeholder={filters.brand ? 'Select Model' : '— Select brand first —'}
            />
            <FilterDropdown
              label="Year"
              value={filters.year}
              onChange={v => setFilters({ year: v })}
              options={YEARS}
              placeholder="Any Year"
            />
          </div>
        </section>

        {/* ── Category ────────────────────────────── */}
        <section>
          <SectionLabel>Category</SectionLabel>
          <div className="space-y-1">
            <button
              onClick={() => setFilters({ category: '' })}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-colors text-left
                ${!filters.category
                  ? 'bg-charcoal-900 text-cream-100'
                  : 'text-steel-600 hover:bg-cream-100 hover:text-charcoal-900'}`}
            >
              <span>🔧</span> All Categories
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilters({ category: filters.category === cat.id ? '' : cat.id })}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-colors text-left
                  ${filters.category === cat.id
                    ? 'bg-amber-400 text-charcoal-900 font-semibold'
                    : 'text-steel-600 hover:bg-cream-100 hover:text-charcoal-900'}`}
              >
                <span>{cat.icon}</span> {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Price Range ──────────────────────────── */}
        <section>
          <SectionLabel>
            <span>Price Range</span>
            <span className="font-mono text-amber-500 font-normal">$0 — ${priceRange}</span>
          </SectionLabel>
          <div className="space-y-3">
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={priceRange}
              onChange={e => setPriceRange(e.target.value)}
              onMouseUp={e => handlePriceCommit(e.target.value)}
              onTouchEnd={e => handlePriceCommit(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs font-mono text-steel-400">
              <span>$0</span>
              <span>$500+</span>
            </div>
          </div>
        </section>

        {/* ── Sort By ──────────────────────────────── */}
        <section>
          <SectionLabel>Sort By</SectionLabel>
          <div className="space-y-1">
            {[
              { value: 'featured', label: 'Featured' },
              { value: 'newest', label: 'Newest First' },
              { value: 'price-asc', label: 'Price: Low → High' },
              { value: 'price-desc', label: 'Price: High → Low' },
              { value: 'rating', label: 'Highest Rated' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilters({ sortBy: opt.value })}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-mono transition-colors text-left
                  ${filters.sortBy === opt.value
                    ? 'bg-charcoal-900 text-cream-100'
                    : 'text-steel-600 hover:bg-cream-100 hover:text-charcoal-900'}`}
              >
                {filters.sortBy === opt.value && (
                  <span className="text-amber-400">✓</span>
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Options ──────────────────────────────── */}
        <section>
          <SectionLabel>Options</SectionLabel>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={filters.inStockOnly}
              onChange={e => setFilters({ inStockOnly: e.target.checked })}
              className="custom-check"
            />
            <span className="text-sm font-mono text-steel-700 group-hover:text-charcoal-900 transition-colors">
              In Stock Only
            </span>
          </label>
        </section>

      </div>

      {/* Footer CTA on mobile */}
      <div className="lg:hidden px-5 py-4 border-t border-cream-200">
        <button
          onClick={onClose}
          className="w-full py-3 bg-charcoal-900 text-cream-100 rounded-lg font-display font-bold tracking-widest uppercase text-sm hover:bg-charcoal-800 transition-colors"
        >
          Apply Filters {activeCount > 0 && `(${activeCount})`}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 xl:w-64 flex-shrink-0 bg-cream-50 border border-cream-200 rounded-xl h-fit sticky top-24 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-charcoal-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-cream-50 z-50 lg:hidden shadow-2xl animate-slide-in-right overflow-hidden">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

function SectionLabel({ children }) {
  return (
    <h3 className="flex items-center justify-between font-display font-bold text-xs tracking-widest uppercase text-charcoal-900 mb-2.5">
      {children}
    </h3>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
