import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart, useAuth, useFilters } from '../../context/AppContext';

export default function Navbar() {
  const { count } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { filters, setFilters } = useFilters();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState(filters.search || '');
  const searchRef = useRef(null);

  // Scroll shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  function handleSearch(e) {
    e.preventDefault();
    setFilters({ search: searchVal });
    setSearchOpen(false);
    if (location.pathname !== '/') navigate('/');
  }

  function handleSearchInput(e) {
    setSearchVal(e.target.value);
    if (!e.target.value) setFilters({ search: '' });
  }

  const navLinks = [
    { to: '/', label: 'Shop' },
    { to: '/?category=engine', label: 'Engine' },
    { to: '/?category=brakes', label: 'Brakes' },
    { to: '/?category=electrical', label: 'Electrical' },
  ];

  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-charcoal-900 text-amber-400 text-xs text-center py-1.5 font-mono tracking-widest uppercase">
        Free shipping on orders over $99 · 30-day returns · OEM-grade quality
      </div>

      <header
        className={`sticky top-0 z-50 bg-cream-50 border-b transition-all duration-300
          ${scrolled ? 'border-charcoal-800/20 shadow-[0_2px_20px_rgba(17,17,16,0.08)]' : 'border-cream-200'}`}
      >
        <nav className="max-w-screen-xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 flex-shrink-0 group"
            onClick={() => setFilters({ search: '', category: '' })}
          >
            <div className="w-8 h-8 bg-charcoal-900 rounded flex items-center justify-center">
              <span className="text-amber-400 font-display font-black text-sm tracking-wider">IC</span>
            </div>
            <span className="font-display font-black text-xl tracking-widest text-charcoal-900 uppercase">
              Ironclad
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 text-sm font-display font-semibold tracking-wider uppercase rounded
                  transition-colors underline-grow
                  ${location.pathname === l.to.split('?')[0]
                    ? 'text-charcoal-900'
                    : 'text-steel-600 hover:text-charcoal-900'}`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Search bar — desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex items-center bg-cream-100 border border-cream-200 rounded-lg overflow-hidden w-56 lg:w-72 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 transition-all"
          >
            <input
              value={searchVal}
              onChange={handleSearchInput}
              placeholder="Search parts, brands…"
              className="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-charcoal-900 placeholder-steel-400 outline-none"
            />
            <button type="submit" className="px-3 text-steel-500 hover:text-amber-500 transition-colors">
              <SearchIcon />
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1">

            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(s => !s)}
              className="md:hidden p-2 rounded-lg text-steel-600 hover:bg-cream-200 hover:text-charcoal-900 transition-colors"
              aria-label="Search"
            >
              <SearchIcon />
            </button>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="hidden sm:flex p-2 rounded-lg text-steel-600 hover:bg-cream-200 hover:text-charcoal-900 transition-colors"
              aria-label="Wishlist"
            >
              <HeartIcon />
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 rounded-lg text-steel-600 hover:bg-cream-200 hover:text-charcoal-900 transition-colors">
                  <UserIcon />
                  <span className="hidden sm:block text-sm font-display font-semibold tracking-wide">
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1 w-44 bg-cream-50 border border-cream-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
                  <Link to="/account" className="block px-4 py-2.5 text-sm font-mono text-steel-600 hover:text-charcoal-900 hover:bg-cream-100 rounded-t-lg">
                    My Account
                  </Link>
                  <Link to="/orders" className="block px-4 py-2.5 text-sm font-mono text-steel-600 hover:text-charcoal-900 hover:bg-cream-100">
                    My Orders
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2.5 text-sm font-mono text-rust-500 hover:bg-cream-100 rounded-b-lg"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-display font-semibold tracking-wider text-steel-600 hover:text-charcoal-900 transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Sign In
              </Link>
            )}

            {/* Cart */}
            <Link
              to="/cart"
              className="relative flex items-center gap-2 px-3 py-1.5 bg-charcoal-900 text-cream-100 rounded-lg hover:bg-charcoal-800 transition-colors group"
              aria-label="Cart"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-charcoal-900 rounded-full text-xs font-black flex items-center justify-center animate-bounce-sm">
                  {count > 9 ? '9+' : count}
                </span>
              )}
              <span className="hidden sm:block text-sm font-display font-semibold tracking-wide">Cart</span>
            </Link>

            {/* Mobile menu */}
            <button
              onClick={() => setMenuOpen(m => !m)}
              className="md:hidden p-2 rounded-lg text-steel-600 hover:bg-cream-200 transition-colors"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </nav>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden border-t border-cream-200 bg-cream-50 px-4 py-3 animate-fade-in">
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-cream-100 border border-cream-200 rounded-lg overflow-hidden focus-within:border-amber-400">
              <input
                ref={searchRef}
                value={searchVal}
                onChange={handleSearchInput}
                placeholder="Search parts, brands…"
                className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono outline-none text-charcoal-900 placeholder-steel-400"
              />
              <button type="submit" className="px-3 text-steel-500">
                <SearchIcon />
              </button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-cream-200 bg-cream-50 px-4 py-3 space-y-1 animate-fade-in">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-display font-semibold tracking-wider uppercase text-steel-600 hover:text-charcoal-900 hover:bg-cream-100 rounded-lg"
              >
                {l.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-sm font-display font-semibold tracking-wider uppercase text-amber-500 hover:bg-cream-100 rounded-lg"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        )}
      </header>
    </>
  );
}

// ─── Icon Components ─────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
