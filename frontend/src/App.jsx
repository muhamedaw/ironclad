import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider, AuthProvider, ToastProvider, FilterProvider } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { PageLoader } from './components/skeleton/Skeletons';
import './styles/globals.css';

// ── Code splitting: lazy-load all pages ─────────────────────────
const HomePage          = lazy(() => import('./pages/HomePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage          = lazy(() => import('./pages/CartPage'));
const CheckoutPage      = lazy(() => import('./pages/CheckoutPage'));
const LoginPage         = lazy(() => import('./pages/LoginPage'));
const AdminDashboard    = lazy(() => import('./AdminDashboard'));
const CheckoutApp       = lazy(() => import('./CheckoutApp'));
const PageBuilder       = lazy(() => import('./PageBuilder'));

// ── Layout wrapper ───────────────────────────────────────────────
function AppLayout({ children, hideFooter = false }) {
  return (
    <div className="grain-overlay flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

function FullPageLayout({ children }) {
  return <>{children}</>;
}

// ── App ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <FilterProvider>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><PageLoader /></div>}>
                <Routes>

                  {/* ── Main shop ── */}
                  <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
                  <Route path="/product/:id" element={<AppLayout><ProductDetailPage /></AppLayout>} />
                  <Route path="/cart" element={<AppLayout><CartPage /></AppLayout>} />
                  <Route path="/checkout" element={<AppLayout hideFooter><CheckoutPage /></AppLayout>} />

                  {/* ── Auth ── */}
                  <Route path="/login"    element={<FullPageLayout><LoginPage /></FullPageLayout>} />
                  <Route path="/register" element={<FullPageLayout><LoginPage /></FullPageLayout>} />

                  {/* ── Admin Dashboard ── */}
                  <Route path="/admin/*" element={<FullPageLayout><AdminDashboard /></FullPageLayout>} />

                  {/* ── Checkout flow ── */}
                  <Route path="/checkout-v2" element={<FullPageLayout><CheckoutApp /></FullPageLayout>} />

                  {/* ── Page Builder ── */}
                  <Route path="/builder" element={<FullPageLayout><PageBuilder /></FullPageLayout>} />

                  {/* ── Catch-all ── */}
                  <Route path="*" element={<Navigate to="/" replace />} />

                </Routes>
              </Suspense>
            </FilterProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
