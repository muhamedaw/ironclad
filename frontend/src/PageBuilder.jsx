import { useState, useReducer, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Google Fonts ───────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&display=swap');
  `}</style>
);

// ─── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg:       "#0C0C0E",
  surface:  "#111115",
  surface2: "#18181D",
  surface3: "#1F1F26",
  border:   "#2A2A33",
  border2:  "#3A3A47",
  accent:   "#F5A623",
  accentDim:"rgba(245,166,35,0.15)",
  accentBrd:"rgba(245,166,35,0.35)",
  blue:     "#4A9EFF",
  blueDim:  "rgba(74,158,255,0.12)",
  green:    "#3DDC84",
  red:      "#FF5F5F",
  text:     "#E8E8F0",
  muted:    "#6B6B80",
  soft:     "#9898B0",
  canvas:   "#F0EDE8",
  canvasBg: "#E8E4DE",
  radius:   "6px",
};

// ─── Unique ID generator ────────────────────────────────────────────────────
let _uid = 1000;
const uid = () => `blk_${++_uid}_${Math.random().toString(36).slice(2,6)}`;

// ─── Widget catalog ─────────────────────────────────────────────────────────
const WIDGET_CATALOG = [
  {
    group: "Content",
    items: [
      { type: "heading",  label: "Heading",    icon: "H",  desc: "Title or subtitle text" },
      { type: "text",     label: "Text Block",  icon: "¶",  desc: "Paragraph of rich text" },
      { type: "image",    label: "Image",       icon: "◻",  desc: "Image with caption" },
      { type: "video",    label: "Video",       icon: "▶",  desc: "YouTube or Vimeo embed" },
      { type: "divider",  label: "Divider",     icon: "—",  desc: "Horizontal rule" },
      { type: "spacer",   label: "Spacer",      icon: "↕",  desc: "Vertical whitespace" },
    ]
  },
  {
    group: "Commerce",
    items: [
      { type: "product-grid", label: "Product Grid", icon: "⊞", desc: "Grid of product cards" },
      { type: "product-hero", label: "Product Hero", icon: "★", desc: "Featured product banner" },
      { type: "cta",          label: "CTA Button",   icon: "⬡", desc: "Call to action block" },
    ]
  },
  {
    group: "Layout",
    items: [
      { type: "columns-2", label: "2 Columns",  icon: "⦿", desc: "Two-column layout" },
      { type: "columns-3", label: "3 Columns",  icon: "⦾", desc: "Three-column layout" },
      { type: "hero",      label: "Hero",        icon: "⬛", desc: "Full-width hero section" },
    ]
  }
];

// ─── Default props per block type ───────────────────────────────────────────
const DEFAULT_PROPS = {
  heading:      { text: "Section Heading", level: "h2", align: "left", color: "#1A1A2E", size: 32 },
  text:         { content: "Add your paragraph text here. Click to edit and customise the content.", align: "left", color: "#3A3A55", size: 15, lineHeight: 1.7 },
  image:        { src: "https://placehold.co/800x400/1A1A2E/F5A623?text=Image", alt: "Image", caption: "", fit: "cover" },
  video:        { url: "https://www.youtube.com/embed/dQw4w9WgXcQ", title: "Video Title", aspectRatio: "16/9" },
  divider:      { style: "solid", color: "#D4D0C8", thickness: 1, margin: 16 },
  spacer:       { height: 48 },
  "product-grid":{ cols: 3, gap: 16, showPrice: true, showRating: true, products: [
    { id:1, name:"Brake Pad Set", price:89.99, rating:4.8, img:"https://placehold.co/280x200/1A1A2E/F5A623?text=Part" },
    { id:2, name:"Oil Filter",    price:24.99, rating:4.6, img:"https://placehold.co/280x200/1A1A2E/F5A623?text=Filter" },
    { id:3, name:"Spark Plugs",   price:44.99, rating:4.9, img:"https://placehold.co/280x200/1A1A2E/F5A623?text=Plugs" },
  ]},
  "product-hero": { name:"OEM Brake Pad Set — Front", price:89.99, originalPrice:119.99, badge:"Best Seller", img:"https://placehold.co/500x340/1A1A2E/F5A623?text=Product" },
  cta:          { text: "Shop Now", subtext: "Free shipping on orders over $99", bg: "#F5A623", color: "#1A1A2E", align: "center" },
  "columns-2":  { gap: 24 },
  "columns-3":  { gap: 16 },
  hero:         { title: "Find the Right Part", subtitle: "OEM-grade parts for every make and model.", bg: "#1A1A2E", color: "#F5A623" },
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
const initialState = {
  blocks: [],
  selected: null,
  history: [],
  future: [],
};

function reducer(state, action) {
  const pushHistory = (s) => ({ ...s, history: [...s.history.slice(-20), s.blocks], future: [] });

  switch (action.type) {
    case "ADD_BLOCK": {
      const newBlock = {
        id: uid(),
        type: action.blockType,
        props: { ...DEFAULT_PROPS[action.blockType] },
        style: { width: "100%", marginTop: 0, marginBottom: 0, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: "", borderRadius: 0 },
      };
      const next = [...state.blocks, newBlock];
      return pushHistory({ ...state, blocks: next, selected: newBlock.id });
    }
    case "INSERT_BLOCK_AT": {
      const newBlock = {
        id: uid(),
        type: action.blockType,
        props: { ...DEFAULT_PROPS[action.blockType] },
        style: { width: "100%", marginTop: 0, marginBottom: 0, paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: "", borderRadius: 0 },
      };
      const blocks = [...state.blocks];
      blocks.splice(action.index, 0, newBlock);
      return pushHistory({ ...state, blocks, selected: newBlock.id });
    }
    case "REMOVE_BLOCK":
      return pushHistory({ ...state, blocks: state.blocks.filter(b => b.id !== action.id), selected: state.selected === action.id ? null : state.selected });
    case "SELECT":
      return { ...state, selected: action.id };
    case "DESELECT":
      return { ...state, selected: null };
    case "UPDATE_PROPS": {
      const blocks = state.blocks.map(b => b.id === action.id ? { ...b, props: { ...b.props, ...action.props } } : b);
      return { ...state, blocks };
    }
    case "UPDATE_STYLE": {
      const blocks = state.blocks.map(b => b.id === action.id ? { ...b, style: { ...b.style, ...action.style } } : b);
      return { ...state, blocks };
    }
    case "REORDER": {
      const blocks = [...state.blocks];
      const [moved] = blocks.splice(action.from, 1);
      blocks.splice(action.to, 0, moved);
      return pushHistory({ ...state, blocks });
    }
    case "DUPLICATE": {
      const idx = state.blocks.findIndex(b => b.id === action.id);
      if (idx === -1) return state;
      const orig = state.blocks[idx];
      const copy = { ...orig, id: uid(), props: { ...orig.props } };
      const blocks = [...state.blocks];
      blocks.splice(idx + 1, 0, copy);
      return pushHistory({ ...state, blocks, selected: copy.id });
    }
    case "UNDO": {
      if (!state.history.length) return state;
      const prev = state.history[state.history.length - 1];
      return { ...state, blocks: prev, history: state.history.slice(0, -1), future: [state.blocks, ...state.future] };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const next = state.future[0];
      return { ...state, blocks: next, history: [...state.history, state.blocks], future: state.future.slice(1) };
    }
    case "LOAD_LAYOUT":
      return { ...initialState, blocks: action.blocks };
    case "CLEAR":
      return pushHistory({ ...state, blocks: [], selected: null });
    default:
      return state;
  }
}

// ─── Block renderers ─────────────────────────────────────────────────────────
function HeadingBlock({ props }) {
  const Tag = props.level || "h2";
  return (
    <Tag style={{ margin: 0, color: props.color, fontSize: props.size, textAlign: props.align, fontFamily: "'Syne', sans-serif", fontWeight: 700, lineHeight: 1.2 }}>
      {props.text}
    </Tag>
  );
}

function TextBlock({ props }) {
  return (
    <p style={{ margin: 0, color: props.color, fontSize: props.size, textAlign: props.align, lineHeight: props.lineHeight, fontFamily: "'Fraunces', serif", fontWeight: 300 }}>
      {props.content}
    </p>
  );
}

function ImageBlock({ props }) {
  return (
    <figure style={{ margin: 0 }}>
      <img src={props.src} alt={props.alt} style={{ width: "100%", display: "block", objectFit: props.fit, borderRadius: 4 }} />
      {props.caption && <figcaption style={{ marginTop: 8, fontSize: 12, color: "#777", textAlign: "center", fontFamily: "'DM Mono', monospace" }}>{props.caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ props }) {
  return (
    <div style={{ position: "relative", paddingTop: `${100 / (props.aspectRatio === "16/9" ? 16/9 : 4/3)}%`, background: "#000", borderRadius: 4, overflow: "hidden" }}>
      <iframe src={props.url} title={props.title} allow="accelerometer; autoplay; encrypted-media; gyroscope"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
    </div>
  );
}

function DividerBlock({ props }) {
  return <hr style={{ border: "none", borderTop: `${props.thickness}px ${props.style} ${props.color}`, margin: `${props.margin}px 0` }} />;
}

function SpacerBlock({ props }) {
  return <div style={{ height: props.height }} />;
}

function ProductGridBlock({ props }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${props.cols}, 1fr)`, gap: props.gap }}>
      {props.products.map(p => (
        <div key={p.id} style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.08)" }}>
          <img src={p.img} alt={p.name} style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover" }} />
          <div style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", marginBottom: 6, fontFamily: "'Syne', sans-serif" }}>{p.name}</div>
            {props.showPrice && <div style={{ fontSize: 15, fontWeight: 700, color: "#F5A623", fontFamily: "'DM Mono', monospace" }}>${p.price}</div>}
            {props.showRating && <div style={{ fontSize: 11, color: "#F5A623", marginTop: 4 }}>{"★".repeat(Math.floor(p.rating))}{" "}<span style={{ color: "#999" }}>{p.rating}</span></div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductHeroBlock({ props }) {
  const disc = props.originalPrice ? Math.round((1 - props.price / props.originalPrice) * 100) : null;
  return (
    <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
      <img src={props.img} alt={props.name} style={{ flex: "0 0 260px", maxWidth: "100%", borderRadius: 8, objectFit: "cover" }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        {props.badge && <span style={{ display: "inline-block", background: "#F5A623", color: "#1A1A2E", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 3, marginBottom: 10, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{props.badge}</span>}
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1A1A2E", fontFamily: "'Syne', sans-serif" }}>{props.name}</h2>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#1A1A2E", fontFamily: "'DM Mono', monospace" }}>${props.price}</span>
          {props.originalPrice && <span style={{ fontSize: 14, color: "#999", textDecoration: "line-through" }}>${props.originalPrice}</span>}
          {disc && <span style={{ fontSize: 12, color: "#F5A623", fontWeight: 600 }}>Save {disc}%</span>}
        </div>
        <button style={{ marginTop: 18, padding: "10px 24px", background: "#1A1A2E", color: "#F5A623", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif", letterSpacing: "0.05em" }}>Add to Cart</button>
      </div>
    </div>
  );
}

function CTABlock({ props }) {
  return (
    <div style={{ textAlign: props.align, padding: "8px 0" }}>
      {props.subtext && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#666", fontFamily: "'DM Mono', monospace" }}>{props.subtext}</p>}
      <button style={{ padding: "14px 36px", background: props.bg, color: props.color, border: "none", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}>{props.text}</button>
    </div>
  );
}

function HeroBlock({ props }) {
  return (
    <div style={{ background: props.bg, padding: "60px 40px", borderRadius: 8, textAlign: "center" }}>
      <h1 style={{ margin: "0 0 12px", fontSize: 36, fontWeight: 800, color: props.color, fontFamily: "'Syne', sans-serif" }}>{props.title}</h1>
      {props.subtitle && <p style={{ margin: 0, fontSize: 16, color: "rgba(255,255,255,0.6)", fontFamily: "'Fraunces', serif", fontWeight: 300 }}>{props.subtitle}</p>}
    </div>
  );
}

function Columns2Block({ props }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: props.gap }}>
      <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: 16, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace" }}>Column 1</span>
      </div>
      <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: 16, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace" }}>Column 2</span>
      </div>
    </div>
  );
}

function Columns3Block({ props }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: props.gap }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: 16, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace" }}>Column {i}</span>
        </div>
      ))}
    </div>
  );
}

const BLOCK_RENDERERS = {
  heading: HeadingBlock, text: TextBlock, image: ImageBlock, video: VideoBlock,
  divider: DividerBlock, spacer: SpacerBlock, "product-grid": ProductGridBlock,
  "product-hero": ProductHeroBlock, cta: CTABlock, hero: HeroBlock,
  "columns-2": Columns2Block, "columns-3": Columns3Block,
};

// ─── Properties Panel ────────────────────────────────────────────────────────
function PropInput({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 500, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, fontFamily: "'DM Mono', monospace" }}>{label}</label>
      {children}
    </div>
  );
}

const inputSt = {
  width: "100%", background: T.surface3, border: `1px solid ${T.border}`, borderRadius: T.radius,
  color: T.text, fontSize: 12, padding: "7px 10px", fontFamily: "'DM Mono', monospace",
  outline: "none", boxSizing: "border-box",
};

const selectSt = { ...inputSt, cursor: "pointer", appearance: "none" };

function PropertiesPanel({ block, dispatch }) {
  const { id, type, props, style } = block;

  const updateProp = (key, val) => dispatch({ type: "UPDATE_PROPS", id, props: { [key]: val } });
  const updateStyle = (key, val) => dispatch({ type: "UPDATE_STYLE", id, style: { [key]: val } });

  return (
    <div style={{ padding: "0 0 80px" }}>
      {/* Block type badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, padding: "10px 16px", background: T.surface3, borderBottom: `1px solid ${T.border}` }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace" }}>{type}</span>
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Content props by type */}
        {type === "heading" && <>
          <PropInput label="Text"><input value={props.text} onChange={e => updateProp("text", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Level">
            <select value={props.level} onChange={e => updateProp("level", e.target.value)} style={selectSt}>
              <option value="h1">H1 — Page Title</option>
              <option value="h2">H2 — Section</option>
              <option value="h3">H3 — Subsection</option>
              <option value="h4">H4</option>
            </select>
          </PropInput>
          <PropInput label="Font Size">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={14} max={72} value={props.size} onChange={e => updateProp("size", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{props.size}</span>
            </div>
          </PropInput>
          <PropInput label="Alignment">
            <div style={{ display: "flex", gap: 4 }}>
              {["left","center","right"].map(a => (
                <button key={a} onClick={() => updateProp("align", a)} style={{ flex: 1, padding: "6px 4px", background: props.align === a ? T.accent : T.surface3, color: props.align === a ? T.bg : T.soft, border: `1px solid ${props.align === a ? T.accent : T.border}`, borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{a.charAt(0).toUpperCase() + a.slice(1)}</button>
              ))}
            </div>
          </PropInput>
          <PropInput label="Color"><input type="color" value={props.color} onChange={e => updateProp("color", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
        </>}

        {type === "text" && <>
          <PropInput label="Content"><textarea value={props.content} onChange={e => updateProp("content", e.target.value)} rows={5} style={{ ...inputSt, resize: "vertical" }} /></PropInput>
          <PropInput label="Font Size">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={11} max={24} value={props.size} onChange={e => updateProp("size", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{props.size}</span>
            </div>
          </PropInput>
          <PropInput label="Line Height">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={1.2} max={2.4} step={0.1} value={props.lineHeight} onChange={e => updateProp("lineHeight", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{props.lineHeight}</span>
            </div>
          </PropInput>
          <PropInput label="Alignment">
            <div style={{ display: "flex", gap: 4 }}>
              {["left","center","right","justify"].map(a => (
                <button key={a} onClick={() => updateProp("align", a)} style={{ flex: 1, padding: "5px 2px", background: props.align === a ? T.accent : T.surface3, color: props.align === a ? T.bg : T.soft, border: `1px solid ${props.align === a ? T.accent : T.border}`, borderRadius: 4, fontSize: 9, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{a.slice(0,4)}</button>
              ))}
            </div>
          </PropInput>
          <PropInput label="Color"><input type="color" value={props.color} onChange={e => updateProp("color", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
        </>}

        {type === "image" && <>
          <PropInput label="Image URL"><input value={props.src} onChange={e => updateProp("src", e.target.value)} style={inputSt} placeholder="https://..." /></PropInput>
          <PropInput label="Alt Text"><input value={props.alt} onChange={e => updateProp("alt", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Caption"><input value={props.caption} onChange={e => updateProp("caption", e.target.value)} style={inputSt} placeholder="Optional caption" /></PropInput>
          <PropInput label="Fit">
            <select value={props.fit} onChange={e => updateProp("fit", e.target.value)} style={selectSt}>
              <option value="cover">Cover</option>
              <option value="contain">Contain</option>
              <option value="fill">Fill</option>
            </select>
          </PropInput>
        </>}

        {type === "video" && <>
          <PropInput label="Embed URL"><input value={props.url} onChange={e => updateProp("url", e.target.value)} style={inputSt} placeholder="https://youtube.com/embed/..." /></PropInput>
          <PropInput label="Title"><input value={props.title} onChange={e => updateProp("title", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Aspect Ratio">
            <select value={props.aspectRatio} onChange={e => updateProp("aspectRatio", e.target.value)} style={selectSt}>
              <option value="16/9">16:9 Widescreen</option>
              <option value="4/3">4:3 Standard</option>
              <option value="1/1">1:1 Square</option>
            </select>
          </PropInput>
        </>}

        {type === "spacer" && <>
          <PropInput label="Height (px)">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={8} max={200} value={props.height} onChange={e => updateProp("height", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 32 }}>{props.height}px</span>
            </div>
          </PropInput>
        </>}

        {type === "divider" && <>
          <PropInput label="Style">
            <select value={props.style} onChange={e => updateProp("style", e.target.value)} style={selectSt}>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </PropInput>
          <PropInput label="Color"><input type="color" value={props.color} onChange={e => updateProp("color", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
          <PropInput label="Thickness">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={1} max={8} value={props.thickness} onChange={e => updateProp("thickness", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 24 }}>{props.thickness}px</span>
            </div>
          </PropInput>
        </>}

        {type === "cta" && <>
          <PropInput label="Button Text"><input value={props.text} onChange={e => updateProp("text", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Sub-text"><input value={props.subtext} onChange={e => updateProp("subtext", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Background"><input type="color" value={props.bg} onChange={e => updateProp("bg", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
          <PropInput label="Text Color"><input type="color" value={props.color} onChange={e => updateProp("color", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
          <PropInput label="Alignment">
            <div style={{ display: "flex", gap: 4 }}>
              {["left","center","right"].map(a => (
                <button key={a} onClick={() => updateProp("align", a)} style={{ flex: 1, padding: "6px 4px", background: props.align === a ? T.accent : T.surface3, color: props.align === a ? T.bg : T.soft, border: `1px solid ${props.align === a ? T.accent : T.border}`, borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{a.charAt(0).toUpperCase() + a.slice(1)}</button>
              ))}
            </div>
          </PropInput>
        </>}

        {type === "hero" && <>
          <PropInput label="Title"><input value={props.title} onChange={e => updateProp("title", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Subtitle"><input value={props.subtitle} onChange={e => updateProp("subtitle", e.target.value)} style={inputSt} /></PropInput>
          <PropInput label="Background"><input type="color" value={props.bg} onChange={e => updateProp("bg", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
          <PropInput label="Accent Color"><input type="color" value={props.color} onChange={e => updateProp("color", e.target.value)} style={{ ...inputSt, padding: 4, height: 34, cursor: "pointer" }} /></PropInput>
        </>}

        {type === "product-grid" && <>
          <PropInput label="Columns">
            <div style={{ display: "flex", gap: 4 }}>
              {[2,3,4].map(n => (
                <button key={n} onClick={() => updateProp("cols", n)} style={{ flex: 1, padding: "6px", background: props.cols === n ? T.accent : T.surface3, color: props.cols === n ? T.bg : T.soft, border: `1px solid ${props.cols === n ? T.accent : T.border}`, borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>{n}</button>
              ))}
            </div>
          </PropInput>
          <PropInput label="Gap">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={8} max={40} value={props.gap} onChange={e => updateProp("gap", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{props.gap}px</span>
            </div>
          </PropInput>
          <PropInput label="Show Price">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={props.showPrice} onChange={e => updateProp("showPrice", e.target.checked)} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace" }}>Display price</span>
            </label>
          </PropInput>
          <PropInput label="Show Rating">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={props.showRating} onChange={e => updateProp("showRating", e.target.checked)} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace" }}>Display rating</span>
            </label>
          </PropInput>
        </>}

        {/* ─── Block Spacing ─────────────────────────────────────── */}
        <div style={{ margin: "20px 0 12px", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>Spacing</div>
          {[
            ["Padding Top", "paddingTop"], ["Padding Bottom", "paddingBottom"],
            ["Padding Left", "paddingLeft"], ["Padding Right", "paddingRight"],
          ].map(([label, key]) => (
            <PropInput key={key} label={label}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="range" min={0} max={80} value={style[key] || 0} onChange={e => updateStyle(key, Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{style[key] || 0}</span>
              </div>
            </PropInput>
          ))}
        </div>

        {/* ─── Background & Border ───────────────────────────────── */}
        <div style={{ margin: "20px 0 12px", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>Appearance</div>
          <PropInput label="Background Color">
            <div style={{ display: "flex", gap: 6 }}>
              <input type="color" value={style.backgroundColor || "#ffffff"} onChange={e => updateStyle("backgroundColor", e.target.value)} style={{ ...inputSt, flex: "0 0 40px", padding: 4, height: 34, cursor: "pointer" }} />
              <button onClick={() => updateStyle("backgroundColor", "")} style={{ flex: 1, background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 4, color: T.soft, fontSize: 10, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Clear</button>
            </div>
          </PropInput>
          <PropInput label="Border Radius">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="range" min={0} max={32} value={style.borderRadius || 0} onChange={e => updateStyle("borderRadius", Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace", minWidth: 28 }}>{style.borderRadius || 0}px</span>
            </div>
          </PropInput>
        </div>
      </div>
    </div>
  );
}

// ─── Canvas Block Wrapper ────────────────────────────────────────────────────
function CanvasBlock({ block, isSelected, index, totalBlocks, dispatch, onDragStart, onDragOver, onDrop, isDragOver }) {
  const Renderer = BLOCK_RENDERERS[block.type];
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  const blockStyle = {
    position: "relative",
    width: "100%",
    background: block.style.backgroundColor || "transparent",
    borderRadius: block.style.borderRadius || 0,
    paddingTop: block.style.paddingTop,
    paddingBottom: block.style.paddingBottom,
    paddingLeft: block.style.paddingLeft,
    paddingRight: block.style.paddingRight,
    marginTop: block.style.marginTop,
    marginBottom: block.style.marginBottom,
    outline: isSelected
      ? `2px solid ${T.accent}`
      : hovered
      ? `1px dashed ${T.border2}`
      : "none",
    outlineOffset: isSelected ? -2 : 0,
    transition: "outline 0.12s",
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <div
      ref={ref}
      draggable
      onDragStart={e => onDragStart(e, index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={e => onDrop(e, index)}
      onClick={e => { e.stopPropagation(); dispatch({ type: "SELECT", id: block.id }); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={blockStyle}
    >
      {/* Drop indicator */}
      {isDragOver && (
        <div style={{ position: "absolute", top: -2, left: 0, right: 0, height: 3, background: T.accent, borderRadius: 2, zIndex: 100 }} />
      )}

      {/* Render the block content */}
      {Renderer ? <Renderer props={block.props} /> : (
        <div style={{ padding: 16, background: T.accentDim, border: `1px dashed ${T.accentBrd}`, borderRadius: 4, fontSize: 12, color: T.muted, fontFamily: "'DM Mono', monospace" }}>
          Unknown block type: {block.type}
        </div>
      )}

      {/* Floating toolbar — shown when selected */}
      {isSelected && (
        <div
          style={{
            position: "absolute", top: -36, right: 0, display: "flex", gap: 2,
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6,
            padding: "3px 4px", zIndex: 200, boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <ToolBtn onClick={() => dispatch({ type: "REORDER", from: index, to: Math.max(0, index - 1) })} disabled={index === 0} title="Move up">↑</ToolBtn>
          <ToolBtn onClick={() => dispatch({ type: "REORDER", from: index, to: Math.min(totalBlocks - 1, index + 1) })} disabled={index === totalBlocks - 1} title="Move down">↓</ToolBtn>
          <ToolBtn onClick={() => dispatch({ type: "DUPLICATE", id: block.id })} title="Duplicate">⧉</ToolBtn>
          <div style={{ width: 1, background: T.border, margin: "2px 2px" }} />
          <ToolBtn onClick={() => { dispatch({ type: "REMOVE_BLOCK", id: block.id }); }} danger title="Delete">✕</ToolBtn>
        </div>
      )}

      {/* Drag handle */}
      {(isSelected || hovered) && (
        <div style={{
          position: "absolute", left: -28, top: "50%", transform: "translateY(-50%)",
          width: 20, height: 28, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 2, cursor: "grab", opacity: 0.5,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ display: "flex", gap: 2 }}>
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: T.muted }} />
              <div style={{ width: 3, height: 3, borderRadius: "50%", background: T.muted }} />
            </div>
          ))}
        </div>
      )}

      {/* Block type label */}
      {isSelected && (
        <div style={{
          position: "absolute", bottom: -22, left: 0,
          fontSize: 9, color: T.accent, fontFamily: "'DM Mono', monospace",
          fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
          background: T.bg, padding: "2px 6px", borderRadius: "0 0 4px 4px",
          border: `1px solid ${T.accentBrd}`, borderTop: "none",
        }}>
          {block.type}
        </div>
      )}
    </div>
  );
}

function ToolBtn({ children, onClick, disabled, danger, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 26, height: 26, background: "transparent", border: "none",
        borderRadius: 4, color: danger ? T.red : disabled ? T.border2 : T.soft,
        fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.1s, color 0.1s",
        fontFamily: "monospace",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = danger ? "rgba(255,95,95,0.15)" : T.surface3; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

// ─── Sidebar Widget Item ──────────────────────────────────────────────────────
function WidgetItem({ item, onAddBlock }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("blockType", item.type); e.dataTransfer.effectAllowed = "copy"; }}
      onClick={() => onAddBlock(item.type)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.desc}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
        borderRadius: 6, cursor: "grab", background: hovered ? T.surface3 : "transparent",
        border: `1px solid ${hovered ? T.border2 : "transparent"}`,
        transition: "all 0.12s", userSelect: "none",
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 6, background: hovered ? T.accentDim : T.surface3,
        border: `1px solid ${hovered ? T.accentBrd : T.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: hovered ? T.accent : T.muted, flexShrink: 0,
        transition: "all 0.12s", fontFamily: "monospace",
      }}>
        {item.icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: hovered ? T.text : T.soft, fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em" }}>{item.label}</div>
        <div style={{ fontSize: 9, color: T.muted, fontFamily: "'DM Mono', monospace", marginTop: 1 }}>{item.desc}</div>
      </div>
    </div>
  );
}

// ─── JSON Modal ───────────────────────────────────────────────────────────────
function JsonModal({ blocks, onClose, onLoad }) {
  const [json, setJson] = useState(JSON.stringify(blocks, null, 2));
  const [error, setError] = useState("");

  const handleLoad = () => {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error("Must be an array of blocks");
      onLoad(parsed);
      onClose();
    } catch(e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, width: "min(600px, 90vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>Layout JSON</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <textarea
          value={json}
          onChange={e => { setJson(e.target.value); setError(""); }}
          style={{ flex: 1, background: T.bg, border: "none", color: "#98E6B8", padding: "16px 20px", fontSize: 11, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, resize: "none", outline: "none", overflowY: "auto" }}
        />
        {error && <div style={{ padding: "8px 20px", fontSize: 11, color: T.red, fontFamily: "'DM Mono', monospace", background: "rgba(255,95,95,0.08)" }}>{error}</div>}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => { navigator.clipboard.writeText(json); }} style={{ padding: "8px 14px", background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 6, color: T.soft, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Copy</button>
          <button onClick={handleLoad} style={{ padding: "8px 16px", background: T.accent, border: "none", borderRadius: 6, color: T.bg, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Load Layout</button>
        </div>
      </div>
    </div>
  );
}

// ─── SAVED LAYOUTS (local presets) ───────────────────────────────────────────
const SAVED_LAYOUTS = [
  {
    name: "Car Parts Landing",
    blocks: [
      { id:"s1", type:"hero",    props:{ title:"Premium Auto Parts", subtitle:"OEM-grade parts. Guaranteed fitment.", bg:"#1A1A2E", color:"#F5A623" }, style:{ paddingTop:60, paddingBottom:60, paddingLeft:40, paddingRight:40, marginTop:0, marginBottom:0, borderRadius:0, backgroundColor:"" }},
      { id:"s2", type:"text",    props:{ content:"Browse thousands of parts for every make and model. Fast shipping, expert support.", align:"center", color:"#3A3A55", size:15, lineHeight:1.7 }, style:{ paddingTop:24, paddingBottom:8, paddingLeft:40, paddingRight:40, marginTop:0, marginBottom:0, borderRadius:0, backgroundColor:"" }},
      { id:"s3", type:"product-grid", props:{ cols:3, gap:16, showPrice:true, showRating:true, products:[
        { id:1, name:"Brake Pad Set", price:89.99, rating:4.8, img:"https://placehold.co/280x200/1A1A2E/F5A623?text=Brakes" },
        { id:2, name:"Oil Filter",    price:24.99, rating:4.6, img:"https://placehold.co/280x200/1A1A2E/F5A623?text=Filter" },
        { id:3, name:"Spark Plugs",   price:44.99, rating:4.9, img:"https://placehold.co/280x200/1A1A2E/F5A623?text=Plugs" },
      ]}, style:{ paddingTop:24, paddingBottom:24, paddingLeft:24, paddingRight:24, marginTop:0, marginBottom:0, borderRadius:0, backgroundColor:"" }},
      { id:"s4", type:"cta", props:{ text:"Shop All Parts", subtext:"Free shipping on orders over $99", bg:"#F5A623", color:"#1A1A2E", align:"center" }, style:{ paddingTop:32, paddingBottom:40, paddingLeft:24, paddingRight:24, marginTop:0, marginBottom:0, borderRadius:0, backgroundColor:"" }},
    ],
  },
];

// ─── Main App ────────────────────────────────────────────────────────────────
export default function PageBuilder() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showJson, setShowJson] = useState(false);
  const [showLayouts, setShowLayouts] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dragFromIndex, setDragFromIndex] = useState(null);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const canvasRef = useRef(null);

  const { blocks, selected, history, future } = state;
  const selectedBlock = blocks.find(b => b.id === selected);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); dispatch({ type: "UNDO" }); }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); dispatch({ type: "REDO" }); }
      if ((e.metaKey || e.ctrlKey) && e.key === "d" && selected) { e.preventDefault(); dispatch({ type: "DUPLICATE", id: selected }); }
      if ((e.key === "Delete" || e.key === "Backspace") && selected && !previewMode) { dispatch({ type: "REMOVE_BLOCK", id: selected }); }
      if (e.key === "Escape") { dispatch({ type: "DESELECT" }); setPreviewMode(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, previewMode]);

  // ── Save to localStorage ────────────────────────────────────────
  const handleSave = () => {
    localStorage.setItem("ironclad_layout", JSON.stringify(blocks));
    setSavedMsg("Saved!");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  useEffect(() => {
    const saved = localStorage.getItem("ironclad_layout");
    if (saved) {
      try { dispatch({ type: "LOAD_LAYOUT", blocks: JSON.parse(saved) }); } catch {}
    }
  }, []);

  // ── Drag handlers ───────────────────────────────────────────────
  const handleDragStart = (e, index) => {
    setDragFromIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (index) => setDragOverIndex(index);

  const handleDrop = (e, index) => {
    e.preventDefault();
    const newBlockType = e.dataTransfer.getData("blockType");
    if (newBlockType) {
      dispatch({ type: "INSERT_BLOCK_AT", blockType: newBlockType, index });
    } else if (dragFromIndex !== null && dragFromIndex !== index) {
      dispatch({ type: "REORDER", from: dragFromIndex, to: index });
    }
    setDragOverIndex(null);
    setDragFromIndex(null);
  };

  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const newBlockType = e.dataTransfer.getData("blockType");
    if (newBlockType && dragFromIndex === null) {
      dispatch({ type: "ADD_BLOCK", blockType: newBlockType });
    }
    setDragOverIndex(null);
    setDragFromIndex(null);
  };

  const filteredCatalog = useMemo(() =>
    WIDGET_CATALOG.map(g => ({
      ...g,
      items: g.items.filter(i =>
        !sidebarSearch || i.label.toLowerCase().includes(sidebarSearch.toLowerCase()) || i.desc.toLowerCase().includes(sidebarSearch.toLowerCase())
      )
    })).filter(g => g.items.length > 0),
    [sidebarSearch]
  );

  return (
    <>
      <FontLoader />
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, fontFamily: "'Syne', sans-serif", overflow: "hidden" }}>

        {/* ── Top Toolbar ────────────────────────────────────────── */}
        <div style={{ height: 52, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, flexShrink: 0, zIndex: 50 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div style={{ width: 28, height: 28, background: T.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: T.bg }}>IC</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: "0.05em", textTransform: "uppercase" }}>Builder</span>
          </div>

          <div style={{ width: 1, height: 24, background: T.border, margin: "0 4px" }} />

          {/* Undo/Redo */}
          <TopBtn onClick={() => dispatch({ type: "UNDO" })} disabled={!history.length} title="Undo (⌘Z)">↩</TopBtn>
          <TopBtn onClick={() => dispatch({ type: "REDO" })} disabled={!future.length} title="Redo (⌘Y)">↪</TopBtn>

          <div style={{ width: 1, height: 24, background: T.border, margin: "0 4px" }} />

          {/* Block count */}
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace", background: T.surface3, padding: "3px 8px", borderRadius: 4, border: `1px solid ${T.border}` }}>
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
          </span>

          <div style={{ flex: 1 }} />

          {savedMsg && <span style={{ fontSize: 11, color: T.green, fontFamily: "'DM Mono', monospace", animation: "fadeIn 0.2s" }}>{savedMsg}</span>}

          {/* Actions */}
          <TopBtn onClick={() => setShowLayouts(true)} title="Load preset">⊞ Presets</TopBtn>
          <TopBtn onClick={() => setShowJson(true)} title="View / load JSON">{ } JSON</TopBtn>
          <TopBtn onClick={handleSave} accent title="Save to browser">⊙ Save</TopBtn>
          <div style={{ width: 1, height: 24, background: T.border, margin: "0 4px" }} />
          <TopBtn onClick={() => { setPreviewMode(p => !p); dispatch({ type: "DESELECT" }); }} active={previewMode}>
            {previewMode ? "✕ Edit" : "▶ Preview"}
          </TopBtn>
        </div>

        {/* ── Three-panel layout ─────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── LEFT SIDEBAR ───────────────────────────────────────── */}
          {!previewMode && (
            <div style={{ width: 220, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 12px 8px" }}>
                <input
                  placeholder="Search widgets…"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  style={{ ...inputSt, width: "100%", padding: "7px 10px", fontSize: 11 }}
                />
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 16px" }}>
                {filteredCatalog.map(group => (
                  <div key={group.group} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: T.muted, textTransform: "uppercase", letterSpacing: "0.12em", padding: "10px 6px 5px", fontFamily: "'DM Mono', monospace" }}>{group.group}</div>
                    {group.items.map(item => (
                      <WidgetItem key={item.type} item={item} onAddBlock={type => dispatch({ type: "ADD_BLOCK", blockType: type })} />
                    ))}
                  </div>
                ))}
              </div>
              {/* Hint */}
              <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, fontSize: 9, color: T.muted, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                Drag to canvas or click to add ↑<br />
                Keyboard: ⌘Z undo · Del remove
              </div>
            </div>
          )}

          {/* ── MAIN CANVAS ───────────────────────────────────────── */}
          <div
            style={{ flex: 1, overflowY: "auto", background: previewMode ? T.canvasBg : "#2A2A35", padding: previewMode ? 0 : "40px 60px" }}
            onClick={() => dispatch({ type: "DESELECT" })}
            onDragOver={e => { e.preventDefault(); if (!blocks.length) setDragOverIndex(-1); }}
            onDrop={handleCanvasDrop}
            onDragLeave={() => setDragOverIndex(null)}
          >
            {/* Canvas page surface */}
            <div
              ref={canvasRef}
              style={{
                background: T.canvas,
                minHeight: previewMode ? "100vh" : "calc(100vh - 80px)",
                width: previewMode ? "100%" : "100%",
                maxWidth: previewMode ? "100%" : 900,
                margin: "0 auto",
                borderRadius: previewMode ? 0 : 8,
                boxShadow: previewMode ? "none" : "0 8px 40px rgba(0,0,0,0.3)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {blocks.length === 0 && !previewMode && (
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 16,
                  pointerEvents: "none",
                }}>
                  <div style={{ width: 60, height: 60, borderRadius: 12, background: T.accentDim, border: `2px dashed ${T.accentBrd}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: T.accent }}>+</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#888", fontFamily: "'Syne', sans-serif" }}>Drop widgets here</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 4, fontFamily: "'DM Mono', monospace" }}>or click a widget in the sidebar</div>
                  </div>
                </div>
              )}

              {blocks.map((block, index) => (
                <CanvasBlock
                  key={block.id}
                  block={block}
                  index={index}
                  totalBlocks={blocks.length}
                  isSelected={!previewMode && block.id === selected}
                  dispatch={dispatch}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  isDragOver={!previewMode && dragOverIndex === index && dragFromIndex !== index}
                />
              ))}

              {/* Footer drop zone */}
              {blocks.length > 0 && !previewMode && (
                <div
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverIndex(blocks.length); }}
                  onDrop={e => { e.preventDefault(); e.stopPropagation(); handleCanvasDrop(e); }}
                  style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center", opacity: dragOverIndex === blocks.length ? 1 : 0, transition: "opacity 0.15s" }}
                >
                  <div style={{ height: 3, width: "80%", background: T.accent, borderRadius: 2 }} />
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PROPERTIES PANEL ──────────────────────────── */}
          {!previewMode && (
            <div style={{ width: 236, background: T.surface, borderLeft: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto" }}>
              {selectedBlock ? (
                <>
                  <PropertiesPanel block={selectedBlock} dispatch={dispatch} />
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
                  <div style={{ fontSize: 28, opacity: 0.3 }}>⊙</div>
                  <div style={{ fontSize: 11, color: T.muted, textAlign: "center", fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                    Select a block to edit its properties
                  </div>
                  <div style={{ marginTop: 20, width: "100%", padding: "14px 16px", background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: "'DM Mono', monospace", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Page Stats</div>
                    {[
                      ["Blocks", blocks.length],
                      ["Undo steps", history.length],
                      ["Redo steps", future.length],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono', monospace" }}>{k}</span>
                        <span style={{ fontSize: 11, color: T.soft, fontFamily: "'DM Mono', monospace" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {blocks.length > 0 && (
                    <button
                      onClick={() => { if (window.confirm("Clear all blocks?")) dispatch({ type: "CLEAR" }); }}
                      style={{ marginTop: 8, padding: "7px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.red, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace", width: "100%" }}
                    >
                      Clear Canvas
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── JSON Modal ───────────────────────────────────────────── */}
      {showJson && (
        <JsonModal
          blocks={blocks}
          onClose={() => setShowJson(false)}
          onLoad={newBlocks => { dispatch({ type: "LOAD_LAYOUT", blocks: newBlocks }); }}
        />
      )}

      {/* ── Presets Modal ─────────────────────────────────────────── */}
      {showLayouts && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}
          onClick={() => setShowLayouts(false)}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, width: "min(500px, 90vw)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>Load Preset Layout</span>
              <button onClick={() => setShowLayouts(false)} style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {SAVED_LAYOUTS.map((layout, i) => (
                <div key={i} style={{ padding: "14px 16px", background: T.surface3, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                  onClick={() => { dispatch({ type: "LOAD_LAYOUT", blocks: layout.blocks }); setShowLayouts(false); }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: "'Syne', sans-serif" }}>{layout.name}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{layout.blocks.length} blocks</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A33; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #3A3A47; }
        input[type=range] { -webkit-appearance: none; height: 4px; background: #2A2A33; border-radius: 2px; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${T.accent}; border: 2px solid ${T.bg}; cursor: pointer; }
        input[type=checkbox] { accent-color: ${T.accent}; width: 14px; height: 14px; cursor: pointer; }
        select option { background: #1F1F26; color: #E8E8F0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </>
  );
}

function TopBtn({ children, onClick, disabled, title, accent, active }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "5px 10px", background: active ? T.accentDim : accent ? T.accent : hov ? T.surface3 : "transparent",
        border: `1px solid ${active || accent ? T.accentBrd : hov ? T.border2 : "transparent"}`,
        borderRadius: 6, color: accent ? T.bg : active ? T.accent : disabled ? T.muted : hov ? T.text : T.soft,
        fontSize: 11, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em",
        transition: "all 0.12s", opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
