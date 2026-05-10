// Macrovia — root app, navigation, screen routing

const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "mockState": "healthy",
  "accent": "#1F8A5B"
}/*EDITMODE-END*/;

const ACCENT_MAP = {
  '#1F8A5B': { '--accent': 'oklch(0.62 0.16 155)', '--accent-soft': 'oklch(0.94 0.05 155)', '--accent-deep': 'oklch(0.42 0.16 155)' },
  '#2A6FDB': { '--accent': 'oklch(0.55 0.18 250)', '--accent-soft': 'oklch(0.94 0.05 250)', '--accent-deep': 'oklch(0.38 0.18 250)' },
  '#D9A157': { '--accent': 'oklch(0.72 0.16 60)',  '--accent-soft': 'oklch(0.95 0.05 60)',  '--accent-deep': 'oklch(0.52 0.16 60)' },
  '#D9577C': { '--accent': 'oklch(0.62 0.18 18)',  '--accent-soft': 'oklch(0.94 0.05 18)',  '--accent-deep': 'oklch(0.42 0.18 18)' },
};

// ─── Tab Bar ──────────────────────────────────────────────────
function TabBar({ tab, setTab, onScanTap }) {
  const tabs = [
    { id: 'today', label: 'Today', icon: Icon.home },
    { id: 'meals', label: 'Meals', icon: Icon.meal },
    { id: 'scan', label: '', icon: null, fab: true },
    { id: 'coach', label: 'Coach', icon: Icon.coach },
    { id: 'progress', label: 'Progress', icon: Icon.trend },
  ];

  return (
    <div style={{
      position: 'absolute', bottom: 14, left: 14, right: 14, height: 64,
      borderRadius: 28, zIndex: 30,
      background: 'var(--glass)', backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: '0.5px solid var(--glass-stroke)',
      boxShadow: 'var(--shadow-pop)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-around',
      padding: '0 8px',
    }}>
      {tabs.map(t => {
        if (t.fab) {
          return (
            <button key="scan" onClick={onScanTap} style={{
              width: 56, height: 56, borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
              boxShadow: '0 8px 22px color-mix(in oklab, var(--accent) 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: 'translateY(-10px)', position: 'relative',
            }}>
              {/* glow ring */}
              <div style={{
                position: 'absolute', inset: -4, borderRadius: 999,
                background: 'radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent), transparent 70%)',
                filter: 'blur(8px)', zIndex: -1,
              }}/>
              <div style={{ color: '#fff' }}>{Icon.scan(26, '#fff')}</div>
            </button>
          );
        }
        const active = tab === t.id;
        return (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            color: active ? 'var(--accent-deep)' : 'var(--ink-3)',
            padding: '10px 14px', position: 'relative',
            transition: 'color 0.2s',
          }}>
            <div style={{ position: 'relative' }}>
              {t.icon(22, 'currentColor')}
              {active && (
                <div style={{
                  position: 'absolute', inset: -10, borderRadius: 999,
                  background: 'color-mix(in oklab, var(--accent) 14%, transparent)',
                  zIndex: -1, animation: 'fade-in 0.3s both',
                }}/>
              )}
            </div>
            <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.02em' }}>{t.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Top bar (greeting + avatar) ──────────────────────────────
function TopBar({ data, dark }) {
  return (
    <div style={{
      paddingTop: 56, padding: '56px 16px 4px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'relative', zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, var(--accent), var(--violet))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px color-mix(in oklab, var(--accent) 35%, transparent)',
        }}>
          {/* Macrovia mark */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M4 18 L4 8 Q4 4 8 4 L8 14 Q8 18 12 18 L12 8 Q12 4 16 4 L16 14 Q16 18 20 18"
                  stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="font-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.025em' }}>
          Macrovia
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={{
          width: 36, height: 36, borderRadius: 999, border: '0.5px solid var(--glass-stroke)',
          background: 'var(--glass)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: 'var(--ink-2)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 21a2 2 0 0 0 4 0"/>
          </svg>
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: 999,
          background: 'linear-gradient(135deg, oklch(0.78 0.1 30), oklch(0.62 0.13 20))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        }}>S</div>
      </div>
    </div>
  );
}

// ─── Aurora background (animated soft gradient) ───────────────
function Aurora() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '-10%', width: '70%', height: '60%',
        background: 'radial-gradient(circle, var(--aurora-1), transparent 70%)',
        filter: 'blur(40px)', animation: 'auroraDrift 18s ease-in-out infinite',
      }}/>
      <div style={{
        position: 'absolute', top: '10%', right: '-20%', width: '70%', height: '60%',
        background: 'radial-gradient(circle, var(--aurora-2), transparent 70%)',
        filter: 'blur(40px)', animation: 'auroraDrift 22s ease-in-out infinite reverse',
      }}/>
      <div style={{
        position: 'absolute', bottom: '-10%', left: '20%', width: '70%', height: '50%',
        background: 'radial-gradient(circle, var(--aurora-3), transparent 70%)',
        filter: 'blur(40px)', animation: 'auroraDrift 26s ease-in-out infinite',
      }}/>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useStateA('today');
  const [scanOpen, setScanOpen] = useStateA(false);

  // Apply theme + accent
  useEffectA(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    const accentVars = ACCENT_MAP[tweaks.accent] || ACCENT_MAP['#1F8A5B'];
    Object.entries(accentVars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [tweaks.theme, tweaks.accent]);

  const data = getMockData(tweaks.mockState);
  const dark = tweaks.theme === 'dark';

  const screens = {
    today: <TodayScreen data={data}/>,
    meals: <MealsScreen/>,
    coach: <CoachScreen/>,
    progress: <ProgressScreen data={data}/>,
  };

  return (
    <>
      {/* Outer canvas */}
      <div style={{
        minHeight: '100vh', width: '100vw',
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', position: 'relative', overflow: 'hidden',
        gap: 24,
      }}>
        {/* Outer aurora */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <Aurora/>
        </div>

        {/* Brand mark above device */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', marginTop: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 999,
            background: 'var(--glass)', backdropFilter: 'blur(20px)',
            border: '0.5px solid var(--glass-stroke)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: '0.06em' }}>
              MACROVIA · v2 PROTOTYPE
            </span>
          </div>
          <h1 className="font-display" style={{
            fontSize: 48, fontWeight: 600, letterSpacing: '-0.04em', margin: '14px 0 4px',
            color: 'var(--ink)', textAlign: 'center', lineHeight: 1,
          }}>
            Nutrition, but it sees you.
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: 0, maxWidth: 520, textAlign: 'center', lineHeight: 1.5 }}>
            An AI nutrition platform that watches your day, your macros, and your mood — and quietly steers you toward the body you're building.
          </p>
        </div>

        {/* Device */}
        <div className="device" style={{ position: 'relative', zIndex: 2 }}>
          <DeviceShell dark={dark} data={data} tab={tab} setTab={setTab}
                       scanOpen={scanOpen} setScanOpen={setScanOpen} screens={screens}/>
        </div>

        {/* Footer micro */}
        <div style={{ position: 'relative', zIndex: 2, fontSize: 11, color: 'var(--ink-4)', letterSpacing: '0.04em' }}>
          Tap any tab · pinch the camera FAB · talk to Coach (real AI)
        </div>
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Look">
          <TweakRadio label="Theme" value={tweaks.theme}
                      options={['light', 'dark']}
                      onChange={v => setTweak('theme', v)}/>
          <TweakColor label="Accent" value={tweaks.accent}
                      options={['#1F8A5B', '#2A6FDB', '#D9A157', '#D9577C']}
                      onChange={v => setTweak('accent', v)}/>
        </TweakSection>
        <TweakSection label="Mock data">
          <TweakRadio label="Today" value={tweaks.mockState}
                      options={['healthy', 'deficit', 'surplus']}
                      onChange={v => setTweak('mockState', v)}/>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

// ─── Device shell — wraps phone frame + tab navigation ────────
function DeviceShell({ dark, data, tab, setTab, scanOpen, setScanOpen, screens }) {
  return (
    <div style={{
      width: 402, height: 874, borderRadius: 48, overflow: 'hidden', position: 'relative',
      background: 'var(--bg)',
      boxShadow: '0 50px 120px rgba(20,30,25,0.18), 0 0 0 1px rgba(20,30,25,0.1), 0 0 0 10px oklch(0.18 0.012 160), 0 0 0 11px oklch(0.32 0.012 160)',
      fontFamily: 'Inter, system-ui',
    }}>
      {/* Inner aurora behind content */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.7 }}>
        <Aurora/>
      </div>

      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }}/>

      {/* Status bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <IOSStatusBar dark={dark}/>
      </div>

      {/* Top bar */}
      {tab !== 'coach' && <TopBar data={data} dark={dark}/>}
      {tab === 'coach' && <div style={{ paddingTop: 56 }}/>}

      {/* Screen */}
      <div className="no-scrollbar" style={{
        position: 'absolute', top: tab === 'coach' ? 56 : 100, bottom: 0, left: 0, right: 0,
        overflowY: 'auto', zIndex: 2,
      }} key={tab}>
        <div style={{ animation: 'fade-in 0.4s both' }}>
          {screens[tab]}
        </div>
      </div>

      {/* Tab bar */}
      <TabBar tab={tab} setTab={setTab} onScanTap={() => setScanOpen(true)}/>

      {/* Scan overlay */}
      {scanOpen && <ScanScreen onClose={() => setScanOpen(false)}/>}

      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
        height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        paddingBottom: 8, pointerEvents: 'none',
      }}>
        <div style={{
          width: 139, height: 5, borderRadius: 100,
          background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
        }}/>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
