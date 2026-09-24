import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import EntryForm from "./components/EntryForm";
import LedgerList from "./components/LedgerList";
import {
  buildRecord,
  createNextVersion,
  draftFromRecord,
  emptyDraft,
  markChange,
  markPending,
  markRetain,
} from "./ledger/model";
import { loadRecords, saveRecords } from "./ledger/storage";
import {
  AXIS_CYLINDER_MIN,
  AXIS_THRESHOLD,
  CYLINDER_THRESHOLD,
  SPHERE_THRESHOLD,
} from "./ledger/rules";
import type { Draft, LedgerRecord } from "./ledger/types";

function App() {
  const [records, setRecords] = useState<LedgerRecord[]>(() => loadRecords());
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");

  // 数据变化即保存，重开页面结果还在
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const updateRecord = (next: LedgerRecord) => {
    setRecords((prev) => prev.map((record) => (record.id === next.id ? next : record)));
  };

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const handleSave = () => {
    if (!draft.customer.trim()) {
      flash("请先填写顾客/档案号");
      return;
    }
    if (editingId) {
      setRecords((prev) =>
        prev.map((record) => {
          if (record.id !== editingId) return record;
          const rebuilt = buildRecord(draft, {
            id: record.id,
            rootId: record.rootId,
            version: record.version,
          });
          return { ...rebuilt, createdAt: record.createdAt };
        }),
      );
      flash("修订已保存，核对结果已同步更新");
    } else {
      setRecords((prev) => [buildRecord(draft), ...prev]);
      flash("核对已保存入台账");
    }
    setDraft(emptyDraft());
    setEditingId(null);
  };

  const handleEdit = (record: LedgerRecord) => {
    setDraft(draftFromRecord(record));
    setEditingId(record.id);
    document.getElementById("entry")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRetain = (record: LedgerRecord, reviewDate: string) => {
    updateRecord(markRetain(record, reviewDate));
    flash("已登记暂不换镜并保留复查日期");
  };

  const handleChange = (record: LedgerRecord) => {
    updateRecord(markChange(record));
    flash("已确认换镜：核对结果与处方固定");
  };

  const handlePending = (record: LedgerRecord) => {
    updateRecord(markPending(record));
  };

  const handleNextVersion = (record: LedgerRecord) => {
    const next = createNextVersion(record);
    setRecords((prev) => [next, ...prev]);
    setDraft(draftFromRecord(next));
    setEditingId(next.id);
    flash("已基于上一副确认处方新建版本，旧镜度数已带入");
    document.getElementById("entry")?.scrollIntoView({ behavior: "smooth" });
  };

  const stats = useMemo(() => {
    const latest = new Map<string, LedgerRecord>();
    records.forEach((record) => {
      const current = latest.get(record.rootId);
      if (!current || record.version > current.version) latest.set(record.rootId, record);
    });
    const active = Array.from(latest.values());
    return {
      customers: latest.size,
      change: active.filter((record) => record.disposition === "change").length,
      review: active.filter((record) => record.disposition === "retain").length,
      pending: active.filter((record) => record.disposition === "pending").length,
    };
  }, [records]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">hxwl-11 · 验光核对台账</p>
          <h1>旧镜度数与本次验光核对</h1>
          <p className="subtitle">
            旧镜与本次验光分开记录，门店按统一规则判断是否换镜；命中项保留，缺项判无法判断。
            确认换镜后核对与处方固定，后续调整新建版本，数据本地持久保存。
          </p>
        </div>
        <div className="stack-card">
          <span>换镜判断规则</span>
          <strong>
            球镜或柱镜相差 ≥ {SPHERE_THRESHOLD.toFixed(2)}D；
            或原柱镜 ≥ {AXIS_CYLINDER_MIN.toFixed(2)}D 且轴位差 &gt; {AXIS_THRESHOLD}°
          </strong>
          <p className="rule-note">
            （柱镜阈值 {CYLINDER_THRESHOLD.toFixed(2)}D；空值不作 0，不参与变化计算）
          </p>
        </div>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <span>在档顾客</span>
          <strong>{stats.customers}</strong>
          <i className="status-ok" />
        </article>
        <article className="metric-card">
          <span>待核对</span>
          <strong>{stats.pending}</strong>
          <i className="status-watch" />
        </article>
        <article className="metric-card">
          <span>暂不换镜 · 待复查</span>
          <strong>{stats.review}</strong>
          <i className="status-danger" />
        </article>
        <article className="metric-card">
          <span>已确认换镜</span>
          <strong>{stats.change}</strong>
          <i className="status-ok" />
        </article>
      </section>

      <EntryForm
        value={draft}
        onChange={setDraft}
        onSave={handleSave}
        onReset={() => {
          setDraft(emptyDraft());
          setEditingId(null);
        }}
        editing={editingId !== null}
      />

      <LedgerList
        records={records}
        onEdit={handleEdit}
        onRetain={handleRetain}
        onChange={handleChange}
        onPending={handlePending}
        onNextVersion={handleNextVersion}
      />

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </main>
  );
}

export default App;
