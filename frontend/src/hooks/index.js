import { useState, useEffect, useRef, useCallback } from 'react';
import { PRODUCTS } from '../data/products';
import { useFilters } from '../context/AppContext';

// ─── useIntersectionObserver ─────────────────────────────────────
export function useIntersection(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1, rootMargin: '40px', ...options });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

// ─── useScrollReveal ─────────────────────────────────────────────
// Attaches .visible to elements with class .reveal
export function useScrollReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '20px' }
    );

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

// ─── useLazyImage ────────────────────────────────────────────────
export function useLazyImage(src) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.src = src;
        el.onload = () => {
          el.classList.add('loaded');
          setLoaded(true);
        };
        observer.disconnect();
      }
    }, { rootMargin: '200px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  return [imgRef, loaded];
}

// ─── useFilteredProducts ─────────────────────────────────────────
export function useFilteredProducts() {
  const { filters } = useFilters();

  return useCallback(() => {
    let result = [...PRODUCTS];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    if (filters.brand) result = result.filter(p => p.brand === filters.brand);
    if (filters.model) result = result.filter(p => p.model === filters.model);
    if (filters.year) result = result.filter(p => p.year === Number(filters.year));
    if (filters.category) result = result.filter(p => p.category === filters.category);
    if (filters.inStockOnly) result = result.filter(p => p.inStock);
    result = result.filter(p => p.price >= filters.priceMin && p.price <= filters.priceMax);

    switch (filters.sortBy) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'newest': result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case 'featured': result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)); break;
    }

    return result;
  }, [filters]);
}

// ─── useInfiniteScroll ───────────────────────────────────────────
const PAGE_SIZE = 10;

export function useInfiniteScroll(items) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef(null);

  // Reset page when items list changes (new filter applied)
  useEffect(() => { setPage(1); }, [items]);

  const visibleItems = items.slice(0, page * PAGE_SIZE);
  const hasMore = visibleItems.length < items.length;

  useEffect(() => {
    const el = loaderRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading) {
        setLoading(true);
        // Simulate network delay
        setTimeout(() => {
          setPage(p => p + 1);
          setLoading(false);
        }, 600);
      }
    }, { rootMargin: '200px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return { visibleItems, hasMore, loading, loaderRef };
}

// ─── useLocalStorage ─────────────────────────────────────────────
export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue];
}

// ─── useWishlist ─────────────────────────────────────────────────
export function useWishlist() {
  const [wishlist, setWishlist] = useLocalStorage('ic_wishlist', []);

  const toggle = useCallback((id) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, [setWishlist]);

  const isWishlisted = useCallback((id) => wishlist.includes(id), [wishlist]);

  return { wishlist, toggle, isWishlisted };
}
