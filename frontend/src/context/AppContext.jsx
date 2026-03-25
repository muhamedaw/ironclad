import { createContext, useContext, useReducer, useCallback } from 'react';

// ─── Cart Context ────────────────────────────────────────────────
const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const exists = state.items.find(i => i.id === action.payload.id);
      return {
        ...state,
        items: exists
          ? state.items.map(i =>
              i.id === action.payload.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            )
          : [...state.items, { ...action.payload, quantity: 1 }],
      };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) };

    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items
          .map(i => i.id === action.payload.id ? { ...i, quantity: action.payload.qty } : i)
          .filter(i => i.quantity > 0),
      };

    case 'CLEAR':
      return { ...state, items: [] };

    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = useCallback((product) => {
    dispatch({ type: 'ADD_ITEM', payload: product });
  }, []);

  const removeItem = useCallback((id) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  }, []);

  const updateQty = useCallback((id, qty) => {
    dispatch({ type: 'UPDATE_QTY', payload: { id, qty } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = state.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items: state.items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

// ─── Auth Context ────────────────────────────────────────────────
const AuthContext = createContext(null);

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, { user: null, isAuthenticated: false });

  const login = useCallback((userData) => {
    dispatch({ type: 'LOGIN', payload: userData });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Toast / Notification Context ───────────────────────────────
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useReducer((state, action) => {
    switch (action.type) {
      case 'ADD':
        return [...state, { id: Date.now(), ...action.payload }];
      case 'REMOVE':
        return state.filter(t => t.id !== action.payload);
      default:
        return state;
    }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts({ type: 'ADD', payload: { message, type, id } });
    setTimeout(() => setToasts({ type: 'REMOVE', payload: id }), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-enter flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium pointer-events-auto
              ${t.type === 'success'
                ? 'bg-charcoal-900 text-cream-100 border-amber-400/30'
                : t.type === 'error'
                ? 'bg-rust-500 text-cream-100 border-rust-400/30'
                : 'bg-steel-700 text-cream-100 border-steel-600'
              }`}
          >
            <span className="text-lg">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// ─── Filter Context ──────────────────────────────────────────────
const FilterContext = createContext(null);

const defaultFilters = {
  brand: '',
  model: '',
  year: '',
  category: '',
  search: '',
  priceMin: 0,
  priceMax: 500,
  inStockOnly: false,
  sortBy: 'featured',
};

export function FilterProvider({ children }) {
  const [filters, setFilters] = useReducer(
    (state, updates) => ({ ...state, ...updates }),
    defaultFilters
  );

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'priceMin') return v > 0;
    if (k === 'priceMax') return v < 500;
    if (k === 'sortBy') return false;
    return !!v;
  }).length;

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters, activeCount }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilters = () => {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
};
