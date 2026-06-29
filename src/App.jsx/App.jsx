import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F0E8",
  card: "#FDFAF5",
  cardAlt: "#EDE8DF",
  accent: "#B89B72",
  accentLight: "#D4BC98",
  text: "#2C2416",
  muted: "#8A7B6A",
  border: "#DDD5C8",
  pill: "#EDE8DF",
  pillActive: "#B89B72",
  pillActiveText: "#FDFAF5",
  success: "#7A9E7E",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const fmt = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

const weekKey = (iso) => {
  const d = new Date(iso);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
};

const weekLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  return `${fmt(iso)} – ${fmt(end.toISOString().slice(0, 10))}`;
};

const avg = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

const loadAll = () => {
  try {
    return JSON.parse(localStorage.getItem("monday_entries") || "[]");
  } catch {
    return [];
  }
};

const saveAll = (entries) =>
  localStorage.setItem("monday_entries", JSON.stringify(entries));

// ── Shared UI components ───────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div
    style={{
      background: C.card,
      borderRadius: 20,
      padding: "24px 28px",
      boxShadow: "0 2px 14px rgba(60,40,10,0.07)",
      border: `1px solid ${C.border}`,
      marginBottom: 20,
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 2,
      color: C.muted,
      textTransform: "uppercase",
      marginBottom: 18,
    }}
  >
    {children}
  </p>
);

const FieldLabel = ({ children, sub }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
      {children}
    </label>
    {sub && (
      <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</p>
    )}
  </div>
);

const Field = ({ label, sub, children }) => (
  <div style={{ marginBottom: 24 }}>
    <FieldLabel sub={sub}>{label}</FieldLabel>
    {children}
  </div>
);

const NumInput = ({ value, onChange, placeholder, min, max, step = 0.1 }) => (
  <input
    type="number"
    value={value}
    min={min}
    max={max}
    step={step}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    style={{
      width: "100%",
      padding: "12px 16px",
      borderRadius: 12,
      border: `1.5px solid ${C.border}`,
      background: C.bg,
      color: C.text,
      fontSize: 15,
      outline: "none",
      fontFamily: "inherit",
      boxSizing: "border-box",
      transition: "border-color 0.15s",
    }}
    onFocus={(e) => (e.target.style.borderColor = C.accent)}
    onBlur={(e) => (e.target.style.borderColor = C.border)}
  />
);

const Pills = ({ options, value, onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <button
          key={opt.value}
          onClick={() => onChange(active ? "" : opt.value)}
          style={{
            padding: "9px 20px",
            borderRadius: 99,
            border: `1.5px solid ${active ? C.pillActive : C.border}`,
            background: active ? C.pillActive : C.pill,
            color: active ? C.pillActiveText : C.muted,
            fontWeight: active ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.18s ease",
            fontFamily: "inherit",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

const SliderField = ({ label, value, onChange }) => {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
        }}
      >
        <label style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
          {label}
        </label>
        <span
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: C.accent,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>
      <div style={{ position: "relative", height: 8, borderRadius: 99, background: C.border }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            borderRadius: 99,
            width: `${pct}%`,
            background: `linear-gradient(to right, ${C.accentLight}, ${C.accent})`,
            transition: "width 0.1s",
          }}
        />
        <input
          type="range"
          min={1}
          max={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: C.muted }}>1 – Laag</span>
        <span style={{ fontSize: 11, color: C.muted }}>10 – Hoog</span>
      </div>
    </div>
  );
};

// ── KPI card for dashboard ─────────────────────────────────────────────────────
const KPI = ({ label, value, unit, color }) => (
  <div
    style={{
      background: C.card,
      borderRadius: 16,
      padding: "18px 20px",
      border: `1px solid ${C.border}`,
      flex: "1 1 140px",
      minWidth: 120,
    }}
  >
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.5,
        color: C.muted,
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {label}
    </p>
    <p
      style={{
        fontSize: 28,
        fontWeight: 800,
        color: color || C.accent,
        lineHeight: 1,
      }}
    >
      {value !== null && value !== undefined ? value : "—"}
      {value !== null && value !== undefined && unit && (
        <span
          style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginLeft: 4 }}
        >
          {unit}
        </span>
      )}
    </p>
  </div>
);

// ── Mini recharts line chart ───────────────────────────────────────────────────
const MiniChart = ({ data, dataKey, label, color, unit }) => (
  <Card>
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 16,
      }}
    >
      {label}
    </p>
    {data.length < 2 ? (
      <p style={{ color: C.muted, fontSize: 13 }}>
        Voeg meer dagen toe om een trend te zien.
      </p>
    ) : (
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: C.muted }}
            tickFormatter={fmt}
          />
          <YAxis tick={{ fontSize: 10, fill: C.muted }} />
          <Tooltip
            contentStyle={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              fontSize: 12,
              fontFamily: "Inter, sans-serif",
            }}
            labelFormatter={fmt}
            formatter={(v) => [`${v}${unit || ""}`, label]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color || C.accent}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color || C.accent, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    )}
  </Card>
);

// ── Auto insights generator ────────────────────────────────────────────────────
function generateInsights(entries) {
  if (entries.length < 3) return [];
  const insights = [];

  const sleepEnergyPairs = entries.filter((e) => e.sleep && e.energie);
  if (sleepEnergyPairs.length >= 3) {
    const highSleep = sleepEnergyPairs
      .filter((e) => Number(e.sleep) >= 7)
      .map((e) => Number(e.energie));
    const lowSleep = sleepEnergyPairs
      .filter((e) => Number(e.sleep) < 7)
      .map((e) => Number(e.energie));
    if (highSleep.length && lowSleep.length && avg(highSleep) - avg(lowSleep) > 0.8)
      insights.push("💤 Je energie is gemiddeld hoger op dagen dat je 7+ uur slaapt.");
  }

  const stressPairs = entries.filter((e) => e.stress && e.herstel);
  if (stressPairs.length >= 3) {
    const highStress = stressPairs
      .filter((e) => e.stress === "hoog")
      .map((e) => Number(e.herstel));
    const lowStress = stressPairs
      .filter((e) => e.stress === "laag")
      .map((e) => Number(e.herstel));
    if (
      highStress.length &&
      lowStress.length &&
      avg(lowStress) - avg(highStress) > 1
    )
      insights.push("⚡ Je herstel lijkt lager op dagen met veel stress.");
  }

  const waterPairs = entries.filter((e) => e.water && e.energie);
  if (waterPairs.length >= 3) {
    const withWater = waterPairs
      .filter((e) => e.water === "ja")
      .map((e) => Number(e.energie));
    const withoutWater = waterPairs
      .filter((e) => e.water === "nee")
      .map((e) => Number(e.energie));
    if (
      withWater.length &&
      withoutWater.length &&
      avg(withWater) - avg(withoutWater) > 0.6
    )
      insights.push(
        "💧 Op dagen dat je 2,5L+ drinkt, is je energiescore gemiddeld hoger."
      );
  }

  const cravingPairs = entries.filter((e) => e.cravings && e.mindset);
  if (cravingPairs.length >= 3) {
    const cravingNeg = cravingPairs
      .filter((e) => e.cravings === "ja")
      .filter((e) => e.mindset === "negatief").length;
    const cravingTotal = cravingPairs.filter((e) => e.cravings === "ja").length;
    if (cravingTotal >= 2 && cravingNeg / cravingTotal > 0.6)
      insights.push("🍫 Cravings komen vaker voor op dagen met een negatieve mindset.");
  }

  if (!insights.length)
    insights.push(
      "📊 Blijf bijhouden – na meer invullen verschijnen hier automatisch persoonlijke inzichten."
    );

  return insights;
}

// ── Log Form ──────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  date: today(),
  weight: "",
  sleep: "",
  steps: "",
  mood: "",
  water: "",
  cravings: "",
  stress: "",
  mindset: "",
  stoelgang: "",
  energie: 5,
  herstel: 5,
  menstruatie: "",
  notes: "",
});

function LogForm({ onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    const entries = loadAll().filter((e) => e.date !== form.date);
    entries.push({ ...form });
    saveAll(entries);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2800);
  };

  return (
    <div>
      {/* Section 1 – Vandaag */}
      <Card>
        <SectionLabel>Vandaag</SectionLabel>

        <Field label="Datum">
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              background: C.cardAlt,
              color: C.muted,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {fmt(form.date)}
          </div>
        </Field>

        <Field label="Gewicht (kg)">
          <NumInput
            value={form.weight}
            onChange={set("weight")}
            placeholder="bijv. 65.4"
            min={30}
            max={250}
          />
        </Field>

        <Field label="Uren geslapen">
          <NumInput
            value={form.sleep}
            onChange={set("sleep")}
            placeholder="bijv. 7.5"
            min={0}
            max={24}
          />
        </Field>
      </Card>

      {/* Section 2 – Gisteren */}
      <Card>
        <SectionLabel>Gisteren</SectionLabel>
        <p
          style={{
            fontSize: 13,
            color: C.muted,
            marginBottom: 22,
            marginTop: -10,
            lineHeight: 1.5,
          }}
        >
          Onderstaande vragen zijn van gisteren
        </p>

        <Field label="Stappen behaald">
          <NumInput
            value={form.steps}
            onChange={set("steps")}
            placeholder="bijv. 8.500"
            min={0}
            step={100}
          />
        </Field>

        <Field label="Ik voel mij">
          <Pills
            value={form.mood}
            onChange={set("mood")}
            options={[
              { value: "goed", label: "😊 Goed" },
              { value: "mwah", label: "😐 Mwah" },
              { value: "slecht", label: "😔 Slecht" },
            ]}
          />
        </Field>

        <Field label="2,5L+ water gedronken">
          <Pills
            value={form.water}
            onChange={set("water")}
            options={[
              { value: "ja", label: "Ja" },
              { value: "nee", label: "Nee" },
            ]}
          />
        </Field>

        <Field label="Last van cravings">
          <Pills
            value={form.cravings}
            onChange={set("cravings")}
            options={[
              { value: "ja", label: "Ja" },
              { value: "nee", label: "Nee" },
            ]}
          />
        </Field>

        <Field label="Stress">
          <Pills
            value={form.stress}
            onChange={set("stress")}
            options={[
              { value: "laag", label: "Laag" },
              { value: "medium", label: "Medium" },
              { value: "hoog", label: "Hoog" },
            ]}
          />
        </Field>

        <Field label="Mindset">
          <Pills
            value={form.mindset}
            onChange={set("mindset")}
            options={[
              { value: "positief", label: "Positief" },
              { value: "negatief", label: "Negatief" },
            ]}
          />
        </Field>

        <Field label="Stoelgang">
          <Pills
            value={form.stoelgang}
            onChange={set("stoelgang")}
            options={[
              { value: "goed", label: "Goed" },
              { value: "slecht", label: "Slecht" },
            ]}
          />
        </Field>

        <SliderField label="Energie" value={form.energie} onChange={set("energie")} />
        <SliderField label="Herstel" value={form.herstel} onChange={set("herstel")} />

        <Field label="Menstruatie">
          <Pills
            value={form.menstruatie}
            onChange={set("menstruatie")}
            options={[
              { value: "ja", label: "Ja" },
              { value: "nee", label: "Nee" },
            ]}
          />
        </Field>
      </Card>

      {/* Section 3 – Notities */}
      <Card>
        <SectionLabel>Notities</SectionLabel>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes")(e.target.value)}
          placeholder="Hoe was je dag? Wat wil je onthouden?"
          rows={4}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 14,
            border: `1.5px solid ${C.border}`,
            background: C.bg,
            color: C.text,
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            lineHeight: 1.6,
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = C.accent)}
          onBlur={(e) => (e.target.style.borderColor = C.border)}
        />
      </Card>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: 14,
          border: "none",
          background: saved ? C.success : C.accent,
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          transition: "background 0.35s ease, transform 0.1s ease",
          fontFamily: "inherit",
          letterSpacing: 0.3,
          boxShadow: saved
            ? "0 4px 18px rgba(122,158,126,0.35)"
            : "0 4px 18px rgba(184,155,114,0.35)",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {saved ? "Opgeslagen ✅" : "Opslaan"}
      </button>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ entries }) {
  const weeks = [...new Set(entries.map((e) => weekKey(e.date)))]
    .sort()
    .reverse();

  const [selectedWeek, setSelectedWeek] = useState(weeks[0] || "");

  useEffect(() => {
    if (weeks.length && !selectedWeek) setSelectedWeek(weeks[0]);
  }, [weeks.length]);

  const weekEntries = entries.filter(
    (e) => weekKey(e.date) === selectedWeek
  );

  const wAvg = (key) => {
    const vals = weekEntries
      .map((e) => Number(e[key]))
      .filter((v) => v > 0);
    return vals.length ? Math.round(avg(vals) * 10) / 10 : null;
  };

  const weekScore = (() => {
    const scores = weekEntries.map(
      (e) => (Number(e.energie) + Number(e.herstel)) / 2
    );
    const a = avg(scores);
    return a ? Math.round(a * 10) / 10 : null;
  })();

  const chartData = [...entries]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((e) => ({
      date: e.date,
      weight: e.weight ? Number(e.weight) : null,
      sleep: e.sleep ? Number(e.sleep) : null,
      energie: Number(e.energie),
      herstel: Number(e.herstel),
      dagscore: Math.round(((Number(e.energie) + Number(e.herstel)) / 2) * 10) / 10,
    }));

  const insights = generateInsights(entries);

  return (
    <div>
      {/* Week selector */}
      <Card>
        <SectionLabel>Weekoverzicht</SectionLabel>

        {weeks.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Nog geen data beschikbaar. Vul je eerste dag in via Dagregistratie.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {weeks.slice(0, 8).map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 99,
                    border: `1.5px solid ${w === selectedWeek ? C.accent : C.border}`,
                    background: w === selectedWeek ? C.accent : C.pill,
                    color: w === selectedWeek ? "#fff" : C.muted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.18s",
                  }}
                >
                  {weekLabel(w)}
                </button>
              ))}
            </div>

            {weekEntries.length > 0 ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <KPI label="Weekscore" value={weekScore} unit="/10" color={C.accent} />
                  <KPI label="Gem. gewicht" value={wAvg("weight")} unit="kg" />
                  <KPI label="Gem. slaap" value={wAvg("sleep")} unit="u" />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                  <KPI label="Gem. stappen" value={wAvg("steps")} />
                  <KPI label="Gem. energie" value={wAvg("energie")} unit="/10" />
                  <KPI label="Gem. herstel" value={wAvg("herstel")} unit="/10" />
                </div>
              </>
            ) : (
              <p style={{ color: C.muted, fontSize: 13 }}>
                Geen registraties in deze week.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Insights */}
      {entries.length >= 3 && (
        <Card style={{ background: "#F0EBE1" }}>
          <SectionLabel>Automatische inzichten</SectionLabel>
          {insights.map((ins, i) => (
            <p
              key={i}
              style={{
                fontSize: 14,
                color: C.text,
                lineHeight: 1.7,
                marginBottom: i < insights.length - 1 ? 10 : 0,
              }}
            >
              {ins}
            </p>
          ))}
        </Card>
      )}

      {/* Charts */}
      {chartData.length > 0 && (
        <>
          <MiniChart
            data={chartData.filter((d) => d.weight)}
            dataKey="weight"
            label="Gewicht"
            unit=" kg"
            color="#8A7B6A"
          />
          <MiniChart
            data={chartData.filter((d) => d.sleep)}
            dataKey="sleep"
            label="Slaapuren"
            unit=" u"
            color="#9BA89E"
          />
          <MiniChart
            data={chartData}
            dataKey="energie"
            label="Energie"
            unit="/10"
            color={C.accent}
          />
          <MiniChart
            data={chartData}
            dataKey="herstel"
            label="Herstel"
            unit="/10"
            color="#A07C6A"
          />
          <MiniChart
            data={chartData}
            dataKey="dagscore"
            label="Dagscore (energie + herstel)"
            unit="/10"
            color="#C4A882"
          />
        </>
      )}
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("log");
  const [entries, setEntries] = useState(loadAll);

  const refresh = useCallback(() => setEntries(loadAll()), []);

  const TabBtn = ({ id, emoji, label }) => {
    const active = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        style={{
          flex: 1,
          padding: "11px 0",
          borderRadius: 11,
          border: "none",
          background: active ? C.accent : "transparent",
          color: active ? "#fff" : C.muted,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "inherit",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          boxShadow: active ? "0 2px 10px rgba(184,155,114,0.3)" : "none",
        }}
      >
        <span>{emoji}</span> {label}
      </button>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: C.text,
        paddingBottom: 60,
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "24px 24px 16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          {/* Logo row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 16px ${C.accent}44`,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 22,
                  letterSpacing: -1,
                  fontFamily: "inherit",
                }}
              >
                M
              </span>
            </div>
            <div>
              <h1
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: -0.5,
                  color: C.text,
                }}
              >
                Monday Motivation
              </h1>
              <p
                style={{
                  fontSize: 11,
                  color: C.muted,
                  margin: 0,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                Make everyday your Monday
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: C.cardAlt,
              borderRadius: 13,
              padding: 4,
            }}
          >
            <TabBtn id="log" emoji="📋" label="Dagregistratie" />
            <TabBtn id="dashboard" emoji="📊" label="Dashboard" />
          </div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 0" }}>
        {tab === "log" ? (
          <LogForm onSaved={refresh} />
        ) : (
          <Dashboard entries={entries} />
        )}
      </div>
    </div>
  );
}
