import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider, AuthProvider, ToastProvider, FilterProvider } from './context/AppContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { PageLoader } from './components/skeleton/Skeletons';
import './styles/globals.css';

// ── Code splitting: lazy-load all pages ─────────────────────────
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

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

// ── Full-page layout (no navbar/footer, e.g., login) ─────────────
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
              <Suspense fallback={<div className="min-h-screen bg-cream-50 flex items-center justify-center"><PageLoader /></div>}>
                <Routes>
                  {/* Main shop */}
                  <Route path="/" element={
                    <AppLayout>
                      <HomePage />
                    </AppLayout>
                  } />

                  {/* Product detail */}
                  <Route path="/product/:id" element={
                    <AppLayout>
                      <ProductDetailPage />
                    </AppLayout>
                  } />

                  {/* Cart */}
                  <Route path="/cart" element={
                    <AppLayout>
                      <CartPage />
                    </AppLayout>
                  } />

                  {/* Checkout */}
                  <Route path="/checkout" element={
                    <AppLayout hideFooter>
                      <CheckoutPage />
                    </AppLayout>
                  } />

                  {/* Auth — full page, no navbar */}
                  <Route path="/login" element={
                    <FullPageLayout>
                      <LoginPage />
                    </FullPageLayout>
                  } />
                  <Route path="/register" element={
                    <FullPageLayout>
                      <LoginPage />
                    </FullPageLayout>
                  } />

                  {/* Catch-all */}
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
