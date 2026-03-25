import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  const cols = [
    {
      title: 'Shop',
      links: [
        { label: 'Engine Parts', to: '/?category=engine' },
        { label: 'Brakes & Suspension', to: '/?category=brakes' },
        { label: 'Electrical', to: '/?category=electrical' },
        { label: 'Body & Exterior', to: '/?category=body' },
        { label: 'New Arrivals', to: '/?sortBy=newest' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Sign In', to: '/login' },
        { label: 'Register', to: '/register' },
        { label: 'My Orders', to: '/orders' },
        { label: 'Wishlist', to: '/wishlist' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Shipping Policy', to: '/shipping' },
        { label: 'Returns', to: '/returns' },
        { label: 'FAQ', to: '/faq' },
        { label: 'Contact Us', to: '/contact' },
      ],
    },
  ];

  return (
    <footer className="bg-charcoal-900 text-cream-200 mt-20">
      {/* Main footer */}
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-400 rounded flex items-center justify-center">
                <span className="text-charcoal-900 font-display font-black text-sm tracking-wider">IC</span>
              </div>
              <span className="font-display font-black text-xl tracking-widest text-cream-100 uppercase">Ironclad</span>
            </Link>
            <p className="text-sm text-steel-400 leading-relaxed max-w-xs font-serif font-light">
              Premium OEM-grade auto parts for every make, model, and year. Built to last — engineered to perform.
            </p>
            <div className="flex gap-3 mt-6">
              {['Twitter', 'Instagram', 'YouTube'].map(s => (
                <a
                  key={s}
                  href="#"
                  className="w-8 h-8 border border-steel-700 rounded flex items-center justify-center text-steel-400 hover:border-amber-400 hover:text-amber-400 transition-colors text-xs font-mono"
                  aria-label={s}
                >
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Columns */}
          {cols.map(col => (
            <div key={col.title}>
              <h4 className="font-display font-bold text-sm tracking-widest uppercase text-cream-100 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-steel-400 hover:text-amber-400 transition-colors font-mono"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 pt-8 border-t border-steel-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: '🛡', label: '2-Year Warranty' },
            { icon: '🚚', label: 'Free Shipping $99+' },
            { icon: '↩', label: '30-Day Returns' },
            { icon: '✓', label: 'OEM Certified Parts' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-2.5 text-steel-400">
              <span className="text-xl">{b.icon}</span>
              <span className="text-xs font-mono tracking-wide">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-steel-800">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-steel-600 font-mono">
            © {year} Ironclad Auto Parts. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-steel-600 font-mono">
            <a href="#" className="hover:text-steel-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-steel-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-steel-400 transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
