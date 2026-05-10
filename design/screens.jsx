// Macrovia — Screens

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM } = React;

// ─── Mock data, varies with state ─────────────────────────────
function getMockData(mockState) {
  const base = {
    name: 'Sienna',
    greeting: 'Good morning',
    date: 'Friday, May 9',
    streak: 23,
    score: 86,
    goal: 'Lean & strong',
    targetWeight: 138,
    weight: 142.4,
    weightHistory: [148.2, 147.4, 146.6, 145.9, 145.1, 144.4, 143.6, 142.9, 142.4],
    week: [
      { l: 'M', v: 1980 }, { l: 'T', v: 2210 }, { l: 'W', v: 1860 },
      { l: 'T', v: 2080 }, { l: 'F', v: 2030 }, { l: 'S', v: 1920 },
      { l: 'S', v: 1840 },
    ],
  };
  const states = {
    healthy: {
      kcal: 1840, target: 2200, burned: 612, deficit: 360,
      protein: 142, carbs: 198, fat: 64,
      tProtein: 180, tCarbs: 240, tFat: 80,
      water: 1.8, waterTarget: 2.6, sleep: 7.4, hr: 62, steps: 8420,
      tone: 'on track',
      insight: 'Your protein timing is exceptional today — 78% landed before 4pm. This is the pattern that drove last week\'s recovery scores up by 12%.',
    },
    deficit: {
      kcal: 1240, target: 2200, burned: 740, deficit: 1700,
      protein: 86, carbs: 102, fat: 38,
      tProtein: 180, tCarbs: 240, tFat: 80,
      water: 1.2, waterTarget: 2.6, sleep: 6.1, hr: 68, steps: 5210,
      tone: 'needs attention',
      insight: 'You\'re running a steep deficit and protein is low. A 30g protein snack now will protect lean mass without breaking your goal.',
    },
    surplus: {
      kcal: 2580, target: 2200, burned: 480, deficit: -100,
      protein: 178, carbs: 312, fat: 98,
      tProtein: 180, tCarbs: 240, tFat: 80,
      water: 2.4, waterTarget: 2.6, sleep: 7.8, hr: 60, steps: 11240,
      tone: 'over target',
      insight: 'You\'ve crossed your target by 380 kcal. A 25-min walk after dinner brings you back to neutral and supports tonight\'s sleep.',
    },
  };
  return { ...base, ...states[mockState] };
}

// ═══════════════════════════════════════════════════════════════
// TODAY
// ═══════════════════════════════════════════════════════════════
function TodayScreen({ data, onOpenMeal }) {
  const meals = [
    { time: '7:42 AM', name: 'Greek yogurt + berries', kcal: 320, p: 28, c: 32, f: 8, hue: 70 },
    { time: '12:18 PM', name: 'Salmon poke bowl', kcal: 580, p: 42, c: 58, f: 18, hue: 30 },
    { time: '3:05 PM', name: 'Almonds & apple', kcal: 220, p: 6, c: 28, f: 12, hue: 110 },
    { time: '6:48 PM', name: 'Chicken & quinoa', kcal: 720, p: 66, c: 80, f: 26, hue: 50 },
  ];

  return (
    <div style={{ padding: '12px 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Greeting */}
      <div style={{ animation: 'fade-in 0.6s both' }}>
        <div style={{ fontSize: 12, color: INK.ink3, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {data.date}
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 600, color: INK.ink, marginTop: 2, letterSpacing: '-0.03em' }}>
          {data.greeting}, {data.name}
        </div>
        <div style={{ fontSize: 13, color: INK.ink2, marginTop: 4 }}>
          Day <span className="font-mono tabular" style={{ fontWeight: 600 }}>{data.streak}</span> of your protein-forward streak.
        </div>
      </div>

      {/* Hero ribbon card */}
      <Card glass padding={20} style={{ position: 'relative', overflow: 'hidden', animation: 'slide-up 0.7s 0.05s both' }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.85 0.13 70 / 0.35), transparent 70%)', filter: 'blur(20px)',
        }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, position: 'relative' }}>
          <div>
            <div style={{ fontSize: 11, color: INK.ink3, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Today's energy
            </div>
            <div style={{ fontSize: 13, color: INK.ink2, marginTop: 2 }}>
              {data.tone === 'on track' && 'Sitting in the sweet spot.'}
              {data.tone === 'needs attention' && 'Running low — fuel up soon.'}
              {data.tone === 'over target' && 'Past target — burn it forward.'}
            </div>
          </div>
          <Pill color={
            data.tone === 'on track' ? 'var(--accent)' :
            data.tone === 'needs attention' ? 'var(--warm)' : 'var(--rose)'
          }>
            {data.tone === 'on track' ? '● on track' : data.tone === 'needs attention' ? '● low fuel' : '● over target'}
          </Pill>
        </div>
        <RibbonArc
          size={232}
          kcal={data.kcal}
          target={data.target}
          protein={data.protein / data.tProtein}
          carbs={data.carbs / data.tCarbs}
          fat={data.fat / data.tFat}
        />
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 4, paddingTop: 14, borderTop: `0.5px solid ${INK.hairline}` }}>
          <Stat label="Burned" value={<><Counter value={data.burned}/><span style={{ fontSize: 13, fontWeight: 500, color: INK.ink3 }}> kcal</span></>} sub="active + bmr"/>
          <Stat label="Deficit" value={<><Counter value={Math.abs(data.deficit)}/><span style={{ fontSize: 13, fontWeight: 500, color: INK.ink3 }}> kcal</span></>}
                sub={data.deficit >= 0 ? 'under target' : 'over target'}
                accent={data.deficit >= 0 ? 'var(--accent)' : 'var(--rose)'}/>
          <Stat label="Score" value={<Counter value={data.score}/>} sub="wellness index"/>
        </div>
      </Card>

      {/* Macros card */}
      <Card padding={18} style={{ animation: 'slide-up 0.7s 0.1s both' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 600, color: INK.ink, letterSpacing: '-0.02em' }}>
              Macro spectrum
            </div>
            <div style={{ fontSize: 12, color: INK.ink3, marginTop: 1 }}>
              By calorie share, not grams.
            </div>
          </div>
          {Icon.spark(18, INK.ink3)}
        </div>
        <MacroSpectrum p={data.protein} c={data.carbs} f={data.fat} targetP={data.tProtein} targetC={data.tCarbs} targetF={data.tFat}/>
      </Card>

      {/* AI insight card */}
      <Card glass padding={18} style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 8%, var(--surface)), var(--surface))',
        animation: 'slide-up 0.7s 0.15s both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px color-mix(in oklab, var(--accent) 40%, transparent)',
          }}>
            <div style={{ color: '#fff' }}>{Icon.bolt(15, '#fff')}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: INK.ink, letterSpacing: '-0.01em' }}>Macrovia AI</div>
            <div style={{ fontSize: 10, color: INK.ink3 }}>Pattern detected · just now</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 10, color: INK.ink3, fontWeight: 600 }}>HIGH CONFIDENCE</div>
        </div>
        <div className="font-display" style={{ fontSize: 16, lineHeight: 1.45, color: INK.ink, fontWeight: 500, letterSpacing: '-0.015em' }}>
          {data.insight}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={btnGhost}>Tell me why</button>
          <button style={btnPrimary}>Apply suggestion {Icon.arrow(13, '#fff')}</button>
        </div>
      </Card>

      {/* Vitals row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, animation: 'slide-up 0.7s 0.2s both' }}>
        <Card padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ring size={48} stroke={5} value={data.water / data.waterTarget} color="var(--violet)" label={`${Math.round((data.water/data.waterTarget)*100)}%`}/>
            <div>
              <div style={{ fontSize: 10, color: INK.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Hydration</div>
              <div className="font-display tabular" style={{ fontSize: 20, fontWeight: 600, color: INK.ink, lineHeight: 1.05 }}>
                {data.water.toFixed(1)}<span style={{ fontSize: 12, color: INK.ink3, fontWeight: 500 }}>L</span>
              </div>
              <div className="font-mono" style={{ fontSize: 9, color: INK.ink4 }}>of {data.waterTarget}L</div>
            </div>
          </div>
        </Card>
        <Card padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ring size={48} stroke={5} value={data.sleep / 9} color="oklch(0.62 0.13 270)" label={`${data.sleep}h`}/>
            <div>
              <div style={{ fontSize: 10, color: INK.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Sleep</div>
              <div className="font-display tabular" style={{ fontSize: 20, fontWeight: 600, color: INK.ink, lineHeight: 1.05 }}>
                {data.sleep}<span style={{ fontSize: 12, color: INK.ink3, fontWeight: 500 }}>h</span>
              </div>
              <div className="font-mono" style={{ fontSize: 9, color: INK.ink4 }}>HR avg {data.hr} bpm</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity */}
      <Card padding={18} style={{ animation: 'slide-up 0.7s 0.25s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 600, color: INK.ink, letterSpacing: '-0.02em' }}>
              7-day calories
            </div>
            <div style={{ fontSize: 12, color: INK.ink3, marginTop: 1 }}>
              Avg <span className="font-mono tabular" style={{ color: INK.ink, fontWeight: 600 }}>1,989</span> · target 2,200
            </div>
          </div>
          <Pill color="var(--accent)">−211/day</Pill>
        </div>
        <BarChart data={data.week} height={100}/>
      </Card>

      {/* Meals */}
      <div style={{ marginTop: 4, animation: 'slide-up 0.7s 0.3s both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px', marginBottom: 10 }}>
          <div className="font-display" style={{ fontSize: 17, fontWeight: 600, color: INK.ink, letterSpacing: '-0.02em' }}>
            Today's meals
          </div>
          <button style={{
            background: 'transparent', border: 'none', fontSize: 13, color: INK.ink3, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4, padding: 0,
          }}>
            See all {Icon.arrow(12, INK.ink3)}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {meals.map((m, i) => (
            <Card key={i} padding={12} onClick={() => onOpenMeal && onOpenMeal(m)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PhotoStub width={48} height={48} hue={m.hue} radius={12}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK.ink, letterSpacing: '-0.01em' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: INK.ink3, marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>{m.time}</span><span>·</span>
                    <span className="font-mono">P {m.p}</span>
                    <span className="font-mono">C {m.c}</span>
                    <span className="font-mono">F {m.f}</span>
                  </div>
                </div>
                <div className="font-display tabular" style={{ fontSize: 18, fontWeight: 600, color: INK.ink }}>
                  {m.kcal}
                  <span style={{ fontSize: 10, fontWeight: 500, color: INK.ink3, marginLeft: 2 }}>kcal</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 999, border: 'none',
  background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
  color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  boxShadow: '0 4px 14px color-mix(in oklab, var(--accent) 30%, transparent)',
};

const btnGhost = {
  padding: '8px 14px', borderRadius: 999,
  background: 'color-mix(in oklab, var(--ink) 5%, transparent)',
  border: '0.5px solid var(--hairline)',
  color: 'var(--ink-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
};

// ═══════════════════════════════════════════════════════════════
// MEALS — AI meal planner
// ═══════════════════════════════════════════════════════════════
function MealsScreen() {
  const [goal, setGoal] = useS('lean');
  const [regenKey, setRegenKey] = useS(0);
  const [regenerating, setRegenerating] = useS(false);

  const goalConfig = {
    lose: { label: 'Lose weight', target: 1800, color: 'var(--rose)' },
    lean: { label: 'Lean & strong', target: 2200, color: 'var(--accent)' },
    gain: { label: 'Gain muscle', target: 2700, color: 'var(--warm)' },
  };

  const planVariants = [
    [
      { time: 'Breakfast', name: 'Spinach feta omelet & sourdough', kcal: 520, p: 32, c: 42, f: 22, mins: 12, hue: 70 },
      { time: 'Lunch', name: 'Miso-glazed salmon with brown rice', kcal: 640, p: 44, c: 62, f: 22, mins: 25, hue: 30 },
      { time: 'Snack', name: 'Cottage cheese, walnuts, pear', kcal: 280, p: 22, c: 24, f: 12, mins: 3, hue: 110 },
      { time: 'Dinner', name: 'Lemon-thyme chicken & farro', kcal: 760, p: 58, c: 78, f: 24, mins: 35, hue: 50 },
    ],
    [
      { time: 'Breakfast', name: 'Overnight oats with almond butter', kcal: 480, p: 28, c: 56, f: 18, mins: 5, hue: 50 },
      { time: 'Lunch', name: 'Grain bowl with seared tofu', kcal: 610, p: 36, c: 70, f: 20, mins: 20, hue: 110 },
      { time: 'Snack', name: 'Greek yogurt and pistachios', kcal: 260, p: 24, c: 18, f: 12, mins: 2, hue: 70 },
      { time: 'Dinner', name: 'Skirt steak, sweet potato, kale', kcal: 850, p: 62, c: 64, f: 32, mins: 30, hue: 30 },
    ],
  ];

  const plan = planVariants[regenKey % 2];
  const total = plan.reduce((a, b) => a + b.kcal, 0);
  const totalP = plan.reduce((a, b) => a + b.p, 0);
  const totalC = plan.reduce((a, b) => a + b.c, 0);
  const totalF = plan.reduce((a, b) => a + b.f, 0);

  const regenerate = () => {
    setRegenerating(true);
    setTimeout(() => { setRegenKey(k => k + 1); setRegenerating(false); }, 900);
  };

  return (
    <div style={{ padding: '12px 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 12, color: INK.ink3, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          AI MEAL PLAN · TODAY
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 600, color: INK.ink, marginTop: 2, letterSpacing: '-0.03em' }}>
          Built for your goal
        </div>
      </div>

      {/* Goal selector */}
      <Card padding={6}>
        <div style={{ display: 'flex', gap: 4 }}>
          {Object.entries(goalConfig).map(([k, v]) => (
            <button key={k} onClick={() => setGoal(k)} style={{
              flex: 1, padding: '10px 8px', borderRadius: 18, border: 'none',
              background: goal === k ? 'var(--surface-2)' : 'transparent',
              color: goal === k ? INK.ink : INK.ink3,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              boxShadow: goal === k ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
              border: goal === k ? '0.5px solid var(--hairline)' : '0.5px solid transparent',
              transition: 'all 0.2s',
            }}>{v.label}</button>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <Card glass padding={18} style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%',
          background: `radial-gradient(circle, ${goalConfig[goal].color}, transparent 70%)`,
          opacity: 0.18, filter: 'blur(30px)',
        }}/>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, color: INK.ink3, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Day total
            </div>
            <div className="font-display tabular" style={{ fontSize: 38, fontWeight: 600, color: INK.ink, lineHeight: 1, marginTop: 4 }}>
              {total.toLocaleString()}
              <span style={{ fontSize: 14, color: INK.ink3, fontWeight: 500, marginLeft: 4 }}>kcal</span>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: INK.ink3, marginTop: 2 }}>
              target {goalConfig[goal].target.toLocaleString()} · diff {total - goalConfig[goal].target > 0 ? '+' : ''}{total - goalConfig[goal].target}
            </div>
          </div>
          <button onClick={regenerate} disabled={regenerating} style={{
            ...btnGhost, opacity: regenerating ? 0.5 : 1,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={{ animation: regenerating ? 'spin 0.9s linear infinite' : 'none', transformOrigin: 'center' }}>
              <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>
            </svg>
            {regenerating ? 'Generating' : 'Regenerate'}
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <MacroSpectrum p={totalP} c={totalC} f={totalF} targetP={180} targetC={240} targetF={80}/>
        </div>
      </Card>

      {/* Plan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: regenerating ? 0.4 : 1, transition: 'opacity 0.3s' }}>
        {plan.map((m, i) => (
          <Card key={`${regenKey}-${i}`} padding={14} style={{ animation: `slide-up 0.5s ${i * 0.06}s both`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <PhotoStub width={64} height={64} hue={m.hue} radius={14} label={m.time.toUpperCase()}/>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 10, color: INK.ink3, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {m.time}
                  </div>
                  <div className="font-mono" style={{ fontSize: 10, color: INK.ink4 }}>{m.mins} min</div>
                </div>
                <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: INK.ink, marginTop: 2, letterSpacing: '-0.015em', lineHeight: 1.25 }}>
                  {m.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <span className="font-display tabular" style={{ fontSize: 16, fontWeight: 600, color: INK.ink }}>
                    {m.kcal}<span style={{ fontSize: 10, fontWeight: 500, color: INK.ink3 }}> kcal</span>
                  </span>
                  <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
                    <span style={{ color: 'var(--accent-deep)', fontWeight: 600 }} className="font-mono">P{m.p}</span>
                    <span style={{ color: 'var(--warm)', fontWeight: 600 }} className="font-mono">C{m.c}</span>
                    <span style={{ color: 'var(--violet)', fontWeight: 600 }} className="font-mono">F{m.f}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Grocery shortcut */}
      <Card padding={16} style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'linear-gradient(135deg, var(--surface), color-mix(in oklab, var(--warm) 6%, var(--surface)))',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'linear-gradient(135deg, var(--warm), oklch(0.78 0.14 50))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h2l2 12h12l2-9H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK.ink }}>Grocery list ready</div>
          <div style={{ fontSize: 12, color: INK.ink3, marginTop: 1 }}>
            <span className="font-mono tabular">23 items</span> · est. <span className="font-mono tabular">$58</span> at Whole Foods
          </div>
        </div>
        <div style={{ color: INK.ink3 }}>{Icon.arrow(18, 'currentColor')}</div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCAN — full-screen camera + AI flow
// ═══════════════════════════════════════════════════════════════
function ScanScreen({ onClose }) {
  // states: ready -> capturing -> analyzing -> result
  const [state, setState] = useS('ready');
  const result = {
    name: 'Salmon poke bowl',
    confidence: 0.94,
    kcal: 580, p: 42, c: 58, f: 18,
    items: [
      { n: 'Sushi rice', amt: '1 cup', kcal: 205 },
      { n: 'Salmon, raw', amt: '4 oz', kcal: 175 },
      { n: 'Avocado', amt: '½', kcal: 120 },
      { n: 'Edamame', amt: '⅓ cup', kcal: 50 },
      { n: 'Soy sauce, sesame', amt: 'drizzle', kcal: 30 },
    ],
  };

  const startScan = () => {
    setState('capturing');
    setTimeout(() => setState('analyzing'), 600);
    setTimeout(() => setState('result'), 2400);
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#000',
      borderRadius: 48, overflow: 'hidden', zIndex: 100, color: '#fff',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Camera viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Mock camera feed: subtle gradient + noise */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 30% 30%, oklch(0.4 0.12 70) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 70%, oklch(0.35 0.12 30) 0%, transparent 50%),
            linear-gradient(180deg, oklch(0.18 0.03 60), oklch(0.1 0.02 60))
          `,
        }}/>
        {/* "Food" blob */}
        <div style={{
          position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%, -50%)',
          width: 200, height: 200,
          background: `radial-gradient(circle at 35% 35%, oklch(0.7 0.16 30), oklch(0.4 0.12 30) 60%, oklch(0.25 0.05 30))`,
          animation: 'blob 8s ease-in-out infinite',
          filter: 'blur(2px)',
        }}/>

        {/* Status bar overlay (re-render minimal) */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <IOSStatusBar dark={true}/>
        </div>

        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0, padding: '0 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5,
        }}>
          <button onClick={onClose} style={{
            width: 38, height: 38, borderRadius: 999, border: 'none',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
            color: '#fff', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: '#5DD8A8', boxShadow: '0 0 8px #5DD8A8' }}/>
            VISION ACTIVE
          </div>
          <button style={{
            width: 38, height: 38, borderRadius: 999, border: 'none',
            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4l2-2h2l2 2h3a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h3z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>

        {/* Reticle + scan line */}
        <div style={{
          position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%, -50%)',
          width: 280, height: 280, pointerEvents: 'none',
        }}>
          {/* Corners */}
          {[0, 90, 180, 270].map(deg => (
            <div key={deg} style={{
              position: 'absolute', width: 36, height: 36,
              borderTop: '2px solid rgba(255,255,255,0.9)',
              borderLeft: '2px solid rgba(255,255,255,0.9)',
              borderTopLeftRadius: 8,
              top: deg < 180 ? 0 : 'auto', bottom: deg >= 180 ? 0 : 'auto',
              left: deg === 0 || deg === 270 ? 0 : 'auto', right: deg === 90 || deg === 180 ? 0 : 'auto',
              transform: `rotate(${deg}deg)`, transformOrigin: 'center',
            }}/>
          ))}
          {/* Scan line */}
          {state === 'analyzing' && (
            <div style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, oklch(0.85 0.18 155), transparent)',
              boxShadow: '0 0 16px oklch(0.85 0.18 155)',
              animation: 'scan-line 1.6s ease-in-out infinite',
            }}/>
          )}

          {/* Detection points */}
          {(state === 'analyzing' || state === 'result') && (
            <>
              {[
                { x: 30, y: 80, label: 'salmon · 4oz' },
                { x: 180, y: 60, label: 'rice · 1c' },
                { x: 100, y: 200, label: 'avocado' },
              ].map((p, i) => (
                <div key={i} style={{
                  position: 'absolute', left: p.x, top: p.y,
                  animation: `fade-in 0.4s ${0.3 + i * 0.2}s both`,
                }}>
                  <div style={{ position: 'relative', width: 16, height: 16 }}>
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: 999,
                      border: '2px solid #5DD8A8',
                      animation: `pulse-ring 1.6s ${i * 0.2}s ease-out infinite`,
                    }}/>
                    <div style={{
                      position: 'absolute', inset: 4, borderRadius: 999,
                      background: '#5DD8A8', boxShadow: '0 0 10px #5DD8A8',
                    }}/>
                  </div>
                  <div style={{
                    position: 'absolute', left: 22, top: -4, whiteSpace: 'nowrap',
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                    color: '#fff', letterSpacing: '0.02em',
                  }}>{p.label}</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Bottom hint */}
        {state === 'ready' && (
          <div style={{
            position: 'absolute', bottom: 200, left: 0, right: 0, textAlign: 'center', zIndex: 5,
            animation: 'fade-in 0.4s both',
          }}>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.015em' }}>
              Frame your meal
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Vision detects ingredients in real time</div>
          </div>
        )}

        {state === 'analyzing' && (
          <div style={{
            position: 'absolute', bottom: 200, left: 0, right: 0, textAlign: 'center', zIndex: 5,
            animation: 'fade-in 0.4s both',
          }}>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.015em' }}>
              <span style={{
                background: 'linear-gradient(90deg, #fff 30%, #5DD8A8 50%, #fff 70%)',
                backgroundSize: '200% 100%', animation: 'shimmer 1.6s linear infinite',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>Analyzing macros…</span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>5 ingredients detected · estimating portions</div>
          </div>
        )}
      </div>

      {/* Bottom result drawer or shutter */}
      {state !== 'result' ? (
        <div style={{ padding: '16px 16px 32px', position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)' }}/>
            <button onClick={startScan} disabled={state !== 'ready'} style={{
              width: 76, height: 76, borderRadius: 999, border: 'none',
              background: state === 'ready' ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', position: 'relative',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.2), 0 0 0 6px rgba(255,255,255,0.15)',
            }}>
              {state === 'analyzing' && (
                <div style={{
                  position: 'absolute', inset: 8, borderRadius: 999,
                  border: '3px solid var(--accent)', borderTopColor: 'transparent',
                  animation: 'spin 0.9s linear infinite',
                }}/>
              )}
            </button>
            <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z"/>
                <circle cx="12" cy="13" r="4"/>
                <path d="M16 4l2 2"/>
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <ScanResultCard result={result} onClose={onClose} onAnother={() => setState('ready')}/>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ScanResultCard({ result, onClose, onAnother }) {
  return (
    <div style={{
      background: 'var(--surface)', color: INK.ink,
      borderRadius: '24px 24px 0 0',
      padding: '20px 18px 32px',
      boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
      animation: 'slide-up 0.4s both',
      maxHeight: '62%', overflowY: 'auto',
    }} className="no-scrollbar">
      <div style={{ width: 36, height: 4, borderRadius: 999, background: INK.hairline, margin: '0 auto 14px' }}/>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <PhotoStub width={64} height={64} hue={20} radius={14}/>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 600, color: INK.ink, letterSpacing: '-0.02em' }}>
              {result.name}
            </div>
            <Pill color="var(--accent)">{Math.round(result.confidence * 100)}% match</Pill>
          </div>
          <div style={{ fontSize: 11, color: INK.ink3, marginTop: 2 }}>{result.items.length} ingredients identified · adjustable</div>
        </div>
      </div>

      {/* Big numbers */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16,
        padding: 14, borderRadius: 18, background: 'var(--surface-2)', border: `0.5px solid ${INK.hairline}`,
      }}>
        <Stat label="kcal" value={<Counter value={result.kcal}/>} accent={INK.ink}/>
        <Stat label="protein" value={<><Counter value={result.p}/><span style={{ fontSize: 11, fontWeight: 500, color: INK.ink3 }}>g</span></>} accent="var(--accent)"/>
        <Stat label="carbs" value={<><Counter value={result.c}/><span style={{ fontSize: 11, fontWeight: 500, color: INK.ink3 }}>g</span></>} accent="var(--warm)"/>
        <Stat label="fat" value={<><Counter value={result.f}/><span style={{ fontSize: 11, fontWeight: 500, color: INK.ink3 }}>g</span></>} accent="var(--violet)"/>
      </div>

      {/* Ingredients */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: INK.ink3, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Detected ingredients
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {result.items.map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 12,
              background: 'var(--surface-2)', animation: `slide-up 0.4s ${i * 0.05}s both`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent)' }}/>
              <div style={{ flex: 1, fontSize: 13, color: INK.ink, fontWeight: 500 }}>{it.n}</div>
              <div className="font-mono" style={{ fontSize: 11, color: INK.ink3 }}>{it.amt}</div>
              <div className="font-mono tabular" style={{ fontSize: 12, fontWeight: 600, color: INK.ink, minWidth: 38, textAlign: 'right' }}>
                {it.kcal} kcal
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onAnother} style={{ ...btnGhost, flex: 1, padding: '14px', fontSize: 14, justifyContent: 'center', display: 'flex' }}>
          Scan again
        </button>
        <button onClick={onClose} style={{
          ...btnPrimary, flex: 2, padding: '14px', fontSize: 14, justifyContent: 'center', display: 'flex',
        }}>
          Log to Today {Icon.check(14, '#fff')}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COACH — chat with Claude
// ═══════════════════════════════════════════════════════════════
function CoachScreen() {
  const [messages, setMessages] = useS([
    { role: 'coach', text: "I'm reading your day — protein hit 78% before 4pm and you're 360 kcal under target. Want me to suggest a high-protein evening snack, or should we plan tomorrow's training fuel?" },
  ]);
  const [input, setInput] = useS('');
  const [thinking, setThinking] = useS(false);
  const scrollRef = useR();
  const suggestions = ['What should I eat tonight?', 'Why am I tired today?', 'Plan tomorrow\'s meals', 'Am I in deficit?'];

  useE(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || thinking) return;
    setMessages(m => [...m, { role: 'user', text: t }]);
    setInput('');
    setThinking(true);
    try {
      const reply = await window.claude.complete({
        messages: [
          { role: 'user', content: `You are Macrovia, a warm, supportive AI nutrition coach. The user is at 1,840 kcal (360 under their 2,200 target), protein 142/180g, carbs 198/240g, fat 64/80g, hydration 1.8L. They've had a 23-day protein streak. Reply briefly (2-4 sentences max), in a calm, human voice. No bullet lists. No emojis. Use specific numbers when relevant. User said: "${t}"` },
        ],
      });
      setMessages(m => [...m, { role: 'coach', text: reply || "I'm here. Let's keep going." }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'coach', text: "I lost my connection for a second. Try once more?" }]);
    }
    setThinking(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 700 }}>
      {/* Header */}
      <div style={{ padding: '8px 16px 16px', borderBottom: `0.5px solid ${INK.hairline}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            position: 'relative', width: 44, height: 44, borderRadius: 999,
            background: 'linear-gradient(135deg, var(--accent), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px color-mix(in oklab, var(--accent) 30%, transparent)',
          }}>
            <div style={{ color: '#fff' }}>{Icon.bolt(20, '#fff')}</div>
            <div style={{
              position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 999,
              background: '#5DD8A8', border: '2px solid var(--surface)',
            }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 600, color: INK.ink, letterSpacing: '-0.02em' }}>Coach</div>
            <div style={{ fontSize: 11, color: 'var(--accent-deep)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              live · sees today's data
            </div>
          </div>
          <button style={{ ...btnGhost, padding: '6px 12px' }}>History</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="no-scrollbar" style={{
        flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>{m.text}</Bubble>
        ))}
        {thinking && (
          <Bubble role="coach"><Typing/></Bubble>
        )}
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 6, overflowX: 'auto' }} className="no-scrollbar">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{
              ...btnGhost, whiteSpace: 'nowrap', flexShrink: 0, fontSize: 12,
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Composer */}
      <div style={{ padding: '8px 12px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: `0.5px solid ${INK.hairline}`,
          borderRadius: 999, padding: '6px 6px 6px 18px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
          <input value={input} onChange={e => setInput(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && send()}
                 placeholder="Ask anything…"
                 style={{
                   flex: 1, border: 'none', outline: 'none', background: 'transparent',
                   fontSize: 14, color: INK.ink, padding: '8px 0',
                 }}/>
          <button style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'var(--surface-2)', color: INK.ink3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Icon.mic(18, 'currentColor')}</button>
          <button onClick={() => send()} disabled={!input.trim() || thinking} style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: input.trim() && !thinking ? 'linear-gradient(135deg, var(--accent), var(--accent-deep))' : 'var(--hairline)',
            color: '#fff', cursor: input.trim() && !thinking ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}>{Icon.send(18, '#fff')}</button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ role, children }) {
  const isUser = role === 'user';
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'slide-up 0.3s both',
    }}>
      <div style={{
        maxWidth: '82%', padding: '12px 16px', borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
        background: isUser ? 'linear-gradient(135deg, var(--accent), var(--accent-deep))' : 'var(--surface)',
        color: isUser ? '#fff' : INK.ink,
        fontSize: 14, lineHeight: 1.45,
        border: isUser ? 'none' : `0.5px solid ${INK.hairline}`,
        boxShadow: isUser ? '0 4px 14px color-mix(in oklab, var(--accent) 25%, transparent)' : 'var(--shadow-card)',
      }}>{children}</div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: 999, background: INK.ink3,
          animation: `typing 1.2s ${i * 0.15}s ease-in-out infinite`,
        }}/>
      ))}
      <style>{`@keyframes typing { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS — weight, streaks, milestones
// ═══════════════════════════════════════════════════════════════
function ProgressScreen({ data }) {
  const dropped = data.weightHistory[0] - data.weight;
  const trend = data.weightHistory.map((v, i) => ({ x: i, v }));
  const consistency = [
    { l: 'M', v: 96 }, { l: 'T', v: 88 }, { l: 'W', v: 92 },
    { l: 'T', v: 78 }, { l: 'F', v: 95 }, { l: 'S', v: 84 }, { l: 'S', v: 91 },
  ];

  return (
    <div style={{ padding: '12px 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 12, color: INK.ink3, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          12-week journey
        </div>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 600, color: INK.ink, marginTop: 2, letterSpacing: '-0.03em' }}>
          You're moving.
        </div>
      </div>

      {/* Hero weight card */}
      <Card glass padding={20} style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', bottom: -40, right: -40, width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.85 0.13 155 / 0.5), transparent 70%)', filter: 'blur(20px)',
        }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: INK.ink3, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Current weight
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="font-display tabular" style={{ fontSize: 48, fontWeight: 600, color: INK.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {data.weight}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: INK.ink3 }}>lb</span>
              </div>
            </div>
            <Pill color="var(--accent)">↓ {dropped.toFixed(1)} lb in 12wk</Pill>
          </div>
          <div className="font-mono" style={{ fontSize: 11, color: INK.ink3, marginTop: 4 }}>
            target {data.targetWeight} lb · {(data.weight - data.targetWeight).toFixed(1)} to go
          </div>

          <div style={{ marginTop: 18, position: 'relative' }}>
            <Sparkline data={data.weightHistory} height={90} stroke="var(--accent)"/>
            {/* target line */}
            <div style={{
              position: 'absolute', bottom: 12, left: 0, right: 0, height: 1,
              background: 'var(--accent-deep)', opacity: 0.3,
              borderTop: '1px dashed var(--accent-deep)',
            }}/>
            <div style={{ position: 'absolute', bottom: 12, right: 0, fontSize: 9, color: 'var(--accent-deep)', fontWeight: 600 }}>
              GOAL
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['12wk', '10', '8', '6', '4', '2', 'Now'].map((l, i) => (
              <span key={i} className="font-mono" style={{ fontSize: 9, color: INK.ink4 }}>{l}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* Streak + score */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
        <Card padding={16} style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--surface), color-mix(in oklab, var(--warm) 8%, var(--surface)))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ color: 'var(--warm)' }}>{Icon.flame(20)}</div>
            <div style={{ fontSize: 11, color: INK.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Streak</div>
          </div>
          <div className="font-display tabular" style={{ fontSize: 38, fontWeight: 600, color: INK.ink, lineHeight: 1, letterSpacing: '-0.03em' }}>
            <Counter value={data.streak}/>
          </div>
          <div style={{ fontSize: 11, color: INK.ink3, marginTop: 4 }}>days hitting protein</div>
        </Card>
        <Card padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ color: 'var(--accent)' }}>{Icon.spark(20)}</div>
            <div style={{ fontSize: 11, color: INK.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>Score</div>
          </div>
          <div className="font-display tabular" style={{ fontSize: 38, fontWeight: 600, color: INK.ink, lineHeight: 1, letterSpacing: '-0.03em' }}>
            <Counter value={86}/>
          </div>
          <div style={{ fontSize: 11, color: INK.ink3, marginTop: 4 }}>+4 vs last wk</div>
        </Card>
      </div>

      {/* Consistency */}
      <Card padding={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div>
            <div className="font-display" style={{ fontSize: 17, fontWeight: 600, color: INK.ink, letterSpacing: '-0.02em' }}>
              Calorie consistency
            </div>
            <div style={{ fontSize: 12, color: INK.ink3, marginTop: 1 }}>How close to target each day</div>
          </div>
          <div className="font-mono tabular" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-deep)' }}>89%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {consistency.map((d, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1, width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  width: '100%', height: `${d.v}%`, borderRadius: 6,
                  background: d.v >= 90
                    ? 'linear-gradient(180deg, var(--accent), var(--accent-deep))'
                    : 'linear-gradient(180deg, var(--warm), oklch(0.62 0.14 60))',
                  animation: `slide-up 0.6s ${i * 0.05}s both`,
                }}/>
                <div className="font-mono" style={{
                  position: 'absolute', top: -14, left: 0, right: 0, textAlign: 'center',
                  fontSize: 9, color: INK.ink4, fontWeight: 600,
                }}>{d.v}</div>
              </div>
              <div className="font-mono" style={{ fontSize: 9, color: INK.ink4 }}>{d.l}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Milestone */}
      <Card padding={18} style={{
        background: 'linear-gradient(135deg, color-mix(in oklab, var(--accent) 12%, var(--surface)), var(--surface))',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, position: 'relative', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px color-mix(in oklab, var(--accent) 30%, transparent)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3v6a7 7 0 0 0 14 0V3M9 21h6M12 16v5"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: INK.ink, letterSpacing: '-0.015em' }}>
              5.8 lb milestone unlocked
            </div>
            <div style={{ fontSize: 12, color: INK.ink3, marginTop: 2 }}>
              You're in the top <span className="font-mono tabular" style={{ fontWeight: 600, color: INK.ink2 }}>9%</span> of your cohort.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, {
  TodayScreen, MealsScreen, ScanScreen, CoachScreen, ProgressScreen, getMockData,
});
