import { useState, useReducer, useEffect, useRef, useCallback, useMemo } from "react";

/* ─── Google Fonts ──────────────────────────────────────────────── */
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink:    #080A0C;
      --ink2:   #0F1214;
      --ink3:   #161A1E;
      --ink4:   #1E2328;
      --ink5:   #252C33;
      --line:   #252C33;
      --line2:  #2E3740;
      --dim:    #4A5568;
      --muted:  #718096;
      --soft:   #A0AEC0;
      --text:   #E2E8F0;
      --white:  #F7FAFC;
      --amber:  #F6C343;
      --amber2: #E8A600;
      --amber3: rgba(246,195,67,0.12);
      --amber4: rgba(246,195,67,0.06);
      --green:  #48BB78;
      --green2: rgba(72,187,120,0.12);
      --red:    #FC8181;
      --red2:   rgba(252,129,129,0.1);
      --blue:   #63B3ED;
      --blue2:  rgba(99,179,237,0.1);
      --r4: 4px; --r8: 8px; --r12: 12px; --r16: 16px; --r24: 24px;
    }
    body { background: var(--ink); color: var(--text); font-family: 'Outfit', sans-serif; font-size: 15px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
    ::selection { background: var(--amber3); color: var(--amber); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: var(--ink2); }
    ::-webkit-scrollbar-thumb { background: var(--ink5); border-radius: 2px; }
    input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px var(--ink4) inset !important; -webkit-text-fill-color: var(--text) !important; }

    @keyframes fadeUp   { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
    @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
    @keyframes slideIn  { from { opacity:0; transform:translateX(24px) } to { opacity:1; transform:none } }
    @keyframes pulse2   { 0%,100% { opacity:1 } 50% { opacity:.4 } }
    @keyframes spin     { to { transform: rotate(360deg) } }
    @keyframes progress { from { width:0 } to { width:100% } }
    @keyframes checkDraw {
      from { stroke-dashoffset: 60 }
      to   { stroke-dashoffset: 0  }
    }
    @keyframes ripple {
      from { transform: scale(0); opacity: 0.4 }
      to   { transform: scale(4); opacity: 0   }
    }
    @keyframes float {
      0%,100% { transform: translateY(0) }
      50%     { transform: translateY(-4px) }
    }
    .fade-up   { animation: fadeUp   0.4s cubic-bezier(0.16,1,0.3,1) both }
    .fade-in   { animation: fadeIn   0.3s ease both }
    .slide-in  { animation: slideIn  0.35s cubic-bezier(0.16,1,0.3,1) both }
  `}</style>
);

/* ─── Mock cart data ────────────────────────────────────────────── */
const INITIAL_CART = [
  { id:"p001", name:"OEM Brake Pad Set — Front", sku:"BP-BMW3-F-001", price:89.99, qty:1, img:"🔩" },
  { id:"p019", name:"Premium Synthetic Oil Filter", sku:"OF-BMW-019",   price:24.99, qty:3, img:"⚙️" },
  { id:"p011", name:"Slotted Brake Rotor Pair",    sku:"BR-TOY-CAM-F", price:149.99, qty:1, img:"🛞" },
];

const SHIPPING_OPTIONS = [
  { id:"standard", label:"Standard Delivery", days:"5–7 business days", price:0,     badge:"FREE" },
  { id:"express",  label:"Express Delivery",  days:"2–3 business days", price:12.99, badge:"FAST" },
  { id:"overnight",label:"Overnight Courier", days:"Next business day",  price:29.99, badge:"NEXT DAY" },
];

/* ─── Checkout state machine ────────────────────────────────────── */
const STEPS = ["cart","contact","shipping","payment","review","confirmation"];

function checkoutReducer(state, action) {
  switch (action.type) {
    case "SET_STEP":        return { ...state, step: action.payload };
    case "SET_CONTACT":    return { ...state, contact: action.payload };
    case "SET_SHIPPING":   return { ...state, shippingMethod: action.payload };
    case "SET_PAYMENT":    return { ...state, payment: action.payload };
    case "SET_CART":       return { ...state, cart: action.payload };
    case "SET_ORDER":      return { ...state, order: action.payload };
    case "SET_PROCESSING": return { ...state, processing: action.payload };
    case "SET_ERROR":      return { ...state, error: action.payload };
    default: return state;
  }
}

const initialState = {
  step: "cart",
  cart: INITIAL_CART,
  contact: { email:"", firstName:"", lastName:"", phone:"", address:"", city:"", state:"", zip:"", country:"US" },
  shippingMethod: "standard",
  payment: { method:"card", card:{ number:"", name:"", expiry:"", cvv:"" }, saveCard:false },
  order: null,
  processing: false,
  error: null,
};

/* ─── Shared UI components ──────────────────────────────────────── */

function Input({ label, id, value, onChange, type="text", placeholder, error, hint, required, autoComplete, maxLength, pattern, inputMode }) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label htmlFor={id} style={{ fontSize:11, fontWeight:600, color: error && touched ? "var(--red)" : "var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace", display:"flex", gap:4 }}>
        {label}{required && <span style={{ color:"var(--amber)" }}>*</span>}
      </label>
      <div style={{ position:"relative" }}>
        <input
          id={id} type={type} value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          maxLength={maxLength} pattern={pattern} inputMode={inputMode}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTouched(true); }}
          style={{
            width:"100%", padding:"13px 16px",
            background: focused ? "var(--ink4)" : "var(--ink3)",
            border:`1.5px solid ${error && touched ? "var(--red)" : focused ? "var(--amber)" : "var(--line2)"}`,
            borderRadius:"var(--r8)", color:"var(--white)", fontSize:14,
            fontFamily:"'Outfit',sans-serif", outline:"none",
            transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)",
            boxShadow: focused ? `0 0 0 4px ${error && touched ? "var(--red2)" : "var(--amber3)"}` : "none",
          }}
        />
        {error && touched && (
          <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"var(--red)", fontSize:16 }}>!</div>
        )}
      </div>
      {error && touched && <span style={{ fontSize:12, color:"var(--red)", display:"flex", alignItems:"center", gap:4 }}>{error}</span>}
      {hint && !error && <span style={{ fontSize:12, color:"var(--dim)" }}>{hint}</span>}
    </div>
  );
}

function Select({ label, id, value, onChange, options, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <label htmlFor={id} style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace" }}>
        {label}{required && <span style={{ color:"var(--amber)", marginLeft:4 }}>*</span>}
      </label>
      <select id={id} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ padding:"13px 16px", background:"var(--ink3)", border:`1.5px solid ${focused ? "var(--amber)" : "var(--line2)"}`, borderRadius:"var(--r8)", color:"var(--white)", fontSize:14, fontFamily:"'Outfit',sans-serif", outline:"none", cursor:"pointer", transition:"all 0.2s", boxShadow: focused ? "0 0 0 4px var(--amber3)" : "none", appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M0 0l6 8 6-8z' fill='%23718096'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background:"var(--ink3)" }}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Button({ children, onClick, variant="primary", disabled, loading, fullWidth, style={} }) {
  const [ripples, setRipples] = useState([]);
  const handleClick = (e) => {
    if (disabled || loading) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600);
    onClick?.(e);
  };
  const [hovered, setHovered] = useState(false);
  const variants = {
    primary: {
      bg: hovered ? "var(--amber2)" : "var(--amber)",
      color: "#0a0a0c",
      border: "transparent",
      shadow: hovered ? "0 8px 32px rgba(246,195,67,0.35)" : "0 4px 16px rgba(246,195,67,0.2)",
    },
    secondary: {
      bg: hovered ? "var(--ink4)" : "var(--ink3)",
      color: "var(--text)",
      border: hovered ? "var(--amber)" : "var(--line2)",
      shadow: "none",
    },
    ghost: {
      bg: "transparent",
      color: hovered ? "var(--text)" : "var(--soft)",
      border: "transparent",
      shadow: "none",
    },
    danger: {
      bg: hovered ? "rgba(252,129,129,0.15)" : "transparent",
      color: "var(--red)",
      border: "var(--red)",
      shadow: "none",
    },
  };
  const v = variants[variant];
  return (
    <button
      onClick={handleClick} disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding: variant === "ghost" ? "8px 16px" : "14px 28px",
        background: v.bg, color: v.color, border:`1.5px solid ${v.border}`,
        borderRadius:"var(--r8)", fontSize:14, fontWeight:600,
        fontFamily:"'Outfit',sans-serif", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1, width: fullWidth ? "100%" : "auto",
        boxShadow: v.shadow, transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)",
        display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
        letterSpacing:"0.02em", ...style,
      }}
    >
      {ripples.map(rp => (
        <span key={rp.id} style={{ position:"absolute", left:rp.x, top:rp.y, width:10, height:10, marginLeft:-5, marginTop:-5, borderRadius:"50%", background: variant==="primary" ? "rgba(0,0,0,0.25)" : "rgba(246,195,67,0.25)", animation:"ripple 0.6s ease-out both", pointerEvents:"none" }} />
      ))}
      {loading && <span style={{ width:16, height:16, border:"2.5px solid currentColor", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }} />}
      {children}
    </button>
  );
}

/* ─── Step progress indicator ───────────────────────────────────── */
const STEP_LABELS = { cart:"Cart", contact:"Info", shipping:"Shipping", payment:"Payment", review:"Review", confirmation:"Done" };
const VISIBLE_STEPS = ["cart","contact","shipping","payment","review"];

function StepIndicator({ currentStep }) {
  const idx = VISIBLE_STEPS.indexOf(currentStep);
  if (currentStep === "confirmation") return null;
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:0, marginBottom:40 }}>
      {VISIBLE_STEPS.map((step, i) => {
        const isActive = i === idx;
        const isDone = i < idx;
        const isLast = i === VISIBLE_STEPS.length - 1;
        return (
          <div key={step} style={{ display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: isDone ? "var(--amber)" : isActive ? "var(--ink)" : "var(--ink3)",
                border: `2px solid ${isDone ? "var(--amber)" : isActive ? "var(--amber)" : "var(--line2)"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                transition:"all 0.4s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: isActive ? "0 0 0 6px var(--amber3)" : "none",
              }}>
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 5.5,10.5 12,3" fill="none" stroke="#0a0a0c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : (
                  <span style={{ fontSize:11, fontWeight:700, color: isActive ? "var(--amber)" : "var(--dim)", fontFamily:"'JetBrains Mono',monospace" }}>{i+1}</span>
                )}
              </div>
              <span style={{ fontSize:10, fontWeight:600, color: isActive ? "var(--amber)" : isDone ? "var(--soft)" : "var(--dim)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap" }}>{STEP_LABELS[step]}</span>
            </div>
            {!isLast && (
              <div style={{ width:48, height:2, background: isDone ? "var(--amber)" : "var(--line2)", margin:"0 4px", marginBottom:28, transition:"background 0.4s", borderRadius:1 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Order summary sidebar ─────────────────────────────────────── */
function OrderSummary({ cart, shippingMethod, compact=false }) {
  const shipping = SHIPPING_OPTIONS.find(o => o.id === shippingMethod) || SHIPPING_OPTIONS[0];
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingCost = shipping.price;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  return (
    <div style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r16)", padding: compact ? "20px" : "28px", display:"flex", flexDirection:"column", gap:20 }}>
      {!compact && (
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:600, color:"var(--white)" }}>Order Summary</h3>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {cart.map(item => (
          <div key={item.id} style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ width:40, height:40, background:"var(--ink4)", borderRadius:"var(--r8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, border:"1px solid var(--line2)" }}>
              {item.img}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", lineHeight:1.4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
              <div style={{ fontSize:11, color:"var(--dim)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{item.sku} × {item.qty}</div>
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--white)", fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>
              ${(item.price * item.qty).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop:"1px solid var(--line)", paddingTop:16, display:"flex", flexDirection:"column", gap:10 }}>
        {[
          ["Subtotal", `$${subtotal.toFixed(2)}`],
          ["Shipping", shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`],
          ["Tax (8%)", `$${tax.toFixed(2)}`],
        ].map(([label, value]) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, color:"var(--muted)" }}>{label}</span>
            <span style={{ fontSize:13, color: value === "FREE" ? "var(--green)" : "var(--soft)", fontFamily:"'JetBrains Mono',monospace", fontWeight:500 }}>{value}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:12, borderTop:"1px solid var(--line2)", marginTop:2 }}>
          <span style={{ fontSize:15, fontWeight:600, color:"var(--white)" }}>Total</span>
          <span style={{ fontSize:20, fontWeight:700, color:"var(--amber)", fontFamily:"'JetBrains Mono',monospace" }}>${total.toFixed(2)}</span>
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"var(--green2)", borderRadius:"var(--r8)", border:"1px solid rgba(72,187,120,0.2)" }}>
        <span style={{ fontSize:14 }}>🔒</span>
        <span style={{ fontSize:12, color:"var(--green)" }}>256-bit SSL encryption · PCI-DSS compliant</span>
      </div>
    </div>
  );
}

/* ─── STEP 1: Cart ──────────────────────────────────────────────── */
function CartStep({ cart, dispatch, onNext }) {
  const updateQty = (id, delta) => {
    const updated = cart.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i);
    dispatch({ type:"SET_CART", payload: updated });
  };
  const removeItem = (id) => dispatch({ type:"SET_CART", payload: cart.filter(i => i.id !== id) });
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Your Cart</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:28 }}>{cart.length} item{cart.length !== 1 ? "s" : ""} · ${subtotal.toFixed(2)}</p>

      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:28 }}>
        {cart.map((item, i) => (
          <div key={item.id} className="fade-up" style={{ animationDelay:`${i * 0.06}s`, background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r12)", padding:"18px 20px", display:"flex", gap:16, alignItems:"center", transition:"border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor="var(--line2)"}
            onMouseLeave={e => e.currentTarget.style.borderColor="var(--line)"}
          >
            <div style={{ width:52, height:52, background:"var(--ink4)", borderRadius:"var(--r8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
              {item.img}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--white)" }}>{item.name}</div>
              <div style={{ fontSize:11, color:"var(--dim)", fontFamily:"'JetBrains Mono',monospace", marginTop:3 }}>{item.sku}</div>
              <div style={{ fontSize:15, fontWeight:700, color:"var(--amber)", fontFamily:"'JetBrains Mono',monospace", marginTop:6 }}>${item.price.toFixed(2)}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:0, border:"1px solid var(--line2)", borderRadius:"var(--r8)", overflow:"hidden" }}>
                <button onClick={() => updateQty(item.id, -1)} style={{ width:36, height:36, background:"var(--ink3)", border:"none", color:"var(--soft)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background="var(--ink4)"} onMouseLeave={e => e.currentTarget.style.background="var(--ink3)"}>−</button>
                <span style={{ width:40, textAlign:"center", fontSize:14, fontWeight:600, color:"var(--white)", fontFamily:"'JetBrains Mono',monospace", background:"var(--ink4)" }}>{item.qty}</span>
                <button onClick={() => updateQty(item.id, +1)} style={{ width:36, height:36, background:"var(--ink3)", border:"none", color:"var(--soft)", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background="var(--ink4)"} onMouseLeave={e => e.currentTarget.style.background="var(--ink3)"}>+</button>
              </div>
              <div style={{ fontSize:16, fontWeight:700, color:"var(--white)", fontFamily:"'JetBrains Mono',monospace", minWidth:70, textAlign:"right" }}>
                ${(item.price * item.qty).toFixed(2)}
              </div>
              <button onClick={() => removeItem(item.id)} style={{ width:32, height:32, background:"transparent", border:"none", color:"var(--dim)", fontSize:16, cursor:"pointer", borderRadius:"var(--r8)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background="var(--red2)"; e.currentTarget.style.color="var(--red)"; }} onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color="var(--dim)"; }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <Button onClick={onNext} disabled={cart.length === 0}>
          Continue to Checkout →
        </Button>
      </div>
    </div>
  );
}

/* ─── STEP 2: Contact / Address ─────────────────────────────────── */
function ContactStep({ contact, dispatch, onNext, onBack }) {
  const [form, setForm] = useState(contact);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";
    if (!form.firstName.trim()) e.firstName = "First name required";
    if (!form.lastName.trim()) e.lastName = "Last name required";
    if (!form.phone.trim()) e.phone = "Phone number required";
    if (!form.address.trim()) e.address = "Street address required";
    if (!form.city.trim()) e.city = "City required";
    if (!form.state.trim()) e.state = "State required";
    if (!form.zip.trim()) e.zip = "ZIP code required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      dispatch({ type:"SET_CONTACT", payload: form });
      onNext();
    }
  };

  const G = ({ children, cols=1 }) => <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols},1fr)`, gap:16 }}>{children}</div>;

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Contact & Delivery</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:28 }}>Where should we send your order?</p>

      <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
        <section>
          <SectionLabel icon="✉" label="Contact Information" />
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Email Address" id="email" value={form.email} onChange={e => set("email", e.target.value)} type="email" placeholder="you@example.com" required autoComplete="email" error={errors.email} />
            <Input label="Phone Number" id="phone" value={form.phone} onChange={e => set("phone", e.target.value)} type="tel" placeholder="+1 (555) 000-0000" required autoComplete="tel" error={errors.phone} inputMode="tel" />
          </div>
        </section>

        <section>
          <SectionLabel icon="👤" label="Full Name" />
          <G cols={2}>
            <Input label="First Name" id="firstName" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Jane" required autoComplete="given-name" error={errors.firstName} />
            <Input label="Last Name" id="lastName" value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Mechanic" required autoComplete="family-name" error={errors.lastName} />
          </G>
        </section>

        <section>
          <SectionLabel icon="📍" label="Shipping Address" />
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <Input label="Street Address" id="address" value={form.address} onChange={e => set("address", e.target.value)} placeholder="42 Wrench Street, Apt 2B" required autoComplete="street-address" error={errors.address} />
            <G cols={2}>
              <Input label="City" id="city" value={form.city} onChange={e => set("city", e.target.value)} placeholder="Detroit" required autoComplete="address-level2" error={errors.city} />
              <Input label="State" id="state" value={form.state} onChange={e => set("state", e.target.value)} placeholder="MI" required autoComplete="address-level1" error={errors.state} maxLength={2} />
            </G>
            <G cols={2}>
              <Input label="ZIP Code" id="zip" value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="48201" required autoComplete="postal-code" error={errors.zip} maxLength={10} inputMode="numeric" />
              <Select label="Country" id="country" value={form.country} onChange={e => set("country", e.target.value)} required options={[{value:"US",label:"United States"},{value:"CA",label:"Canada"},{value:"GB",label:"United Kingdom"},{value:"DE",label:"Germany"},{value:"AU",label:"Australia"}]} />
            </G>
          </div>
        </section>
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} nextLabel="Continue to Shipping →" />
    </div>
  );
}

/* ─── STEP 3: Shipping ──────────────────────────────────────────── */
function ShippingStep({ shippingMethod, dispatch, onNext, onBack }) {
  const [selected, setSelected] = useState(shippingMethod);

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Shipping Method</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:28 }}>Choose how fast you need your parts</p>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {SHIPPING_OPTIONS.map((opt, i) => {
          const isSelected = selected === opt.id;
          return (
            <div key={opt.id} className="fade-up" style={{ animationDelay:`${i*0.08}s` }} onClick={() => setSelected(opt.id)}>
              <div style={{
                padding:"20px 22px", background: isSelected ? "var(--ink4)" : "var(--ink2)",
                border:`2px solid ${isSelected ? "var(--amber)" : "var(--line)"}`,
                borderRadius:"var(--r12)", cursor:"pointer",
                transition:"all 0.25s cubic-bezier(0.16,1,0.3,1)",
                boxShadow: isSelected ? "0 0 0 4px var(--amber3)" : "none",
                display:"flex", alignItems:"center", gap:16,
              }}>
                <div style={{
                  width:22, height:22, borderRadius:"50%",
                  border:`2px solid ${isSelected ? "var(--amber)" : "var(--dim)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  transition:"all 0.2s", flexShrink:0,
                }}>
                  {isSelected && <div style={{ width:10, height:10, borderRadius:"50%", background:"var(--amber)" }} />}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:600, color:"var(--white)" }}>{opt.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background: opt.id==="standard" ? "var(--green2)" : opt.id==="express" ? "var(--amber3)" : "rgba(99,179,237,0.12)", color: opt.id==="standard" ? "var(--green)" : opt.id==="express" ? "var(--amber)" : "var(--blue)", border:`1px solid ${opt.id==="standard" ? "rgba(72,187,120,0.3)" : opt.id==="express" ? "rgba(246,195,67,0.3)" : "rgba(99,179,237,0.3)"}`, fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.05em" }}>{opt.badge}</span>
                  </div>
                  <div style={{ fontSize:13, color:"var(--muted)" }}>{opt.days}</div>
                </div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:700, color: opt.price === 0 ? "var(--green)" : "var(--amber)", flexShrink:0 }}>
                  {opt.price === 0 ? "FREE" : `$${opt.price.toFixed(2)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <NavButtons onBack={onBack} onNext={() => { dispatch({ type:"SET_SHIPPING", payload: selected }); onNext(); }} nextLabel="Continue to Payment →" />
    </div>
  );
}

/* ─── STEP 4: Payment ───────────────────────────────────────────── */
function PaymentStep({ payment, dispatch, onNext, onBack }) {
  const [method, setMethod] = useState(payment.method);
  const [card, setCard] = useState(payment.card);
  const [saveCard, setSaveCard] = useState(payment.saveCard);
  const [cardErrors, setCardErrors] = useState({});

  const setCardField = (key, val) => setCard(c => ({ ...c, [key]: val }));

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})/g, "$1 ").trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0,2) + "/" + digits.slice(2);
    return digits;
  };

  const detectCardType = (num) => {
    const n = num.replace(/\s/g,"");
    if (/^4/.test(n)) return "VISA";
    if (/^5[1-5]/.test(n)) return "MC";
    if (/^3[47]/.test(n)) return "AMEX";
    if (/^6/.test(n)) return "DISC";
    return null;
  };

  const cardType = detectCardType(card.number);

  const validateCard = () => {
    const e = {};
    const digits = card.number.replace(/\s/g, "");
    if (!digits || digits.length < 13) e.number = "Invalid card number";
    if (!card.name.trim()) e.name = "Cardholder name required";
    if (!card.expiry || !/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = "Invalid expiry (MM/YY)";
    if (!card.cvv || card.cvv.length < 3) e.cvv = "Invalid CVV";
    setCardErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (method === "card" && !validateCard()) return;
    dispatch({ type:"SET_PAYMENT", payload: { method, card, saveCard } });
    onNext();
  };

  const METHODS = [
    { id:"card", label:"Credit / Debit Card", icon:"💳", desc:"Visa, Mastercard, Amex, Discover" },
    { id:"paypal", label:"PayPal", icon:"🅿", desc:"Pay with your PayPal account" },
    { id:"cod", label:"Cash on Delivery", icon:"💵", desc:"Pay when your order arrives" },
  ];

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Payment Method</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:28 }}>All transactions are secured and encrypted</p>

      {/* Method selector */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:28 }}>
        {METHODS.map(m => {
          const isSel = method === m.id;
          return (
            <div key={m.id} onClick={() => setMethod(m.id)} style={{
              padding:"16px", background: isSel ? "var(--ink4)" : "var(--ink2)",
              border:`2px solid ${isSel ? "var(--amber)" : "var(--line)"}`,
              borderRadius:"var(--r12)", cursor:"pointer",
              transition:"all 0.2s cubic-bezier(0.16,1,0.3,1)",
              boxShadow: isSel ? "0 0 0 4px var(--amber3)" : "none",
              display:"flex", flexDirection:"column", alignItems:"center", gap:8, textAlign:"center",
            }}>
              <span style={{ fontSize:28 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--white)", lineHeight:1.3 }}>{m.label}</div>
                <div style={{ fontSize:11, color:"var(--dim)", marginTop:3 }}>{m.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card form */}
      {method === "card" && (
        <div className="slide-in">
          <div style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r12)", padding:"24px", display:"flex", flexDirection:"column", gap:18 }}>
            {/* Card preview */}
            <div style={{ background:`linear-gradient(135deg, var(--ink4) 0%, var(--ink5) 100%)`, borderRadius:"var(--r12)", padding:"20px 24px", border:"1px solid var(--line2)", position:"relative", overflow:"hidden", marginBottom:4 }}>
              <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"rgba(246,195,67,0.06)" }} />
              <div style={{ position:"absolute", top:20, right:-20, width:80, height:80, borderRadius:"50%", background:"rgba(246,195,67,0.04)" }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
                <div style={{ width:42, height:30, background:"linear-gradient(135deg, var(--amber) 0%, var(--amber2) 100%)", borderRadius:4 }} />
                {cardType && <span style={{ fontSize:11, fontWeight:700, color:"var(--amber)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.1em", background:"var(--amber3)", padding:"3px 8px", borderRadius:4 }}>{cardType}</span>}
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:500, color:"var(--text)", letterSpacing:"0.15em", marginBottom:16 }}>
                {card.number || "•••• •••• •••• ••••"}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                <div><div style={{ fontSize:10, color:"var(--dim)", marginBottom:2, letterSpacing:"0.05em" }}>CARDHOLDER</div><div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"var(--text)", textTransform:"uppercase" }}>{card.name || "YOUR NAME"}</div></div>
                <div><div style={{ fontSize:10, color:"var(--dim)", marginBottom:2, letterSpacing:"0.05em" }}>EXPIRES</div><div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"var(--text)" }}>{card.expiry || "MM/YY"}</div></div>
              </div>
            </div>

            <Input label="Card Number" id="cardNum" value={card.number} onChange={e => setCardField("number", formatCardNumber(e.target.value))} placeholder="1234 5678 9012 3456" maxLength={19} inputMode="numeric" error={cardErrors.number} autoComplete="cc-number" />
            <Input label="Cardholder Name" id="cardName" value={card.name} onChange={e => setCardField("name", e.target.value.toUpperCase())} placeholder="JANE MECHANIC" error={cardErrors.name} autoComplete="cc-name" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Input label="Expiry Date" id="expiry" value={card.expiry} onChange={e => setCardField("expiry", formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} inputMode="numeric" error={cardErrors.expiry} autoComplete="cc-exp" />
              <Input label="CVV" id="cvv" value={card.cvv} onChange={e => setCardField("cvv", e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="•••" type="password" maxLength={4} inputMode="numeric" error={cardErrors.cvv} autoComplete="cc-csc" />
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"10px 14px", background:"var(--ink3)", borderRadius:"var(--r8)", border:"1px solid var(--line2)" }}>
              <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} style={{ width:16, height:16, accentColor:"var(--amber)", cursor:"pointer" }} />
              <span style={{ fontSize:13, color:"var(--soft)" }}>Save card for future purchases</span>
            </label>
          </div>
        </div>
      )}

      {method === "paypal" && (
        <div className="slide-in" style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r12)", padding:"32px", textAlign:"center" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🅿</div>
          <div style={{ fontSize:16, fontWeight:600, color:"var(--white)", marginBottom:8 }}>Continue with PayPal</div>
          <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.6 }}>You'll be redirected to PayPal to complete your payment securely. No account? No problem — pay with a debit or credit card through PayPal.</div>
        </div>
      )}

      {method === "cod" && (
        <div className="slide-in" style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r12)", padding:"32px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:16 }}>
            <span style={{ fontSize:32 }}>💵</span>
            <div>
              <div style={{ fontSize:16, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Cash on Delivery</div>
              <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.7 }}>Pay in cash when your order is delivered. Our driver will carry a receipt. Please have the exact amount ready.</div>
            </div>
          </div>
          <div style={{ padding:"12px 16px", background:"var(--amber4)", borderRadius:"var(--r8)", border:"1px solid rgba(246,195,67,0.15)", fontSize:13, color:"var(--amber)" }}>
            ⚠ COD orders may take 1–2 additional business days to process.
          </div>
        </div>
      )}

      <NavButtons onBack={onBack} onNext={handleNext} nextLabel="Review Order →" />
    </div>
  );
}

/* ─── STEP 5: Review ────────────────────────────────────────────── */
function ReviewStep({ state, dispatch, onNext, onBack }) {
  const { contact, shippingMethod, payment, cart } = state;
  const shipping = SHIPPING_OPTIONS.find(o => o.id === shippingMethod);
  const [loading, setLoading] = useState(false);

  const handlePlaceOrder = async () => {
    setLoading(true);
    dispatch({ type:"SET_PROCESSING", payload: true });

    // Simulate API call
    await new Promise(r => setTimeout(r, 2200));

    const order = {
      id: `IC-${Date.now().toString(36).toUpperCase().slice(-6)}`,
      items: cart,
      contact,
      shippingMethod,
      payment: { method: payment.method },
      subtotal: cart.reduce((s,i) => s + i.price*i.qty, 0),
      shippingCost: shipping.price,
      tax: cart.reduce((s,i) => s + i.price*i.qty, 0) * 0.08,
      total: cart.reduce((s,i) => s + i.price*i.qty, 0) * 1.08 + shipping.price,
      placedAt: new Date().toISOString(),
      estimatedDelivery: shipping.days,
    };

    dispatch({ type:"SET_ORDER", payload: order });
    dispatch({ type:"SET_PROCESSING", payload: false });
    setLoading(false);
    onNext();
  };

  const ReviewRow = ({ label, value }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, padding:"10px 0", borderBottom:"1px solid var(--line)" }}>
      <span style={{ fontSize:12, color:"var(--dim)", fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:13, color:"var(--text)", textAlign:"right" }}>{value}</span>
    </div>
  );

  return (
    <div className="fade-up">
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Review & Place Order</h2>
      <p style={{ color:"var(--muted)", fontSize:14, marginBottom:28 }}>Double-check everything before confirming</p>

      <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:28 }}>
        {/* Contact */}
        <ReviewCard title="Contact & Delivery" onEdit={() => dispatch({ type:"SET_STEP", payload:"contact" })}>
          <ReviewRow label="Email" value={contact.email} />
          <ReviewRow label="Phone" value={contact.phone} />
          <ReviewRow label="Name" value={`${contact.firstName} ${contact.lastName}`} />
          <ReviewRow label="Address" value={`${contact.address}, ${contact.city}, ${contact.state} ${contact.zip}`} />
        </ReviewCard>

        {/* Shipping */}
        <ReviewCard title="Shipping Method" onEdit={() => dispatch({ type:"SET_STEP", payload:"shipping" })}>
          <ReviewRow label="Method" value={`${shipping.label} (${shipping.days})`} />
          <ReviewRow label="Cost" value={shipping.price === 0 ? "FREE" : `$${shipping.price.toFixed(2)}`} />
        </ReviewCard>

        {/* Payment */}
        <ReviewCard title="Payment" onEdit={() => dispatch({ type:"SET_STEP", payload:"payment" })}>
          <ReviewRow label="Method" value={payment.method === "card" ? `Card ending ****${payment.card.number.replace(/\s/g,"").slice(-4)||"????"}` : payment.method === "paypal" ? "PayPal" : "Cash on Delivery"} />
        </ReviewCard>
      </div>

      {/* Terms */}
      <div style={{ padding:"14px 18px", background:"var(--ink2)", borderRadius:"var(--r8)", border:"1px solid var(--line)", marginBottom:24, fontSize:12, color:"var(--dim)", lineHeight:1.7 }}>
        By placing this order you agree to our <span style={{ color:"var(--amber)", cursor:"pointer" }}>Terms of Service</span> and <span style={{ color:"var(--amber)", cursor:"pointer" }}>Privacy Policy</span>. Ironclad uses SSL encryption for all transactions.
      </div>

      <div style={{ display:"flex", gap:12, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap" }}>
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button onClick={handlePlaceOrder} loading={loading} style={{ minWidth:200 }}>
          {loading ? "Processing Payment…" : "🔒 Place Order Now"}
        </Button>
      </div>
    </div>
  );
}

function ReviewCard({ title, children, onEdit }) {
  return (
    <div style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r12)", overflow:"hidden" }}>
      <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--line)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--ink3)" }}>
        <span style={{ fontSize:12, fontWeight:600, color:"var(--soft)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace" }}>{title}</span>
        <button onClick={onEdit} style={{ background:"none", border:"none", color:"var(--amber)", fontSize:12, cursor:"pointer", fontFamily:"'Outfit',sans-serif", fontWeight:500 }}>Edit</button>
      </div>
      <div style={{ padding:"0 20px" }}>{children}</div>
    </div>
  );
}

/* ─── STEP 6: Confirmation ──────────────────────────────────────── */
function ConfirmationStep({ order }) {
  const [confettiDone, setConfettiDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setConfettiDone(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!order) return null;

  return (
    <div className="fade-up" style={{ textAlign:"center", padding:"20px 0" }}>
      {/* Animated check */}
      <div style={{ width:80, height:80, margin:"0 auto 24px", position:"relative" }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"var(--green2)", animation:"float 3s ease-in-out infinite" }} />
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ position:"relative" }}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--green)" strokeWidth="3" strokeDasharray="226" strokeDashoffset="0" />
          <polyline points="24,40 36,52 56,28" fill="none" stroke="var(--green)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray:60, strokeDashoffset:0, animation:"checkDraw 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) both" }} />
        </svg>
      </div>

      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:600, color:"var(--white)", marginBottom:8 }}>Order Confirmed!</h2>
      <p style={{ color:"var(--muted)", fontSize:15, marginBottom:6 }}>Your order has been placed and payment processed.</p>
      <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 18px", background:"var(--amber3)", borderRadius:24, border:"1px solid var(--amber4)", marginBottom:32 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:600, color:"var(--amber)", letterSpacing:"0.08em" }}>{order.id}</span>
        <button onClick={() => navigator.clipboard?.writeText(order.id)} style={{ background:"none", border:"none", color:"var(--amber)", cursor:"pointer", fontSize:14, opacity:.7 }} title="Copy order ID">⎘</button>
      </div>

      <div style={{ background:"var(--ink2)", border:"1px solid var(--line)", borderRadius:"var(--r16)", padding:"28px", maxWidth:480, margin:"0 auto 28px", textAlign:"left" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
          {[
            ["Delivery to", `${order.contact.firstName} ${order.contact.lastName}`],
            ["Estimated Delivery", order.estimatedDelivery],
            ["Payment", order.payment.method === "card" ? "Card (processed)" : order.payment.method === "paypal" ? "PayPal" : "Cash on Delivery"],
            ["Total Charged", `$${order.total.toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize:11, color:"var(--dim)", fontFamily:"'JetBrains Mono',monospace", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
              <div style={{ fontSize:14, fontWeight:500, color:"var(--text)" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ borderTop:"1px solid var(--line)", paddingTop:20 }}>
          <div style={{ fontSize:11, color:"var(--dim)", fontFamily:"'JetBrains Mono',monospace", marginBottom:16, textTransform:"uppercase", letterSpacing:"0.06em" }}>Order Timeline</div>
          {[
            { label:"Order Received", time:"Just now", done:true },
            { label:"Payment Confirmed", time:"Processing", done:order.payment.method !== "cod", active: order.payment.method === "cod" },
            { label:"Preparing for Shipment", time:"Est. 1–2 hrs", done:false },
            { label:"Dispatched", time:order.estimatedDelivery, done:false },
          ].map((step, i) => (
            <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom: i < 3 ? 16 : 0 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background: step.done ? "var(--green)" : step.active ? "var(--amber)" : "var(--ink4)", border:`2px solid ${step.done ? "var(--green)" : step.active ? "var(--amber)" : "var(--line2)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.3s" }}>
                  {step.done && <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                  {step.active && <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--amber)", animation:"pulse2 1.5s infinite" }} />}
                </div>
                {i < 3 && <div style={{ width:2, height:18, background: step.done ? "var(--green)" : "var(--line2)", marginTop:2 }} />}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight: step.done || step.active ? 500 : 400, color: step.done ? "var(--text)" : step.active ? "var(--amber)" : "var(--muted)" }}>{step.label}</div>
                <div style={{ fontSize:11, color:"var(--dim)", fontFamily:"'JetBrains Mono',monospace" }}>{step.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
        <Button variant="secondary" onClick={() => window.location.reload()}>Continue Shopping</Button>
        <Button>Track Your Order →</Button>
      </div>

      <p style={{ marginTop:24, fontSize:13, color:"var(--dim)" }}>
        A confirmation email has been sent to <span style={{ color:"var(--amber)" }}>{order.contact.email}</span>
      </p>
    </div>
  );
}

/* ─── Shared layout helpers ─────────────────────────────────────── */
function SectionLabel({ icon, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ fontSize:12, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.08em", fontFamily:"'JetBrains Mono',monospace" }}>{label}</span>
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel="Continue →" }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:32, paddingTop:24, borderTop:"1px solid var(--line)" }}>
      <Button variant="ghost" onClick={onBack}>← Back</Button>
      <Button onClick={onNext}>{nextLabel}</Button>
    </div>
  );
}

/* ─── Processing overlay ────────────────────────────────────────── */
function ProcessingOverlay({ show }) {
  if (!show) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(8,10,12,0.85)", zIndex:1000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, backdropFilter:"blur(8px)", animation:"fadeIn 0.3s ease" }}>
      <div style={{ position:"relative", width:64, height:64 }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid var(--line2)" }} />
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent", borderTopColor:"var(--amber)", animation:"spin 1s linear infinite" }} />
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:18, fontWeight:600, color:"var(--white)", marginBottom:6 }}>Processing Payment</div>
        <div style={{ fontSize:14, color:"var(--muted)" }}>Please wait, do not close this window…</div>
      </div>
      <div style={{ display:"flex", gap:6, marginTop:8 }}>
        {["🔒", "💳", "✓"].map((icon, i) => (
          <div key={i} style={{ width:32, height:32, background:"var(--ink3)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, animation:`pulse2 1s ${i*0.3}s infinite` }}>{icon}</div>
        ))}
      </div>
    </div>
  );
}

/* ─── Root Application ──────────────────────────────────────────── */
export default function CheckoutApp() {
  const [state, dispatch] = useReducer(checkoutReducer, initialState);

  const goTo = (step) => dispatch({ type:"SET_STEP", payload: step });

  const stepFlow = {
    cart:         () => goTo("contact"),
    contact:      () => goTo("shipping"),
    shipping:     () => goTo("payment"),
    payment:      () => goTo("review"),
    review:       () => goTo("confirmation"),
    confirmation: () => {},
  };

  const stepBack = {
    cart:         null,
    contact:      () => goTo("cart"),
    shipping:     () => goTo("contact"),
    payment:      () => goTo("shipping"),
    review:       () => goTo("payment"),
    confirmation: null,
  };

  const isTwoCol = ["cart","contact","shipping","payment","review"].includes(state.step);

  return (
    <>
      <Fonts />
      <ProcessingOverlay show={state.processing} />
      <div style={{ minHeight:"100vh", background:"var(--ink)", padding:"32px 16px 64px" }}>
        {/* Header */}
        <div style={{ maxWidth:960, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:40 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, background:"var(--amber)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:"#0a0a0c" }}>IC</div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:600, color:"var(--white)", letterSpacing:"0.02em" }}>Ironclad</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"var(--dim)" }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:"var(--green)", display:"inline-block" }} />
            Secure Checkout · SSL Encrypted
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ maxWidth: state.step === "confirmation" ? 560 : 960, margin:"0 auto" }}>
          <StepIndicator currentStep={state.step} />
        </div>

        {/* Main content */}
        <div style={{ maxWidth:960, margin:"0 auto", display: isTwoCol ? "grid" : "flex", gridTemplateColumns: isTwoCol ? "1fr 380px" : undefined, justifyContent: !isTwoCol ? "center" : undefined, gap:28 }}>

          {/* Left — main form */}
          <div style={{ minWidth:0 }}>
            {state.step === "cart" && <CartStep cart={state.cart} dispatch={dispatch} onNext={stepFlow.cart} />}
            {state.step === "contact" && <ContactStep contact={state.contact} dispatch={dispatch} onNext={stepFlow.contact} onBack={stepBack.contact} />}
            {state.step === "shipping" && <ShippingStep shippingMethod={state.shippingMethod} dispatch={dispatch} onNext={stepFlow.shipping} onBack={stepBack.shipping} />}
            {state.step === "payment" && <PaymentStep payment={state.payment} dispatch={dispatch} onNext={stepFlow.payment} onBack={stepBack.payment} />}
            {state.step === "review" && <ReviewStep state={state} dispatch={dispatch} onNext={stepFlow.review} onBack={stepBack.review} />}
            {state.step === "confirmation" && <ConfirmationStep order={state.order} />}
          </div>

          {/* Right — order summary (sticky) */}
          {isTwoCol && (
            <div style={{ position:"sticky", top:24, height:"fit-content" }}>
              <OrderSummary cart={state.cart} shippingMethod={state.shippingMethod} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
