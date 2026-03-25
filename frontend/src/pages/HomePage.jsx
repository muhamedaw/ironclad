import { useState, useEffect, useMemo } from 'react';
import FilterSidebar from '../components/filters/FilterSidebar';
import ProductCard from '../components/product/ProductCard';
import VideoCard from '../components/video/VideoCard';
import { ProductGridSkeleton, Loader } from '../components/skeleton/Skeletons';
import { EmptyState, Button } from '../components/ui/index';
import { useFilters } from '../context/AppContext';
import { useFilteredProducts, useInfiniteScroll, useScrollReveal } from '../hooks';
import { TUTORIAL_VIDEOS, CATEGORIES } from '../data/products';

const VIDEO_INJECT_INTERVAL = 5; // inject a video after every N products

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { filters, setFilters, activeCount } = useFilters();
  const getFiltered = useFilteredProducts();

  // Trigger scroll reveal on every render cycle
  useScrollReveal();

  // Simulate initial load
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Memoize filtered list
  const filteredProducts = useMemo(() => getFiltered(), [getFiltered]);

  // Infinite scroll
  const { visibleItems, hasMore, loading: loadingMore, loaderRef } = useInfiniteScroll(filteredProducts);

  // Build the interleaved list: products + videos injected every N items
  const interleaved = useMemo(() => {
    const result = [];
    let videoIdx = 0;
    for (let i = 0; i < visibleItems.length; i++) {
      result.push({ type: 'product', data: visibleItems[i], key: visibleItems[i].id });
      if ((i + 1) % VIDEO_INJECT_INTERVAL === 0 && videoIdx < TUTORIAL_VIDEOS.length) {
        result.push({ type: 'video', data: TUTORIAL_VIDEOS[videoIdx % TUTORIAL_VIDEOS.length], key: `vid-${videoIdx}` });
        videoIdx++;
      }
    }
    return result;
  }, [visibleItems]);

  const activeCat = CATEGORIES.find(c => c.id === filters.category);

  return (
    <div className="min-h-screen bg-cream-50">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="bg-charcoal-900 relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px)',
          }}
        />
        <div className="relative max-w-screen-xl mx-auto px-4 md:px-6 py-14 md:py-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-full mb-5">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-xs font-mono text-amber-400 tracking-widest">12,450+ OEM-grade parts in stock</span>
            </div>
            <h1 className="font-display font-black text-5xl md:text-6xl lg:text-7xl text-cream-100 leading-none tracking-wider uppercase mb-4">
              The Right Part,<br />
              <span className="text-amber-400">First Time.</span>
            </h1>
            <p className="text-steel-400 font-serif font-light text-lg md:text-xl leading-relaxed mb-8 max-w-xl">
              OEM-grade replacement parts for every make, model, and year.
              Fast shipping. 30-day returns. Guaranteed fitment.
            </p>
            {/* Quick search */}
            <QuickCategoryBar setFilters={setFilters} activeCategory={filters.category} />
          </div>
        </div>
      </section>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-8">
        <div className="flex gap-6 lg:gap-8">

          {/* Sidebar */}
          <FilterSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          {/* Product area */}
          <main className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                {/* Mobile filter button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-3 py-2 bg-cream-50 border border-cream-200 rounded-lg text-sm font-display font-semibold tracking-wide text-steel-700 hover:border-amber-400 transition-colors"
                >
                  <FilterIcon />
                  Filters
                  {activeCount > 0 && (
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-amber-400 text-charcoal-900 text-xs font-black rounded-full">
                      {activeCount}
                    </span>
                  )}
                </button>

                {/* Result count */}
                <p className="text-sm font-mono text-steel-500">
                  {initialLoading ? (
                    <span className="skeleton-shimmer inline-block w-32 h-4 rounded" />
                  ) : (
                    <>
                      <span className="font-semibold text-charcoal-900">{filteredProducts.length.toLocaleString()}</span>
                      {' '}parts
                      {activeCat && <span className="text-amber-600"> · {activeCat.label}</span>}
                      {filters.brand && <span className="text-amber-600"> · {filters.brand}</span>}
                    </>
                  )}
                </p>
              </div>

              {/* Active filter chips */}
              {activeCount > 0 && (
                <div className="hidden sm:flex items-center gap-2 flex-wrap">
                  {filters.brand && <FilterChip label={filters.brand} onRemove={() => setFilters({ brand: '', model: '' })} />}
                  {filters.model && <FilterChip label={filters.model} onRemove={() => setFilters({ model: '' })} />}
                  {filters.year && <FilterChip label={filters.year} onRemove={() => setFilters({ year: '' })} />}
                  {filters.category && <FilterChip label={activeCat?.label} onRemove={() => setFilters({ category: '' })} />}
                  {filters.inStockOnly && <FilterChip label="In Stock" onRemove={() => setFilters({ inStockOnly: false })} />}
                </div>
              )}
            </div>

            {/* Grid */}
            {initialLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <ProductGridSkeleton count={8} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                icon="🔩"
                title="No parts found"
                description="Try adjusting your filters or search query to find what you're looking for."
                action={
                  <Button variant="amber" onClick={() => setFilters({ brand: '', model: '', year: '', category: '', search: '', inStockOnly: false })}>
                    Clear All Filters
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {interleaved.map((item, idx) =>
                    item.type === 'video' ? (
                      <VideoCard
                        key={item.key}
                        video={item.data}
                        style={{ animationDelay: `${(idx % 4) * 0.07}s` }}
                      />
                    ) : (
                      <ProductCard
                        key={item.key}
                        product={item.data}
                        style={{ animationDelay: `${(idx % 4) * 0.07}s` }}
                      />
                    )
                  )}
                </div>

                {/* Infinite scroll trigger */}
                <div ref={loaderRef} className="h-8 flex items-center justify-center mt-6">
                  {loadingMore && (
                    <div className="flex items-center gap-3 text-sm font-mono text-steel-400">
                      <Loader size="sm" />
                      Loading more parts…
                    </div>
                  )}
                  {!hasMore && filteredProducts.length > 0 && (
                    <p className="text-xs font-mono text-steel-400 tracking-widest">
                      — All {filteredProducts.length} parts loaded —
                    </p>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Category Bar ──────────────────────────────────────────
function QuickCategoryBar({ setFilters, activeCategory }) {
  const icons = ['⚙️', '🛞', '⚡', '🚗', '❄️'];
  const cats = CATEGORIES.slice(0, 5);

  return (
    <div className="flex flex-wrap gap-2">
      {cats.map((cat, i) => (
        <button
          key={cat.id}
          onClick={() => setFilters({ category: activeCategory === cat.id ? '' : cat.id })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-display font-semibold tracking-wide transition-all
            ${activeCategory === cat.id
              ? 'bg-amber-400 text-charcoal-900'
              : 'bg-cream-50/10 text-cream-200 border border-cream-50/10 hover:bg-cream-50/20 hover:border-cream-50/20'
            }`}
        >
          <span>{cat.icon}</span>
          {cat.label.split(' ')[0]}
        </button>
      ))}
    </div>
  );
}

// ─── Filter Chip ─────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-400/15 border border-amber-400/30 text-amber-700 rounded-full text-xs font-mono">
      {label}
      <button onClick={onRemove} className="hover:text-rust-500 transition-colors">×</button>
    </span>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
    </svg>
  );
}
