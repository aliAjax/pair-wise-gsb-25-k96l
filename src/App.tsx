import { useMemo, useState } from "react";
import "./styles.css";
import EntryForm from "./components/EntryForm";
import LedgerList from "./components/LedgerList";
import { useLedger } from "./lib/useLedger";

function App() {
  const { entries, selected, select, saveDraft, openNewVersion, today } = useLedger();
  const [formKey, setFormKey] = useState(0);
  const [showNew, setShowNew] = useState(false);

  const stats = useMemo(() => {
    const change = entries.filter((e) => e.evaluation.verdict === "change").length;
    const unknown = entries.filter((e) => e.evaluation.verdict === "unknown").length;
    const pending = entries.filter((e) => e.disposition === "pending").length;
    const overdue = entries.filter(
      (e) => e.disposition === "keep" && e.reviewDate !== "" && e.reviewDate < today
    ).length;
    return { total: entries.length, change, unknown, pending, overdue };
  }, [entries, today]);

  const metricCards = [
    { label: "建议换镜", value: stats.change, cls: "status-danger" },
    { label: "无法判断（含缺项）", value: stats.unknown, cls: "status-watch" },
    { label: "待核对", value: stats.pending, cls: "status-ok" },
    { label: "复查逾期", value: stats.overdue, cls: "status-watch" },
  ];

  const startNew = () => {
    setFormKey((k) => k + 1);
    setShowNew(true);
    select(null);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-11 · 验光核对台账</p>
          <h1>旧镜度数 × 本次验光 核对台账</h1>
          <p className="subtitle">
            旧镜度数与本次验光分开记录：球镜或柱镜相差 ≥0.50D，或原柱镜 ≥0.50D 且轴位差
            &gt;15° 时给出换镜建议并保留命中项；缺项判为无法判断。暂不换镜登记复查日期，确认换镜后核对与处方固定，后续调整新建版本。
          </p>
        </div>
        <div className="stack-card rule-card">
          <span>换镜判定规则</span>
          <strong>① 球镜差 ≥ 0.50D</strong>
          <strong>② 柱镜差 ≥ 0.50D</strong>
          <strong>③ 原柱镜 ≥ 0.50D 且轴位差 &gt; 15°</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {metricCards.map((m) => (
          <article key={m.label} className="metric-card">
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <i className={m.cls} />
          </article>
        ))}
      </section>

      <div className="toolbar">
        <button className="primary-action" onClick={startNew}>
          + 新增核对
        </button>
        {showNew && (
          <button
            onClick={() => {
              setShowNew(false);
              setFormKey((k) => k + 1);
            }}
          >
            收起录入
          </button>
        )}
      </div>

      {(showNew || selected) && (
        <EntryForm
          key={selected ? `e-${selected.id}` : `new-${formKey}`}
          base={selected}
          today={today}
          onSave={saveDraft}
          onNewVersion={(b) => {
            openNewVersion(b);
          }}
          onCancel={() => {
            setShowNew(false);
            select(null);
            setFormKey((k) => k + 1);
          }}
        />
      )}

      <LedgerList
        entries={entries}
        selectedId={selected?.id ?? null}
        today={today}
        onSelect={(id) => {
          setShowNew(false);
          select(id);
        }}
        onNewVersion={(b) => openNewVersion(b)}
      />
    </main>
  );
}

export default App;
