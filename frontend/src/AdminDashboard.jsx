import { useState, useReducer, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react";

// ─── Font import (injected as style tag) ────────────────────────────────────
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --cream-50: #FDFCF8; --cream-100: #F5F2EA; --cream-200: #EAE5D8;
      --cream-300: #D5CCBA; --charcoal-900: #0F0E0C; --charcoal-800: #1A1916;
      --charcoal-700: #252320; --charcoal-600: #332F2A; --charcoal-500: #4A443C;
      --charcoal-400: #6B6259; --charcoal-300: #8C8077; --charcoal-200: #ADA49C;
      --charcoal-100: #CEC8C1; --amber: #C8860A; --amber-light: #E8A020;
      --amber-pale: rgba(200,134,10,0.12); --amber-border: rgba(200,134,10,0.3);
      --rust: #B84A2E; --rust-pale: rgba(184,74,46,0.1);
      --sage: #4A7C59; --sage-pale: rgba(74,124,89,0.1);
      --sky: #2B6CB0; --sky-pale: rgba(43,108,176,0.1);
      --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
      --shadow-sm: 0 1px 3px rgba(15,14,12,0.08), 0 1px 2px rgba(15,14,12,0.06);
      --shadow-md: 0 4px 16px rgba(15,14,12,0.10), 0 2px 6px rgba(15,14,12,0.06);
      --shadow-lg: 0 12px 40px rgba(15,14,12,0.14), 0 4px 12px rgba(15,14,12,0.08);
    }
    body { background: var(--cream-50); color: var(--charcoal-800); font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.5; }
    button { font-family: inherit; cursor: pointer; border: none; outline: none; }
    input, textarea, select { font-family: inherit; outline: none; }
    input:focus, textarea:focus, select:focus { outline: 2px solid var(--amber); outline-offset: 1px; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: var(--cream-100); }
    ::-webkit-scrollbar-thumb { background: var(--cream-300); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--charcoal-200); }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
    @keyframes slideIn { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:none } }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
    @keyframes shimmer { 0% { background-position:-400px 0 } 100% { background-position:400px 0 } }
    .animate-in { animation: fadeIn 0.35s ease forwards; }
    .shimmer { background: linear-gradient(90deg, var(--cream-100) 25%, var(--cream-200) 50%, var(--cream-100) 75%); background-size: 400px 100%; animation: shimmer 1.5s infinite; border-radius: var(--radius-sm); }
  `}</style>
);

// ─── Auth Context ────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

const ROLES = {
  super_admin: { label: "Super Admin", permissions: ["all"] },
  admin:       { label: "Admin", permissions: ["products","categories","orders","analytics","users"] },
  manager:     { label: "Manager", permissions: ["products","categories","orders","analytics"] },
  viewer:      { label: "Viewer", permissions: ["orders","analytics"] },
};

const DEMO_USERS = [
  { id: 1, email: "super@ironclad.dev", password: "super123", role: "super_admin", name: "Alex Carter" },
  { id: 2, email: "admin@ironclad.dev", password: "admin123", role: "admin",       name: "Sam Torres" },
  { id: 3, email: "manager@ironclad.dev", password: "mgr123", role: "manager",    name: "Jordan Kim" },
  { id: 4, email: "viewer@ironclad.dev", password: "view123", role: "viewer",     name: "Riley Chen" },
];

function can(user, permission) {
  if (!user) return false;
  const perms = ROLES[user.role]?.permissions || [];
  return perms.includes("all") || perms.includes(permission);
}

// ─── Mock API layer ──────────────────────────────────────────────────────────
let _pid = 200, _oid = 1000, _cid = 20;

const CATEGORIES_INIT = [
  { id:1, name:"Engine & Drivetrain", slug:"engine", productCount:42, active:true },
  { id:2, name:"Brakes & Suspension", slug:"brakes", productCount:38, active:true },
  { id:3, name:"Electrical", slug:"electrical", productCount:29, active:true },
  { id:4, name:"Body & Exterior", slug:"body", productCount:31, active:true },
  { id:5, name:"Cooling System", slug:"cooling", productCount:18, active:true },
  { id:6, name:"Exhaust & Fuel", slug:"exhaust", productCount:22, active:false },
];

const PRODUCTS_INIT = [
  { id:1, name:"OEM Brake Pad Set — Front", sku:"BP-BMW3-F-001", categoryId:2, price:89.99, originalPrice:119.99, stock:48, active:true, featured:true, createdAt:"2024-01-15" },
  { id:2, name:"Timing Belt Kit w/ Water Pump", sku:"TBK-TOY-004", categoryId:1, price:189.99, originalPrice:249.99, stock:18, active:true, featured:false, createdAt:"2024-02-01" },
  { id:3, name:"Alternator 140A Reman", sku:"ALT-FRD-007", categoryId:3, price:249.99, originalPrice:null, stock:14, active:true, featured:false, createdAt:"2024-01-20" },
  { id:4, name:"Full Aluminium Radiator", sku:"RAD-HON-010", categoryId:5, price:159.99, originalPrice:199.99, stock:8, active:true, featured:true, createdAt:"2024-03-01" },
  { id:5, name:"Front Strut Assembly Pair", sku:"STR-TOY-RAV-016", categoryId:2, price:289.99, originalPrice:349.99, stock:13, active:true, featured:true, createdAt:"2024-02-15" },
  { id:6, name:"MAF Sensor 2.0T", sku:"MAF-BMW5-009", categoryId:3, price:119.99, originalPrice:149.99, stock:28, active:true, featured:false, createdAt:"2024-01-10" },
  { id:7, name:"O2 Sensor Upstream", sku:"O2S-HON-008", categoryId:3, price:59.99, originalPrice:79.99, stock:67, active:true, featured:false, createdAt:"2024-03-10" },
  { id:8, name:"Head Gasket Set 2.0T", sku:"HGS-BMW3-005", categoryId:1, price:219.99, originalPrice:null, stock:9, active:false, featured:false, createdAt:"2023-12-01" },
  { id:9, name:"Catalytic Converter", sku:"CAT-AUD-A4-013", categoryId:6, price:449.99, originalPrice:null, stock:5, active:true, featured:false, createdAt:"2024-01-05" },
  { id:10, name:"Fuel Pump Assembly", sku:"FP-VW-GOLF-015", categoryId:6, price:179.99, originalPrice:219.99, stock:17, active:true, featured:false, createdAt:"2024-02-20" },
  { id:11, name:"Brake Rotor Slotted Pair", sku:"BR-TOY-CAM-002", categoryId:2, price:149.99, originalPrice:189.99, stock:22, active:true, featured:false, createdAt:"2024-03-15" },
  { id:12, name:"Oil Filter Premium", sku:"OF-BMW-019", categoryId:1, price:24.99, originalPrice:34.99, stock:210, active:true, featured:false, createdAt:"2023-09-01" },
];

const ORDERS_INIT = [
  { id:"IC-240315-X1K9M", customerId:"c1", customerName:"Jane Mechanic", customerEmail:"jane@example.com", items:[{productId:1,qty:1,price:89.99},{productId:12,qty:3,price:24.99}], total:164.96, status:"delivered", paymentStatus:"paid", createdAt:"2024-03-15" },
  { id:"IC-240502-R7T4P", customerId:"c2", customerName:"Marcus Toretto", customerEmail:"marcus@example.com", items:[{productId:5,qty:1,price:289.99}], total:289.99, status:"shipped", paymentStatus:"paid", createdAt:"2024-05-02" },
  { id:"IC-240918-W2A6Q", customerId:"c3", customerName:"Priya Singh", customerEmail:"priya@example.com", items:[{productId:11,qty:1,price:149.99},{productId:7,qty:1,price:59.99}], total:225.97, status:"pending", paymentStatus:"pending", createdAt:"2024-09-18" },
  { id:"IC-240820-L5E2S", customerId:"c4", customerName:"Derek Kim", customerEmail:"derek@example.com", items:[{productId:5,qty:1,price:289.99},{productId:6,qty:1,price:119.99}], total:437.97, status:"processing", paymentStatus:"paid", createdAt:"2024-08-20" },
  { id:"IC-240710-F9B1N", customerId:"c1", customerName:"Jane Mechanic", customerEmail:"jane@example.com", items:[{productId:9,qty:1,price:449.99}], total:449.99, status:"cancelled", paymentStatus:"refunded", createdAt:"2024-07-10" },
  { id:"IC-240601-H3D8V", customerId:"c5", customerName:"Lena Hartmann", customerEmail:"lena@example.com", items:[{productId:2,qty:1,price:189.99}], total:189.99, status:"delivered", paymentStatus:"paid", createdAt:"2024-06-01" },
  { id:"IC-241102-Z8R3K", customerId:"c6", customerName:"Tom Wu", customerEmail:"tom@example.com", items:[{productId:3,qty:1,price:249.99},{productId:7,qty:2,price:59.99}], total:374.96, status:"pending", paymentStatus:"pending", createdAt:"2024-11-02" },
  { id:"IC-241015-M4P7Q", customerId:"c7", customerName:"Sofia Ricci", customerEmail:"sofia@example.com", items:[{productId:4,qty:1,price:159.99}], total:159.99, status:"delivered", paymentStatus:"paid", createdAt:"2024-10-15" },
];

// ─── Analytics data ──────────────────────────────────────────────────────────
const MONTHLY_REVENUE = [28400, 31200, 27800, 35600, 42100, 38900, 45200, 41800, 49300, 53100, 48700, 61400];
const MONTHLY_ORDERS  = [142,158,134,178,211,195,228,209,247,266,244,307];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── Global state reducer ────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case "SET_PRODUCTS": return { ...state, products: action.payload };
    case "ADD_PRODUCT":  return { ...state, products: [action.payload, ...state.products] };
    case "UPDATE_PRODUCT": return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case "DELETE_PRODUCT": return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case "ADD_CATEGORY":  return { ...state, categories: [action.payload, ...state.categories] };
    case "UPDATE_CATEGORY": return { ...state, categories: state.categories.map(c => c.id === action.payload.id ? action.payload : c) };
    case "DELETE_CATEGORY": return { ...state, categories: state.categories.filter(c => c.id !== action.payload) };
    case "UPDATE_ORDER": return { ...state, orders: state.orders.map(o => o.id === action.payload.id ? action.payload : o) };
    default: return state;
  }
}

// ─── UI Primitives ───────────────────────────────────────────────────────────
const btn = {
  base: { padding:"8px 16px", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s", display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer", border:"none", whiteSpace:"nowrap" },
};
const btnVariants = {
  primary:   { background:"var(--charcoal-800)", color:"var(--cream-50)", boxShadow:"var(--shadow-sm)" },
  secondary: { background:"transparent", color:"var(--charcoal-700)", border:"1px solid var(--cream-300)" },
  ghost:     { background:"transparent", color:"var(--charcoal-500)", padding:"6px 10px" },
  danger:    { background:"var(--rust-pale)", color:"var(--rust)", border:"1px solid rgba(184,74,46,0.2)" },
  amber:     { background:"var(--amber)", color:"white" },
};

function Btn({ variant="primary", size="md", children, onClick, disabled, className="", style={}, loading=false }) {
  const [hovered, setHovered] = useState(false);
  const sz = size === "sm" ? { padding:"5px 12px", fontSize:12 } : size === "lg" ? { padding:"11px 22px", fontSize:14 } : {};
  const hoverMap = {
    primary: { background:"var(--charcoal-700)" },
    secondary: { background:"var(--cream-100)" },
    ghost: { background:"var(--cream-100)", color:"var(--charcoal-700)" },
    danger: { background:"rgba(184,74,46,0.16)" },
    amber: { background:"var(--amber-light)" },
  };
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ ...btn.base, ...btnVariants[variant], ...sz, ...(hovered && hoverMap[variant]), ...style, opacity: (disabled || loading) ? 0.5 : 1 }}
    >
      {loading && <span style={{ width:12,height:12,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
}

function Badge({ status, type="status" }) {
  const configs = {
    // Order statuses
    pending:    { bg:"rgba(200,134,10,0.12)", color:"var(--amber)", border:"rgba(200,134,10,0.25)" },
    processing: { bg:"rgba(43,108,176,0.1)", color:"var(--sky)", border:"rgba(43,108,176,0.25)" },
    shipped:    { bg:"rgba(74,124,89,0.1)", color:"var(--sage)", border:"rgba(74,124,89,0.25)" },
    delivered:  { bg:"rgba(74,124,89,0.14)", color:"var(--sage)", border:"rgba(74,124,89,0.3)" },
    cancelled:  { bg:"var(--rust-pale)", color:"var(--rust)", border:"rgba(184,74,46,0.2)" },
    refunded:   { bg:"rgba(107,98,89,0.1)", color:"var(--charcoal-400)", border:"rgba(107,98,89,0.2)" },
    paid:       { bg:"rgba(74,124,89,0.1)", color:"var(--sage)", border:"rgba(74,124,89,0.25)" },
    // Product/Category
    active:     { bg:"rgba(74,124,89,0.1)", color:"var(--sage)", border:"rgba(74,124,89,0.25)" },
    inactive:   { bg:"rgba(107,98,89,0.1)", color:"var(--charcoal-400)", border:"rgba(107,98,89,0.2)" },
    featured:   { bg:"var(--amber-pale)", color:"var(--amber)", border:"var(--amber-border)" },
  };
  const c = configs[status] || configs.inactive;
  return (
    <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:500, fontFamily:"'JetBrains Mono',monospace", background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
      {status}
    </span>
  );
}

function Input({ label, value, onChange, type="text", placeholder, required, error, options, rows, hint, disabled }) {
  const inputStyle = { width:"100%", padding:"9px 12px", border:`1px solid ${error?"var(--rust)":"var(--cream-300)"}`, borderRadius:"var(--radius-sm)", fontSize:13, background:"white", color:"var(--charcoal-800)", transition:"border-color 0.15s", fontFamily:"'DM Sans',sans-serif" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <label style={{ fontSize:12, fontWeight:500, color:"var(--charcoal-600)", letterSpacing:"0.02em" }}>{label}{required && <span style={{ color:"var(--rust)", marginLeft:2 }}>*</span>}</label>}
      {type === "select" ? (
        <select value={value} onChange={onChange} disabled={disabled} style={{ ...inputStyle, cursor:"pointer" }}>
          {options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows||3} disabled={disabled} style={{ ...inputStyle, resize:"vertical" }} />
      ) : (
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} disabled={disabled} style={{ ...inputStyle, ...(type==="number" && { fontFamily:"'JetBrains Mono',monospace" }) }} />
      )}
      {error && <span style={{ fontSize:11, color:"var(--rust)", display:"flex", alignItems:"center", gap:4 }}>⚠ {error}</span>}
      {hint && !error && <span style={{ fontSize:11, color:"var(--charcoal-300)" }}>{hint}</span>}
    </div>
  );
}

function Table({ columns, data, onRowClick, loading, emptyMessage="No records found", selectedId }) {
  if (loading) return (
    <div style={{ padding:"32px 0" }}>
      {[...Array(5)].map((_,i) => (
        <div key={i} style={{ display:"flex", gap:16, padding:"14px 20px", borderBottom:"1px solid var(--cream-200)", alignItems:"center" }}>
          {columns.map(col => <div key={col.key} className="shimmer" style={{ height:14, width: typeof col.width === "number" ? col.width : 100, flex: col.flex || "none" }} />)}
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:"var(--cream-100)", borderBottom:"1px solid var(--cream-200)" }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"var(--charcoal-400)", textTransform:"uppercase", letterSpacing:"0.07em", fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap", ...(col.width && { width: col.width }) }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding:"40px 20px", textAlign:"center", color:"var(--charcoal-300)", fontSize:13, fontStyle:"italic" }}>{emptyMessage}</td></tr>
          ) : data.map((row, i) => (
            <tr key={row.id || i}
              onClick={() => onRowClick?.(row)}
              style={{ borderBottom:"1px solid var(--cream-100)", transition:"background 0.1s", cursor: onRowClick ? "pointer" : "default", background: selectedId === row.id ? "var(--amber-pale)" : "transparent", animation:`fadeIn 0.25s ease ${i * 0.04}s both` }}
              onMouseEnter={e => { if (selectedId !== row.id) e.currentTarget.style.background = "var(--cream-50)"; }}
              onMouseLeave={e => { if (selectedId !== row.id) e.currentTarget.style.background = "transparent"; }}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding:"12px 16px", fontSize:13, verticalAlign:"middle", ...(col.mono && { fontFamily:"'JetBrains Mono',monospace", fontSize:12 }), ...(col.muted && { color:"var(--charcoal-400)" }) }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Modal({ open, onClose, title, subtitle, children, width=520 }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,14,12,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(3px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"white", borderRadius:"var(--radius-lg)", width:Math.min(width, "calc(100vw - 40px)"), maxHeight:"calc(100vh - 80px)", overflow:"auto", boxShadow:"var(--shadow-lg)", animation:"fadeIn 0.2s ease" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid var(--cream-200)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:600, fontFamily:"'Cormorant Garamond',serif", color:"var(--charcoal-900)", lineHeight:1.2 }}>{title}</h2>
            {subtitle && <p style={{ fontSize:13, color:"var(--charcoal-400)", marginTop:3 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--charcoal-300)", fontSize:20, lineHeight:1, padding:"2px 4px", borderRadius:4, transition:"color 0.15s" }} onMouseEnter={e => e.currentTarget.style.color="var(--charcoal-700)"} onMouseLeave={e => e.currentTarget.style.color="var(--charcoal-300)"}>✕</button>
        </div>
        <div style={{ padding:"24px" }}>{children}</div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: { bg:"var(--sage)", border:"rgba(74,124,89,0.3)" }, error: { bg:"var(--rust)", border:"rgba(184,74,46,0.3)" }, info: { bg:"var(--sky)", border:"rgba(43,108,176,0.3)" } };
  const c = colors[type] || colors.info;
  return (
    <div style={{ position:"fixed", bottom:24, right:24, background:"var(--charcoal-800)", color:"var(--cream-50)", padding:"12px 18px", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-lg)", fontSize:13, display:"flex", alignItems:"center", gap:10, zIndex:2000, animation:"fadeIn 0.25s ease", maxWidth:360 }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background:c.bg, flexShrink:0 }} />
      {message}
      <button onClick={onClose} style={{ background:"none", border:"none", color:"var(--charcoal-200)", cursor:"pointer", marginLeft:"auto", fontSize:16, lineHeight:1 }}>✕</button>
    </div>
  );
}

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(15,14,12,0.5)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(3px)" }}>
      <div style={{ background:"white", borderRadius:"var(--radius-lg)", padding:28, maxWidth:380, width:"90%", boxShadow:"var(--shadow-lg)", animation:"fadeIn 0.2s ease" }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:600, marginBottom:10, color:"var(--charcoal-900)" }}>{title}</h3>
        <p style={{ fontSize:13, color:"var(--charcoal-500)", lineHeight:1.6, marginBottom:20 }}>{message}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
          <Btn variant="danger" onClick={onConfirm}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, change, icon, color="#C8860A", loading }) {
  return (
    <div style={{ background:"white", borderRadius:"var(--radius-md)", padding:"18px 20px", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)", animation:"fadeIn 0.3s ease" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <span style={{ fontSize:12, fontWeight:500, color:"var(--charcoal-400)", letterSpacing:"0.04em", textTransform:"uppercase" }}>{label}</span>
        <div style={{ width:32, height:32, borderRadius:"var(--radius-sm)", background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{icon}</div>
      </div>
      {loading ? (
        <div className="shimmer" style={{ height:28, width:100 }} />
      ) : (
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:26, fontWeight:600, color:"var(--charcoal-900)", lineHeight:1 }}>{value}</div>
      )}
      {change && <div style={{ fontSize:12, color: change.startsWith("+") ? "var(--sage)" : "var(--rust)", marginTop:6, fontFamily:"'JetBrains Mono',monospace", fontWeight:500 }}>{change} vs last month</div>}
    </div>
  );
}

// ─── Analytics Chart (pure CSS bars) ─────────────────────────────────────────
function RevenueChart({ data, labels }) {
  const max = Math.max(...data);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:140, padding:"0 4px" }}>
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <div style={{ position:"relative", width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
              <div title={`$${v.toLocaleString()}`}
                style={{ width:"100%", height:`${pct}%`, background: isLast ? "var(--amber)" : "var(--cream-300)", borderRadius:"3px 3px 0 0", transition:"height 0.5s ease", minHeight:4, cursor:"pointer" }}
                onMouseEnter={e => { e.currentTarget.style.background = isLast ? "var(--amber-light)" : "var(--charcoal-300)"; e.currentTarget.style.transform = "scaleX(1.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isLast ? "var(--amber)" : "var(--cream-300)"; e.currentTarget.style.transform = "none"; }}
              />
            </div>
            <span style={{ fontSize:9, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace", transform:"rotate(-45deg)", transformOrigin:"top center", display:"block", marginTop:2 }}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }) {
  // Simple CSS-based donut for category breakdown
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = ["var(--amber)","var(--sage)","var(--sky)","var(--rust)","var(--charcoal-300)","var(--charcoal-200)"];
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = (d.value / total) * 100;
    const seg = { ...d, pct, color: colors[i], start: cumulative };
    cumulative += pct;
    return seg;
  });
  return (
    <div style={{ display:"flex", gap:24, alignItems:"center" }}>
      <div style={{ width:100, height:100, borderRadius:"50%", background:`conic-gradient(${segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(",")})`, flexShrink:0, boxShadow:"inset 0 0 0 28px white" }} />
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
            <span style={{ color:"var(--charcoal-600)", flex:1 }}>{s.label}</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", color:"var(--charcoal-800)", fontWeight:500 }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key:"dashboard", label:"Dashboard", icon:"◈", permission:"analytics" },
  { key:"products",  label:"Products",  icon:"⊟", permission:"products" },
  { key:"categories",label:"Categories",icon:"◫", permission:"categories" },
  { key:"orders",    label:"Orders",    icon:"⊞", permission:"orders" },
  { key:"analytics", label:"Analytics", icon:"◎", permission:"analytics" },
  { key:"users",     label:"Users",     icon:"◑", permission:"users" },
];

function Sidebar({ currentPage, onNavigate, collapsed, setCollapsed }) {
  const { user } = useAuth();
  return (
    <div style={{ width: collapsed ? 60 : 220, background:"var(--charcoal-900)", display:"flex", flexDirection:"column", height:"100vh", flexShrink:0, transition:"width 0.2s ease", position:"relative", zIndex:10 }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "18px 14px" : "18px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:30, height:30, background:"var(--amber)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:700, color:"var(--charcoal-900)", flexShrink:0 }}>IC</div>
        {!collapsed && <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:600, color:"var(--cream-100)", letterSpacing:"0.04em" }}>Ironclad</span>}
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, padding:"16px 8px", overflowY:"auto" }}>
        {NAV_ITEMS.filter(item => can(user, item.permission)).map(item => {
          const isActive = currentPage === item.key;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding: collapsed ? "10px 14px" : "10px 14px", borderRadius:"var(--radius-sm)", background: isActive ? "rgba(200,134,10,0.18)" : "transparent", color: isActive ? "var(--amber)" : "var(--charcoal-200)", border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight: isActive ? 500 : 400, transition:"all 0.15s", marginBottom:2, justifyContent: collapsed ? "center" : "flex-start", textAlign:"left" }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background="rgba(255,255,255,0.06)"; e.currentTarget.style.color="var(--cream-100)"; }}}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--charcoal-200)"; }}}
            >
              <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
              {!collapsed && item.label}
              {!collapsed && isActive && <div style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:"var(--amber)" }} />}
            </button>
          );
        })}
      </nav>

      {/* User profile at bottom */}
      <div style={{ padding: collapsed ? "14px 10px" : "14px 16px", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        {!collapsed && (
          <div style={{ marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"var(--amber-pale)", border:"1px solid var(--amber-border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"var(--amber)", fontWeight:600, fontFamily:"'Cormorant Garamond',serif", flexShrink:0 }}>{user?.name?.[0]}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--cream-100)", lineHeight:1 }}>{user?.name}</div>
              <div style={{ fontSize:10, color:"var(--charcoal-300)", marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>{ROLES[user?.role]?.label}</div>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(c => !c)} style={{ width:"100%", padding:"6px 8px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"var(--radius-sm)", color:"var(--charcoal-300)", fontSize:11, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.09)"} onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
          {collapsed ? "→" : "← Collapse"}
        </button>
      </div>
    </div>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div style={{ marginBottom:24 }}>
      {breadcrumb && <div style={{ fontSize:12, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>{breadcrumb}</div>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", gap:16, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:600, color:"var(--charcoal-900)", lineHeight:1.1 }}>{title}</h1>
          {subtitle && <p style={{ fontSize:13, color:"var(--charcoal-400)", marginTop:4 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>{actions}</div>}
      </div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"var(--charcoal-300)" }}>⌕</span>
      <input value={value} onChange={onChange} placeholder={placeholder || "Search…"}
        style={{ padding:"8px 12px 8px 30px", border:"1px solid var(--cream-300)", borderRadius:"var(--radius-sm)", fontSize:13, background:"white", color:"var(--charcoal-800)", width:220, fontFamily:"'DM Sans',sans-serif" }} />
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
function DashboardPage({ data }) {
  const { products, orders } = data;
  const revenue = orders.filter(o => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const lowStock = products.filter(p => p.stock < 10).length;
  const activeProducts = products.filter(p => p.active).length;

  const recentOrders = [...orders].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="animate-in">
      <PageHeader title="Dashboard" subtitle={`Welcome back. Here's what's happening today.`} />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:28 }}>
        <StatCard label="Total Revenue" value={`$${revenue.toLocaleString("en-US", {minimumFractionDigits:2,maximumFractionDigits:2})}`} change="+18.4%" icon="◈" color="var(--amber)" />
        <StatCard label="Total Orders" value={orders.length} change="+12.1%" icon="⊞" color="var(--sage)" />
        <StatCard label="Active Products" value={activeProducts} change="+3" icon="⊟" color="var(--sky)" />
        <StatCard label="Pending Orders" value={pendingOrders} icon="⊙" color={pendingOrders > 2 ? "var(--rust)" : "var(--charcoal-400)"} />
        <StatCard label="Low Stock" value={lowStock} icon="⚠" color={lowStock > 3 ? "var(--rust)" : "var(--sage)"} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:28 }}>
        {/* Revenue chart */}
        <div style={{ background:"white", borderRadius:"var(--radius-md)", padding:"20px 24px", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:600, color:"var(--charcoal-900)" }}>Monthly Revenue</h3>
            <Badge status="active" />
          </div>
          <RevenueChart data={MONTHLY_REVENUE} labels={MONTHS} />
        </div>
        {/* Category breakdown */}
        <div style={{ background:"white", borderRadius:"var(--radius-md)", padding:"20px 24px", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:600, color:"var(--charcoal-900)", marginBottom:16 }}>Sales by Category</h3>
          <DonutChart data={[
            { label:"Engine", value:42 }, { label:"Brakes", value:38 }, { label:"Electrical", value:29 },
            { label:"Body", value:31 }, { label:"Cooling", value:18 }, { label:"Exhaust", value:22 },
          ]} />
        </div>
      </div>

      {/* Recent orders */}
      <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--cream-200)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:600, color:"var(--charcoal-900)" }}>Recent Orders</h3>
          <Badge status="paid" />
        </div>
        <Table
          columns={[
            { key:"id", label:"Order ID", mono:true, width:160 },
            { key:"customerName", label:"Customer" },
            { key:"total", label:"Total", mono:true, render: v => `$${Number(v).toFixed(2)}` },
            { key:"status", label:"Status", render: v => <Badge status={v} /> },
            { key:"createdAt", label:"Date", muted:true, mono:true },
          ]}
          data={recentOrders}
        />
      </div>
    </div>
  );
}

// ─── Products page ────────────────────────────────────────────────────────────
function ProductsPage({ data, dispatch, showToast }) {
  const { products, categories } = data;
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name:"", sku:"", categoryId:"", price:"", originalPrice:"", stock:"", active:true, featured:false };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || String(p.categoryId) === categoryFilter;
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? p.active : !p.active);
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const openAdd = () => { setForm(emptyForm); setFormErrors({}); setEditProduct(null); setModalOpen(true); };
  const openEdit = (p) => {
    setForm({ name:p.name, sku:p.sku, categoryId:String(p.categoryId), price:String(p.price), originalPrice:p.originalPrice ? String(p.originalPrice) : "", stock:String(p.stock), active:p.active, featured:p.featured });
    setFormErrors({}); setEditProduct(p); setModalOpen(true);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.sku.trim()) e.sku = "SKU is required";
    if (!form.categoryId) e.categoryId = "Category is required";
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) e.price = "Valid price required";
    if (form.stock === "" || isNaN(form.stock) || Number(form.stock) < 0) e.stock = "Valid stock required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const payload = { ...editProduct, name:form.name, sku:form.sku, categoryId:Number(form.categoryId), price:Number(form.price), originalPrice:form.originalPrice ? Number(form.originalPrice) : null, stock:Number(form.stock), active:form.active, featured:form.featured };
    if (editProduct) {
      dispatch({ type:"UPDATE_PRODUCT", payload });
      showToast("Product updated successfully", "success");
    } else {
      dispatch({ type:"ADD_PRODUCT", payload:{ ...payload, id:++_pid, createdAt: new Date().toISOString().split("T")[0] } });
      showToast("Product added successfully", "success");
    }
    setSaving(false); setModalOpen(false);
  };

  const handleDelete = () => {
    dispatch({ type:"DELETE_PRODUCT", payload: confirmDelete.id });
    showToast(`"${confirmDelete.name}" deleted`, "info");
    setConfirmDelete(null);
  };

  const catName = id => categories.find(c => c.id === id)?.name || "—";
  const canEdit = can(user, "products");

  return (
    <div className="animate-in">
      <PageHeader title="Products" subtitle={`${filtered.length} of ${products.length} products`}
        actions={canEdit ? [<Btn key="add" variant="amber" onClick={openAdd} icon="+">Add Product</Btn>] : []} />

      {/* Filters */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU…" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding:"8px 12px", border:"1px solid var(--cream-300)", borderRadius:"var(--radius-sm)", fontSize:13, background:"white", color:"var(--charcoal-700)", fontFamily:"'DM Sans',sans-serif" }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding:"8px 12px", border:"1px solid var(--cream-300)", borderRadius:"var(--radius-sm)", fontSize:13, background:"white", color:"var(--charcoal-700)", fontFamily:"'DM Sans',sans-serif" }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
        <Table
          columns={[
            { key:"name", label:"Product", render:(v,row) => (
              <div>
                <div style={{ fontWeight:500, color:"var(--charcoal-900)" }}>{v}</div>
                <div style={{ fontSize:11, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{row.sku}</div>
              </div>
            )},
            { key:"categoryId", label:"Category", render: v => <span style={{ fontSize:12, color:"var(--charcoal-500)" }}>{catName(v)}</span> },
            { key:"price", label:"Price", mono:true, render:(v,row) => (
              <div>
                <div style={{ fontWeight:500 }}>${Number(v).toFixed(2)}</div>
                {row.originalPrice && <div style={{ fontSize:11, color:"var(--charcoal-300)", textDecoration:"line-through" }}>${Number(row.originalPrice).toFixed(2)}</div>}
              </div>
            )},
            { key:"stock", label:"Stock", mono:true, render: v => <span style={{ color: v < 10 ? "var(--rust)" : v < 20 ? "var(--amber)" : "var(--sage)", fontWeight:500 }}>{v}</span> },
            { key:"active", label:"Status", render:(v,row) => (
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <Badge status={v ? "active" : "inactive"} />
                {row.featured && <Badge status="featured" />}
              </div>
            )},
            { key:"createdAt", label:"Added", muted:true, mono:true },
            { key:"actions", label:"", render:(_,row) => canEdit && (
              <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                <Btn size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(row)}>Del</Btn>
              </div>
            )},
          ]}
          data={filtered}
          emptyMessage="No products match your filters"
        />
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editProduct ? "Edit Product" : "Add New Product"} subtitle="Manage product listing details" width={560}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Product Name" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required error={formErrors.name} />
          </div>
          <Input label="SKU" value={form.sku} onChange={e => setForm(f=>({...f,sku:e.target.value}))} required error={formErrors.sku} />
          <Input label="Category" type="select" value={form.categoryId} onChange={e => setForm(f=>({...f,categoryId:e.target.value}))} required error={formErrors.categoryId}
            options={[{value:"",label:"Select category…"}, ...categories.map(c => ({value:String(c.id),label:c.name}))]} />
          <Input label="Price ($)" type="number" value={form.price} onChange={e => setForm(f=>({...f,price:e.target.value}))} required error={formErrors.price} />
          <Input label="Original Price ($)" type="number" value={form.originalPrice} onChange={e => setForm(f=>({...f,originalPrice:e.target.value}))} hint="Leave blank if no discount" />
          <div style={{ gridColumn:"1/-1" }}>
            <Input label="Stock Quantity" type="number" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))} required error={formErrors.stock} />
          </div>
          <div style={{ display:"flex", gap:20, gridColumn:"1/-1" }}>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"var(--charcoal-700)" }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} />
              Active (visible in store)
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"var(--charcoal-700)" }}>
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f=>({...f,featured:e.target.checked}))} />
              Featured product
            </label>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:24, paddingTop:18, borderTop:"1px solid var(--cream-200)" }}>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn variant="amber" onClick={handleSave} loading={saving}>{editProduct ? "Save Changes" : "Add Product"}</Btn>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} title="Delete Product?" message={`"${confirmDelete?.name}" will be permanently removed. This action cannot be undone.`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ─── Categories page ──────────────────────────────────────────────────────────
function CategoriesPage({ data, dispatch, showToast }) {
  const { categories } = data;
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = { name:"", slug:"", active:true };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const openAdd = () => { setForm(emptyForm); setFormErrors({}); setEditCat(null); setModalOpen(true); };
  const openEdit = (c) => { setForm({ name:c.name, slug:c.slug, active:c.active }); setFormErrors({}); setEditCat(c); setModalOpen(true); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.slug.trim()) e.slug = "Slug is required";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    if (editCat) {
      dispatch({ type:"UPDATE_CATEGORY", payload:{...editCat, name:form.name, slug:form.slug, active:form.active} });
      showToast("Category updated", "success");
    } else {
      dispatch({ type:"ADD_CATEGORY", payload:{ id:++_cid, name:form.name, slug:form.slug, active:form.active, productCount:0 } });
      showToast("Category created", "success");
    }
    setSaving(false); setModalOpen(false);
  };

  const canEdit = can(user, "categories");

  return (
    <div className="animate-in">
      <PageHeader title="Categories" subtitle={`${categories.length} categories`}
        actions={canEdit ? [<Btn key="add" variant="amber" onClick={openAdd}>Add Category</Btn>] : []} />

      <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
        <Table
          columns={[
            { key:"name", label:"Name", render:(v,row) => (
              <div>
                <div style={{ fontWeight:500, color:"var(--charcoal-900)" }}>{v}</div>
                <div style={{ fontSize:11, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace" }}>/{row.slug}</div>
              </div>
            )},
            { key:"productCount", label:"Products", mono:true, render: v => <span style={{ fontWeight:500, color:"var(--charcoal-700)" }}>{v}</span> },
            { key:"active", label:"Status", render: v => <Badge status={v ? "active" : "inactive"} /> },
            { key:"actions", label:"", render:(_,row) => canEdit && (
              <div style={{ display:"flex", gap:4 }} onClick={e => e.stopPropagation()}>
                <Btn size="sm" variant="ghost" onClick={() => openEdit(row)}>Edit</Btn>
                <Btn size="sm" variant="danger" onClick={() => setConfirmDelete(row)}>Del</Btn>
              </div>
            )},
          ]}
          data={categories}
        />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCat ? "Edit Category" : "Add Category"}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Input label="Category Name" value={form.name} onChange={e => { setForm(f=>({...f,name:e.target.value,slug:e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")})); }} required error={formErrors.name} />
          <Input label="Slug" value={form.slug} onChange={e => setForm(f=>({...f,slug:e.target.value}))} required error={formErrors.slug} hint="Used in URLs, e.g. /category/engine" />
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"var(--charcoal-700)" }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm(f=>({...f,active:e.target.checked}))} />
            Active (visible in store)
          </label>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:24, paddingTop:18, borderTop:"1px solid var(--cream-200)" }}>
          <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Btn>
          <Btn variant="amber" onClick={handleSave} loading={saving}>{editCat ? "Save Changes" : "Create Category"}</Btn>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} title="Delete Category?" message={`"${confirmDelete?.name}" and its association with ${confirmDelete?.productCount} products will be removed.`} onConfirm={() => { dispatch({type:"DELETE_CATEGORY",payload:confirmDelete.id}); showToast("Category deleted","info"); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
    </div>
  );
}

// ─── Orders page ──────────────────────────────────────────────────────────────
function OrdersPage({ data, dispatch, showToast }) {
  const { orders, products } = data;
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusForm, setStatusForm] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => orders.filter(o => {
    const ms = !search || o.id.toLowerCase().includes(search.toLowerCase()) || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || o.status === statusFilter;
    return ms && mst;
  }), [orders, search, statusFilter]);

  const handleUpdateStatus = async () => {
    if (!statusForm || statusForm === selectedOrder.status) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    dispatch({ type:"UPDATE_ORDER", payload:{...selectedOrder, status:statusForm} });
    showToast(`Order ${selectedOrder.id} → ${statusForm}`, "success");
    setSelectedOrder(o => ({...o, status:statusForm}));
    setSaving(false);
  };

  const pName = id => products.find(p => p.id === id)?.name || "Unknown Product";
  const canEdit = can(user, "orders");

  return (
    <div className="animate-in">
      <PageHeader title="Orders" subtitle={`${filtered.length} orders`} />

      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID or customer…" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding:"8px 12px", border:"1px solid var(--cream-300)", borderRadius:"var(--radius-sm)", fontSize:13, background:"white", color:"var(--charcoal-700)", fontFamily:"'DM Sans',sans-serif" }}>
          {["all","pending","processing","shipped","delivered","cancelled"].map(s => <option key={s} value={s}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: selectedOrder ? "1fr 360px" : "1fr", gap:20 }}>
        <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
          <Table
            columns={[
              { key:"id", label:"Order ID", mono:true, render:(v,row) => <span style={{ color: row.id === selectedOrder?.id ? "var(--amber)" : "var(--sky)", fontWeight:500 }}>{v}</span> },
              { key:"customerName", label:"Customer", render:(v,row) => (
                <div>
                  <div style={{ fontWeight:500 }}>{v}</div>
                  <div style={{ fontSize:11, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace" }}>{row.customerEmail}</div>
                </div>
              )},
              { key:"total", label:"Total", mono:true, render: v => <span style={{ fontWeight:600 }}>${Number(v).toFixed(2)}</span> },
              { key:"status", label:"Status", render: v => <Badge status={v} /> },
              { key:"paymentStatus", label:"Payment", render: v => <Badge status={v} /> },
              { key:"createdAt", label:"Date", muted:true, mono:true },
            ]}
            data={filtered}
            selectedId={selectedOrder?.id}
            onRowClick={o => { setSelectedOrder(o); setStatusForm(o.status); }}
            emptyMessage="No orders match your filters"
          />
        </div>

        {selectedOrder && (
          <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)", padding:"20px", height:"fit-content", animation:"slideIn 0.2s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
              <div>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, color:"var(--charcoal-900)" }}>Order Detail</h3>
                <div style={{ fontSize:11, fontFamily:"'JetBrains Mono',monospace", color:"var(--sky)", marginTop:3 }}>{selectedOrder.id}</div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--charcoal-300)", fontSize:18 }}>✕</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16, padding:"12px", background:"var(--cream-100)", borderRadius:"var(--radius-sm)" }}>
              <Row label="Customer" value={selectedOrder.customerName} />
              <Row label="Email" value={selectedOrder.customerEmail} mono />
              <Row label="Date" value={selectedOrder.createdAt} mono />
              <Row label="Payment" value={<Badge status={selectedOrder.paymentStatus} />} />
            </div>

            <h4 style={{ fontSize:12, fontWeight:600, color:"var(--charcoal-400)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10, fontFamily:"'JetBrains Mono',monospace" }}>Items</h4>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              {selectedOrder.items.map((item, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"8px 0", borderBottom:"1px solid var(--cream-200)" }}>
                  <span style={{ color:"var(--charcoal-700)", flex:1 }}>{pName(item.productId)} ×{item.qty}</span>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:500 }}>${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", fontWeight:600, paddingTop:4 }}>
                <span>Total</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", color:"var(--amber)" }}>${Number(selectedOrder.total).toFixed(2)}</span>
              </div>
            </div>

            {canEdit && (
              <>
                <h4 style={{ fontSize:12, fontWeight:600, color:"var(--charcoal-400)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8, fontFamily:"'JetBrains Mono',monospace" }}>Update Status</h4>
                <div style={{ display:"flex", gap:8 }}>
                  <select value={statusForm} onChange={e => setStatusForm(e.target.value)} style={{ flex:1, padding:"8px 10px", border:"1px solid var(--cream-300)", borderRadius:"var(--radius-sm)", fontSize:12, background:"white", fontFamily:"'DM Sans',sans-serif" }}>
                    {["pending","processing","shipped","delivered","cancelled","refunded"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                  <Btn variant="amber" size="sm" onClick={handleUpdateStatus} loading={saving}>Update</Btn>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
      <span style={{ fontSize:12, color:"var(--charcoal-400)", fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:12, color:"var(--charcoal-700)", fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit", textAlign:"right" }}>{value}</span>
    </div>
  );
}

// ─── Analytics page ───────────────────────────────────────────────────────────
function AnalyticsPage({ data }) {
  const { orders, products } = data;
  const revenue = MONTHLY_REVENUE;
  const totalRevenue = revenue.reduce((a,b)=>a+b,0);
  const avgOrder = orders.filter(o=>o.paymentStatus==="paid").reduce((s,o)=>s+o.total,0) / orders.filter(o=>o.paymentStatus==="paid").length;
  const topProducts = [...products].sort((a,b)=>b.stock - a.stock).slice(0,5);
  const statusBreakdown = ["pending","processing","shipped","delivered","cancelled"].map(s=>({
    status:s, count:orders.filter(o=>o.status===s).length
  }));

  return (
    <div className="animate-in">
      <PageHeader title="Analytics" subtitle="Performance overview for the current period" />

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, marginBottom:28 }}>
        <StatCard label="Annual Revenue" value={`$${(totalRevenue/1000).toFixed(0)}K`} change="+22.3%" icon="◈" color="var(--amber)" />
        <StatCard label="Total Orders" value={MONTHLY_ORDERS.reduce((a,b)=>a+b,0)} change="+18.1%" icon="⊞" color="var(--sage)" />
        <StatCard label="Avg Order Value" value={`$${avgOrder.toFixed(0)}`} change="+3.2%" icon="◑" color="var(--sky)" />
        <StatCard label="Conversion Rate" value="3.8%" change="+0.6%" icon="◎" color="var(--amber)" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:20 }}>
        <div style={{ background:"white", borderRadius:"var(--radius-md)", padding:"20px 24px", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, color:"var(--charcoal-900)" }}>Monthly Revenue</h3>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:500, color:"var(--amber)" }}>${(totalRevenue/1000).toFixed(1)}K total</span>
          </div>
          <RevenueChart data={revenue} labels={MONTHS} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:20, paddingTop:16, borderTop:"1px solid var(--cream-200)" }}>
            {[["Best Month","Dec — $61.4K"],["Avg Monthly",`$${(totalRevenue/12/1000).toFixed(1)}K`],["YoY Growth","+22.3%"]].map(([l,v])=>(
              <div key={l}>
                <div style={{ fontSize:11, color:"var(--charcoal-300)", marginBottom:2 }}>{l}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:600, color:"var(--charcoal-800)" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:"white", borderRadius:"var(--radius-md)", padding:"20px 24px", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, color:"var(--charcoal-900)", marginBottom:20 }}>Order Status</h3>
          {statusBreakdown.map(({status,count}) => (
            <div key={status} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <Badge status={status} />
              <div style={{ flex:1, height:6, background:"var(--cream-200)", borderRadius:3, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${(count/orders.length)*100}%`, background: status==="delivered"?"var(--sage)":status==="pending"?"var(--amber)":status==="cancelled"?"var(--rust)":"var(--sky)", borderRadius:3, transition:"width 1s ease" }} />
              </div>
              <span style={{ fontSize:12, fontFamily:"'JetBrains Mono',monospace", color:"var(--charcoal-500)", minWidth:20, textAlign:"right" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"white", borderRadius:"var(--radius-md)", padding:"20px 24px", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, color:"var(--charcoal-900)", marginBottom:16 }}>Top Products by Stock</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {topProducts.map((p, i) => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom: i < topProducts.length-1 ? "1px solid var(--cream-100)" : "none" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--charcoal-300)", width:20 }}>{i+1}.</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--charcoal-900)" }}>{p.name}</div>
                <div style={{ fontSize:11, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace" }}>{p.sku}</div>
              </div>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:600, color:"var(--charcoal-700)" }}>${p.price}</span>
              <Badge status={p.active ? "active" : "inactive"} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color: p.stock < 10 ? "var(--rust)" : "var(--sage)", fontWeight:500, minWidth:50, textAlign:"right" }}>{p.stock} units</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Users page (super_admin + admin only) ───────────────────────────────────
function UsersPage({ showToast }) {
  const { user } = useAuth();
  const [users] = useState(DEMO_USERS.map(u => ({...u, password:undefined})));

  if (!can(user, "users")) return (
    <div className="animate-in" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:300, gap:12 }}>
      <span style={{ fontSize:32, opacity:.3 }}>◑</span>
      <p style={{ color:"var(--charcoal-400)", fontSize:14 }}>You don't have permission to view this section.</p>
    </div>
  );

  return (
    <div className="animate-in">
      <PageHeader title="Users & Roles" subtitle="Role-based access control" />
      <div style={{ marginBottom:20, padding:"14px 18px", background:"var(--amber-pale)", borderRadius:"var(--radius-md)", border:"var(--amber-border) 1px solid", fontSize:13, color:"var(--charcoal-700)" }}>
        <strong style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>Demo credentials —</strong> Login with any below to switch roles:
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:8, marginTop:10 }}>
          {DEMO_USERS.map(u => (
            <div key={u.id} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, padding:"6px 10px", background:"white", borderRadius:"var(--radius-sm)", border:"1px solid var(--cream-200)" }}>
              <span style={{ color:"var(--charcoal-900)", fontWeight:500 }}>{u.email}</span>
              <span style={{ color:"var(--charcoal-300)", marginLeft:6 }}>pw: {u.password}</span>
              <span style={{ float:"right" }}><Badge status={u.role === "super_admin" ? "featured" : u.role === "admin" ? "active" : "inactive"} /></span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)" }}>
        <Table
          columns={[
            { key:"name", label:"Name", render:(v,row) => (
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--amber-pale)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontFamily:"'Cormorant Garamond',serif", fontWeight:600, color:"var(--amber)", flexShrink:0 }}>{v[0]}</div>
                <div>
                  <div style={{ fontWeight:500 }}>{v}</div>
                  {row.id === user.id && <div style={{ fontSize:10, color:"var(--sage)", fontFamily:"'JetBrains Mono',monospace" }}>← you</div>}
                </div>
              </div>
            )},
            { key:"email", label:"Email", mono:true, muted:true },
            { key:"role", label:"Role", render: v => <Badge status={v === "super_admin" ? "featured" : v === "admin" ? "active" : "inactive"} /> },
            { key:"role", label:"Permissions", render: v => {
              const perms = ROLES[v]?.permissions || [];
              return (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {(perms.includes("all") ? ["All Access"] : perms).map(p => (
                    <span key={p} style={{ fontSize:10, padding:"2px 7px", background:"var(--cream-100)", borderRadius:10, color:"var(--charcoal-500)", fontFamily:"'JetBrains Mono',monospace" }}>{p}</span>
                  ))}
                </div>
              );
            }},
          ]}
          data={users}
        />
      </div>

      <div style={{ marginTop:20 }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:600, marginBottom:12, color:"var(--charcoal-900)" }}>Permission Matrix</h3>
        <div style={{ background:"white", borderRadius:"var(--radius-md)", boxShadow:"var(--shadow-sm)", border:"1px solid var(--cream-200)", overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"var(--cream-100)" }}>
                <th style={{ padding:"10px 16px", textAlign:"left", fontSize:11, fontWeight:600, color:"var(--charcoal-400)", textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'JetBrains Mono',monospace" }}>Section</th>
                {Object.entries(ROLES).map(([k,v]) => (
                  <th key={k} style={{ padding:"10px 16px", textAlign:"center", fontSize:11, fontWeight:600, color:"var(--charcoal-400)", textTransform:"uppercase", letterSpacing:"0.06em", fontFamily:"'JetBrains Mono',monospace" }}>{v.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["analytics","products","categories","orders","users"].map((perm,i) => (
                <tr key={perm} style={{ borderTop:"1px solid var(--cream-100)", background: i % 2 === 0 ? "white" : "var(--cream-50)" }}>
                  <td style={{ padding:"10px 16px", fontSize:13, fontFamily:"'JetBrains Mono',monospace", color:"var(--charcoal-600)", textTransform:"capitalize" }}>{perm}</td>
                  {Object.entries(ROLES).map(([k,v]) => (
                    <td key={k} style={{ padding:"10px 16px", textAlign:"center", fontSize:16 }}>
                      {(v.permissions.includes("all") || v.permissions.includes(perm)) ? <span style={{ color:"var(--sage)" }}>✓</span> : <span style={{ color:"var(--cream-300)" }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("admin@ironclad.dev");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    if (user) { onLogin(user); }
    else { setError("Invalid email or password"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--charcoal-900)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:20 }}>
      <div style={{ width:"100%", maxWidth:420 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:52, height:52, background:"var(--amber)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:"var(--charcoal-900)", margin:"0 auto 16px" }}>IC</div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:600, color:"var(--cream-50)", marginBottom:6 }}>Ironclad Admin</h1>
          <p style={{ color:"var(--charcoal-300)", fontSize:14 }}>Sign in to manage your store</p>
        </div>

        <form onSubmit={handleLogin} style={{ background:"var(--charcoal-800)", borderRadius:"var(--radius-lg)", padding:"28px 32px", boxShadow:"0 20px 60px rgba(0,0,0,.4)", border:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--charcoal-200)", marginBottom:6 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width:"100%", padding:"10px 14px", background:"var(--charcoal-700)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"var(--radius-sm)", fontSize:14, color:"var(--cream-50)", fontFamily:"'DM Sans',sans-serif", outline:"none", transition:"border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor="var(--amber)"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:500, color:"var(--charcoal-200)", marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width:"100%", padding:"10px 14px", background:"var(--charcoal-700)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"var(--radius-sm)", fontSize:14, color:"var(--cream-50)", fontFamily:"'DM Sans',sans-serif", outline:"none", transition:"border-color 0.15s" }}
                onFocus={e => e.target.style.borderColor="var(--amber)"} onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            </div>
            {error && <div style={{ padding:"10px 14px", background:"rgba(184,74,46,0.12)", borderRadius:"var(--radius-sm)", border:"1px solid rgba(184,74,46,0.25)", fontSize:13, color:"#F28B7A", display:"flex", alignItems:"center", gap:8 }}>⚠ {error}</div>}
          </div>

          <button type="submit" disabled={loading} style={{ width:"100%", padding:"12px", background:loading?"var(--charcoal-600)":"var(--amber)", border:"none", borderRadius:"var(--radius-sm)", fontSize:14, fontWeight:600, color:"var(--charcoal-900)", cursor:loading?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading && <span style={{ width:14, height:14, border:"2px solid var(--charcoal-900)", borderTopColor:"transparent", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }} />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop:16, padding:"14px 16px", background:"rgba(255,255,255,0.04)", borderRadius:"var(--radius-md)", border:"1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize:11, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace", marginBottom:8 }}>Demo accounts:</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            {DEMO_USERS.map(u => (
              <button key={u.id} onClick={() => { setEmail(u.email); setPassword(u.password); }}
                style={{ padding:"6px 8px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"var(--radius-sm)", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.09)"} onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
                <div style={{ fontSize:10, color:"var(--cream-100)", fontFamily:"'JetBrains Mono',monospace" }}>{u.email.split("@")[0]}</div>
                <div style={{ fontSize:9, color:"var(--charcoal-400)", marginTop:1, fontFamily:"'JetBrains Mono',monospace" }}>{ROLES[u.role]?.label}</div>
              </button>
            ))}
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authUser, setAuthUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [appState, dispatch] = useReducer(appReducer, { products: PRODUCTS_INIT, categories: CATEGORIES_INIT, orders: ORDERS_INIT });

  const showToast = useCallback((message, type="info") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const handleLogin = (user) => {
    setAuthUser(user);
    setCurrentPage("dashboard");
  };

  const handleLogout = () => {
    setAuthUser(null);
    setCurrentPage("dashboard");
    showToast("Signed out successfully", "info");
  };

  if (!authUser) return (
    <>
      <FontStyle />
      <LoginPage onLogin={handleLogin} />
    </>
  );

  const pageProps = { data: appState, dispatch, showToast };

  return (
    <AuthContext.Provider value={{ user: authUser, logout: handleLogout }}>
      <FontStyle />
      <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} collapsed={collapsed} setCollapsed={setCollapsed} />

        <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
          {/* Top bar */}
          <div style={{ height:52, background:"white", borderBottom:"1px solid var(--cream-200)", display:"flex", alignItems:"center", padding:"0 24px", flexShrink:0, gap:12 }}>
            <div style={{ flex:1, fontSize:12, color:"var(--charcoal-300)", fontFamily:"'JetBrains Mono',monospace" }}>
              <span style={{ color:"var(--charcoal-500)" }}>ironclad</span> / {currentPage}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--sage)", animation:"pulse 2s infinite" }} />
              <span style={{ fontSize:12, color:"var(--charcoal-400)", fontFamily:"'JetBrains Mono',monospace" }}>{authUser.name}</span>
              <span style={{ padding:"2px 8px", borderRadius:12, fontSize:11, background:"var(--amber-pale)", color:"var(--amber)", border:"1px solid var(--amber-border)", fontFamily:"'JetBrains Mono',monospace" }}>{ROLES[authUser.role]?.label}</span>
              <Btn variant="ghost" size="sm" onClick={handleLogout} style={{ fontSize:12 }}>Sign out</Btn>
            </div>
          </div>

          {/* Main content */}
          <main style={{ flex:1, padding:"28px 32px", overflow:"auto" }}>
            {currentPage === "dashboard"  && <DashboardPage  {...pageProps} />}
            {currentPage === "products"   && <ProductsPage   {...pageProps} />}
            {currentPage === "categories" && <CategoriesPage {...pageProps} />}
            {currentPage === "orders"     && <OrdersPage     {...pageProps} />}
            {currentPage === "analytics"  && <AnalyticsPage  {...pageProps} />}
            {currentPage === "users"      && <UsersPage      {...pageProps} />}
          </main>
        </div>
      </div>

      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AuthContext.Provider>
  );
}
