// Macrovia — primitives + viz components

const { useState, useEffect, useRef, useMemo } = React;

// ─── Ink color helpers ────────────────────────────────────────
const INK = {
  ink: 'var(--ink)', ink2: 'var(--ink-2)', ink3: 'var(--ink-3)', ink4: 'var(--ink-4)',
  accent: 'var(--accent)', warm: 'var(--warm)', rose: 'var(--rose)', violet: 'var(--violet)',
  surface: 'var(--surface)', surface2: 'var(--surface-2)', hairline: 'var(--hairline)',
};

// ─── Hooks ────────────────────────────────────────────────────
function useCountUp(target, duration = 1100, deps = []) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const from = 0;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(from + (target - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, deps);
  return v;
}

function useDelayedMount(delay = 0) {
  const [m, setM] = useState(false);
  useEffect(() => { const t = setTimeout(() => setM(true), delay); return () => clearTimeout(t); }, []);
  return m;
}

// ─── Card / Glass ─────────────────────────────────────────────
function Card({ children, style, onClick, padding = 18, glass = false, className = '' }) {
  const base = {
    background: glass ? 'var(--glass)' : 'var(--surface)',
    border: '0.5px solid var(--glass-stroke)',
    borderRadius: 24,
    padding,
    boxShadow: 'var(--shadow-card)',
    ...(glass && { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }),
    ...style,
  };
  return <div className={className} style={base} onClick={onClick}>{children}</div>;
}

// ─── Ribbon arc — Macrovia's signature progress visual ────────
// Three concentric arcs with gradient strokes representing macros + calorie target
function RibbonArc({ size = 220, kcal = 1840, target = 2200, protein = 0.78, carbs = 0.62, fat = 0.45 }) {
  const stroke = 14;
  const gap = 4;
  const cx = size / 2, cy = size / 2;
  const r1 = size / 2 - stroke / 2 - 6;
  const r2 = r1 - stroke - gap;
  const r3 = r2 - stroke - gap;
  // Arc spans 270° starting from -225°
  const startA = -225, sweep = 270;
  const arcPath = (r, pct) => {
    const a0 = (startA * Math.PI) / 180;
    const a1 = ((startA + sweep * pct) * Math.PI) / 180;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = sweep * pct > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };
  const trackPath = (r) => arcPath(r, 1);

  const pct = Math.min(1, kcal / target);
  const animPct = useCountUp(pct, 1400, [pct]);
  const animP = useCountUp(protein, 1400, [protein]);
  const animC = useCountUp(carbs, 1400, [carbs]);
  const animF = useCountUp(fat, 1400, [fat]);
  const kcalAnim = useCountUp(kcal, 1200, [kcal]);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="grad-cal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)"/>
            <stop offset="100%" stopColor="var(--warm)"/>
          </linearGradient>
          <linearGradient id="grad-p" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-deep)"/>
            <stop offset="100%" stopColor="var(--accent)"/>
          </linearGradient>
          <linearGradient id="grad-c" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--warm)"/>
            <stop offset="100%" stopColor="oklch(0.82 0.13 50)"/>
          </linearGradient>
          <linearGradient id="grad-f" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--violet)"/>
            <stop offset="100%" stopColor="oklch(0.72 0.13 320)"/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>

        {/* Tracks */}
        {[r1, r2, r3].map((r, i) => (
          <path key={i} d={trackPath(r)} fill="none" stroke="var(--hairline)" strokeWidth={stroke} strokeLinecap="round" opacity="0.5"/>
        ))}

        {/* Calorie ring */}
        <path d={arcPath(r1, animPct)} fill="none" stroke="url(#grad-cal)" strokeWidth={stroke} strokeLinecap="round"/>
        <path d={arcPath(r2, animP)} fill="none" stroke="url(#grad-p)" strokeWidth={stroke} strokeLinecap="round"/>
        <path d={arcPath(r3, animC)} fill="none" stroke="url(#grad-c)" strokeWidth={stroke} strokeLinecap="round"/>

        {/* Tiny fat dot orbiting on inner ring */}
        {(() => {
          const aDeg = startA + sweep * animF;
          const aRad = (aDeg * Math.PI) / 180;
          const r = r3 - stroke / 2 - 8;
          return <circle cx={cx + r * Math.cos(aRad)} cy={cy + r * Math.sin(aRad)} r="3.5" fill="var(--violet)"/>;
        })()}
      </svg>

      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 11, color: INK.ink3, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          Energy
        </div>
        <div className="font-display tabular" style={{ fontSize: 48, fontWeight: 600, color: INK.ink, lineHeight: 1, marginTop: 4 }}>
          {Math.round(kcalAnim).toLocaleString()}
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: INK.ink3, marginTop: 6 }}>
          of {target.toLocaleString()} kcal
        </div>
      </div>
    </div>
  );
}

// ─── Macro spectrum bar ───────────────────────────────────────
function MacroSpectrum({ p = 142, c = 198, f = 64, targetP = 180, targetC = 240, targetF = 80 }) {
  const total = p * 4 + c * 4 + f * 9;
  const ap = (p * 4) / total, ac = (c * 4) / total, af = (f * 9) / total;
  const aP = useCountUp(ap, 1200, [p]);
  const aC = useCountUp(ac, 1200, [c]);
  const aF = useCountUp(af, 1200, [f]);

  const item = (label, val, target, color, alpha) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: color }}/>
        <div style={{ fontSize: 11, color: INK.ink3, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div className="font-display tabular" style={{ fontSize: 22, fontWeight: 600, color: INK.ink, marginTop: 4, lineHeight: 1 }}>
        {val}<span style={{ fontSize: 13, color: INK.ink3, fontWeight: 500 }}>g</span>
      </div>
      <div className="font-mono" style={{ fontSize: 10, color: INK.ink4, marginTop: 2 }}>
        of {target}g · {Math.round((val / target) * 100)}%
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--hairline)', marginBottom: 16 }}>
        <div style={{ width: `${aP * 100}%`, background: 'linear-gradient(90deg, var(--accent-deep), var(--accent))', transition: 'width 0.4s' }}/>
        <div style={{ width: `${aC * 100}%`, background: 'linear-gradient(90deg, var(--warm), oklch(0.82 0.13 50))', transition: 'width 0.4s' }}/>
        <div style={{ width: `${aF * 100}%`, background: 'linear-gradient(90deg, var(--violet), oklch(0.72 0.13 320))', transition: 'width 0.4s' }}/>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {item('Protein', p, targetP, 'var(--accent)')}
        {item('Carbs', c, targetC, 'var(--warm)')}
        {item('Fat', f, targetF, 'var(--violet)')}
      </div>
    </div>
  );
}

// ─── Sparkline (smooth area + line) ───────────────────────────
function Sparkline({ data, height = 60, width = '100%', stroke = 'var(--accent)', fill = true }) {
  const ref = useRef(null);
  const [w, setW] = useState(280);
  useEffect(() => {
    if (!ref.current) return;
    const r = new ResizeObserver(([e]) => setW(e.contentRect.width));
    r.observe(ref.current);
    return () => r.disconnect();
  }, []);
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    height - 4 - ((v - min) / range) * (height - 8),
  ]);
  // smooth catmull-rom ish
  const path = pts.map(([x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = pts[i - 1];
    const cx1 = px + (x - px) * 0.5, cy1 = py;
    const cx2 = px + (x - px) * 0.5, cy2 = y;
    return `C ${cx1} ${cy1} ${cx2} ${cy2} ${x} ${y}`;
  }).join(' ');
  const area = `${path} L ${w} ${height} L 0 ${height} Z`;
  const id = useMemo(() => 'sp-' + Math.random().toString(36).slice(2), []);
  return (
    <div ref={ref} style={{ width, height }}>
      <svg width={w} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={stroke} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {fill && <path d={area} fill={`url(#${id})`}/>}
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="600" strokeDashoffset="600"
              style={{ animation: 'draw-stroke 1.4s ease-out forwards' }}/>
      </svg>
    </div>
  );
}

// ─── Bar chart (vertical) ─────────────────────────────────────
function BarChart({ data, height = 120, accent = 'var(--accent)', highlightLast = true }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 2px' }}>
      {data.map((d, i) => {
        const h = (d.v / max) * (height - 18);
        const isLast = highlightLast && i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: '100%', height: h, borderRadius: 6,
              background: isLast ? `linear-gradient(180deg, ${accent}, var(--accent-deep))` : 'var(--hairline)',
              opacity: isLast ? 1 : 0.7,
              transformOrigin: 'bottom',
              animation: `slide-up 0.7s ${0.05 * i}s both`,
            }}/>
            <div className="font-mono" style={{ fontSize: 9, color: INK.ink4 }}>{d.l}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Pill / chip ──────────────────────────────────────────────
function Pill({ children, color, soft = true, style }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: soft ? `color-mix(in oklab, ${color || 'var(--accent)'} 12%, transparent)` : color,
      color: soft ? color : '#fff',
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
      ...style,
    }}>{children}</span>
  );
}

// ─── Stat (label + value) ─────────────────────────────────────
function Stat({ label, value, sub, accent, icon }) {
  return (
    <div style={{ flex: 1 }}>
      {icon && <div style={{ marginBottom: 8 }}>{icon}</div>}
      <div style={{ fontSize: 10, color: INK.ink3, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </div>
      <div className="font-display tabular" style={{ fontSize: 26, fontWeight: 600, color: accent || INK.ink, marginTop: 2, lineHeight: 1.05 }}>
        {value}
      </div>
      {sub && <div className="font-mono" style={{ fontSize: 10, color: INK.ink4, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ─── Ring (small circular progress) ───────────────────────────
function Ring({ size = 56, stroke = 6, value = 0.6, color = 'var(--accent)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = useCountUp(value, 1200, [value]);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - v * c}
                transform={`rotate(-90 ${size/2} ${size/2})`}/>
      </svg>
      {label && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: INK.ink2,
        }}>{label}</div>
      )}
    </div>
  );
}

// ─── Icon set (custom, line-based, 24px) ──────────────────────
const Icon = {
  spark: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  flame: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c1 4 4 5 4 9a4 4 0 1 1-8 0c0-2 1-3 1-5"/>
      <path d="M12 22a6 6 0 0 0 6-6c0-3-2-4-2-7-2 2-4 2-4 6"/>
    </svg>
  ),
  drop: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c4 5 7 8 7 12a7 7 0 1 1-14 0c0-4 3-7 7-12z"/>
    </svg>
  ),
  moon: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8 8 0 1 1 9.5 4a6 6 0 0 0 10.5 10.5z"/>
    </svg>
  ),
  step: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4c2 0 3 2 3 5s-1 5-3 5-3-2-3-5"/>
      <path d="M14 8c2 0 3 2 3 5s-1 5-3 5-3-2-3-5"/>
      <path d="M5 18c0 2 2 3 4 2M14 22c2 0 4-1 4-3"/>
    </svg>
  ),
  heart: (s = 20, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>
    </svg>
  ),
  home: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  meal: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v8a4 4 0 0 0 4 4M8 4v8M8 16v4"/>
      <path d="M16 4c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4zM16 12v8"/>
    </svg>
  ),
  scan: (s = 26, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  coach: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5h14v10H8l-3 3V5z"/>
      <circle cx="9" cy="10" r="0.8" fill={c}/><circle cx="12" cy="10" r="0.8" fill={c}/><circle cx="15" cy="10" r="0.8" fill={c}/>
    </svg>
  ),
  trend: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-6 4 3 5-7 4 5"/>
    </svg>
  ),
  plus: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  arrow: (s = 16, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  ),
  send: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  ),
  mic: (s = 22, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3"/>
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
    </svg>
  ),
  check: (s = 14, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7"/>
    </svg>
  ),
  bolt: (s = 18, c = 'currentColor') => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/>
    </svg>
  ),
};

// ─── Animated counter ─────────────────────────────────────────
function Counter({ value, format = (v) => Math.round(v), className = '', style }) {
  const v = useCountUp(value, 1100, [value]);
  return <span className={className} style={style}>{format(v)}</span>;
}

// ─── Placeholder image (subtle striped) ───────────────────────
function PhotoStub({ width = 64, height = 64, label, hue = 155, radius = 14 }) {
  return (
    <div style={{
      width, height, borderRadius: radius, position: 'relative', overflow: 'hidden',
      background: `oklch(0.9 0.05 ${hue})`,
      backgroundImage: `repeating-linear-gradient(135deg, oklch(0.95 0.04 ${hue}) 0 6px, oklch(0.88 0.06 ${hue}) 6px 12px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {label && <span className="font-mono" style={{ fontSize: 9, color: `oklch(0.42 0.08 ${hue})` }}>{label}</span>}
    </div>
  );
}

Object.assign(window, {
  Card, RibbonArc, MacroSpectrum, Sparkline, BarChart, Pill, Stat, Ring, Icon, Counter, PhotoStub,
  useCountUp, useDelayedMount, INK,
});
