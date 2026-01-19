import { useMemo, useState } from "react";
import phones from "./data/phones.json";
import { rankPhones, explain } from "./lib/reco";

const DEFAULT_WEIGHTS = {
  value: 20,
  reliability: 20,
  performance: 20,
  camera: 15,
  battery: 15,
  safetyPrivacy: 10
};

function normalizeTo100(weights, changedKey, newValue) {
  const w = { ...weights, [changedKey]: newValue };
  const keys = Object.keys(w);
  const total = keys.reduce((s, k) => s + w[k], 0);
  if (total === 100) return w;

  // Auto-adjust the other sliders proportionally to keep sum at 100
  const otherKeys = keys.filter((k) => k !== changedKey);
  const otherTotal = otherKeys.reduce((s, k) => s + w[k], 0) || 1;
  const remaining = 100 - w[changedKey];

  const scaled = { ...w };
  otherKeys.forEach((k) => {
    scaled[k] = Math.max(0, Math.round((w[k] / otherTotal) * remaining));
  });

  // Fix rounding drift
  const drift = 100 - keys.reduce((s, k) => s + scaled[k], 0);
  if (drift !== 0) {
    const k = otherKeys[0] || changedKey;
    scaled[k] = Math.max(0, scaled[k] + drift);
  }
  return scaled;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    budgetUSD: 600,
    os: "Any", // Any | iOS | Android
    maxSize: "Any" // Any | Small | Medium | Large
  });

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  const ranked = useMemo(() => rankPhones(phones, answers, weights), [answers, weights]);
  const top3 = ranked.slice(0, 3).map((p) => ({ phone: p, expl: explain(p, answers, weights) }));

  const questions = [
    {
      title: "What's your max budget (used, USD)?",
      body: (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="range"
            min={200}
            max={1200}
            step={10}
            value={answers.budgetUSD}
            onChange={(e) => setAnswers((a) => ({ ...a, budgetUSD: Number(e.target.value) }))}
            style={{ width: "100%" }}
          />
          <div style={{ width: 90, textAlign: "right" }}>${answers.budgetUSD}</div>
        </div>
      )
    },
    {
      title: "iPhone or Android?",
      body: (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Any", "iOS", "Android"].map((v) => (
            <button key={v} onClick={() => setAnswers((a) => ({ ...a, os: v }))} style={btn(answers.os === v)}>
              {v === "Any" ? "No preference" : v}
            </button>
          ))}
        </div>
      )
    },
    {
      title: "Preferred phone size?",
      body: (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Any", "Small", "Medium", "Large"].map((v) => (
            <button key={v} onClick={() => setAnswers((a) => ({ ...a, maxSize: v }))} style={btn(answers.maxSize === v)}>
              {v === "Any" ? "Any size" : v}
            </button>
          ))}
        </div>
      )
    }
  ];

  return (
    <div style={page}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Shopping Specialist — Phone Demo</div>
          <div style={{ opacity: 0.7, marginTop: 4 }}>Answer a few questions → get top 3 picks. Adjust weights to rerank.</div>
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>Demo data • deterministic ranking</div>
      </header>

      <div style={grid}>
        {/* Left: Questions */}
        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Questions</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Step {Math.min(step + 1, questions.length)} / {questions.length}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 650 }}>{questions[step].title}</div>
            <div style={{ marginTop: 10 }}>{questions[step].body}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                style={ghostBtn(step === 0)}
              >
                Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))}
                disabled={step === questions.length - 1}
                style={primaryBtn(step === questions.length - 1)}
              >
                Next
              </button>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
              Pro tip: this is intentionally tiny. Your real product adds dynamic question stopping + category-specific trees.
            </div>
          </div>
        </section>

        {/* Middle: Weights */}
        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700 }}>Your weights</div>
            <div style={{ opacity: 0.7, fontSize: 12 }}>
              Total: {Object.values(weights).reduce((a, b) => a + b, 0)}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {Object.entries(weights).map(([k, v]) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ textTransform: "capitalize" }}>{label(k)}</span>
                  <span style={{ opacity: 0.8 }}>{v}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={1}
                  value={v}
                  onChange={(e) => setWeights((w) => normalizeTo100(w, k, Number(e.target.value)))}
                  style={{ width: "100%" }}
                />
              </div>
            ))}
          </div>

          <button onClick={() => setWeights(DEFAULT_WEIGHTS)} style={{ ...ghostBtn(false), marginTop: 12, width: "100%" }}>
            Reset weights
          </button>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            This is a major trust feature. Users can "argue" with the model and see results update instantly.
          </div>
        </section>

        {/* Right: Results */}
        <section style={card}>
          <div style={{ fontWeight: 700 }}>Top 3 recommendations</div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {top3.map(({ phone, expl }, idx) => (
              <div key={phone.id} style={resultCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 750 }}>
                      #{idx + 1} — {phone.name}
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
                      {phone.os} • {phone.screenIn}" • ~${phone.priceUsedUSD} used
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Fit</div>
                    <div style={{ fontWeight: 800 }}>{Math.round(phone.score * 100)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>Why it fits</div>
                  <ul style={ul}>
                    {expl.bullets.slice(0, 3).map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>

                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Trade-offs</div>
                  <ul style={ul}>
                    {expl.tradeoffs.slice(0, 2).map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>

                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>Where to buy</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                    {phone.buyLinks.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={linkBtn}>
                        {l.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            Next: add "confidence meter" + dynamic question stopping + "show me alternatives".
          </div>
        </section>
      </div>
    </div>
  );
}

function label(k) {
  return (
    {
      value: "Value / Price",
      reliability: "Reliability",
      performance: "Performance",
      camera: "Camera",
      battery: "Battery",
      safetyPrivacy: "Safety & privacy"
    }[k] || k
  );
}

function btn(active) {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer"
  };
}

function primaryBtn(disabled) {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: disabled ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.18)",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    flex: 1
  };
}

function ghostBtn(disabled) {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    flex: 1,
    opacity: disabled ? 0.5 : 1
  };
}

const page = {
  minHeight: "100vh",
  padding: 18,
  background: "radial-gradient(1200px 600px at 20% 0%, rgba(120,120,255,0.28), transparent), #0b0d14",
  color: "white",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial"
};

const grid = {
  marginTop: 16,
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr 1.4fr",
  gap: 14
};

const card = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  padding: 14,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
};

const resultCard = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(0,0,0,0.18)",
  padding: 12
};

const ul = { marginTop: 6, marginBottom: 0, paddingLeft: 18, opacity: 0.92 };

const linkBtn = {
  display: "inline-block",
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  color: "white",
  textDecoration: "none",
  background: "rgba(255,255,255,0.08)",
  fontSize: 12
};
