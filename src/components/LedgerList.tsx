import type { EyePair, LedgerEntry, Refraction } from "../types";
import { EYE_NAME, formatRefraction } from "../lib/rules";

interface Props {
  entries: LedgerEntry[];
  selectedId: string | null;
  today: string;
  onSelect: (id: string) => void;
  onNewVersion: (base: LedgerEntry) => void;
}

const DISPOSITION_LABEL: Record<LedgerEntry["disposition"], string> = {
  pending: "待核对",
  keep: "暂不换镜",
  confirmed: "已确认换镜",
};

function verdictLabel(v: LedgerEntry["evaluation"]["verdict"]): string {
  return v === "change" ? "建议换镜" : v === "unknown" ? "无法判断" : "度数稳定";
}

function EyeRows({ label, data }: { label: string; data: EyePair<Refraction> }) {
  return (
    <div className="rx-rows">
      <span className="rx-label">{label}</span>
      <div>
        {(["OD", "OS"] as const).map((side) => (
          <p key={side}>
            <em>{EYE_NAME[side]}</em>
            {formatRefraction(data[side])}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function LedgerList({ entries, selectedId, today, onSelect, onNewVersion }: Props) {
  // 按台账编号（版本链）分组
  const groups = new Map<string, LedgerEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.entryNo) ?? [];
    list.push(e);
    groups.set(e.entryNo, list);
  }
  const chains = [...groups.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.version - b.version);
      return sorted;
    })
    .sort((a, b) => {
      const latestA = a[a.length - 1].updatedAt;
      const latestB = b[b.length - 1].updatedAt;
      return latestA < latestB ? 1 : latestA > latestB ? -1 : 0;
    });

  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 7);
  const dueLimit = dueDate.toISOString().slice(0, 10);

  return (
    <section className="panel ledger-panel">
      <div className="section-heading">
        <div>
          <p>台账</p>
          <h2>核对记录（{chains.length} 个台账 / {entries.length} 条版本）</h2>
        </div>
      </div>

      <div className="chain-list">
        {chains.map((chain) =>
          chain.map((entry) => {
            const active = entry.id === selectedId;
            const overdue =
              entry.disposition === "keep" && entry.reviewDate !== "" && entry.reviewDate < today;
            const dueSoon =
              entry.disposition === "keep" &&
              entry.reviewDate !== "" &&
              !overdue &&
              entry.reviewDate <= dueLimit; // 仅用于样式提示
            const ev = entry.evaluation;
            return (
              <article
                key={entry.id}
                className={`ledger-card verdict-${ev.verdict} ${active ? "active" : ""}`}
                onClick={() => onSelect(entry.id)}
              >
                <div className="ledger-main">
                  <div className="ledger-card-head">
                    <div>
                      <h3>{entry.customer}</h3>
                      <p className="no-line">
                        {entry.entryNo} · v{entry.version}
                        {chain.length > 1 && (
                          <span className="chain-hint">（共 {chain.length} 版）</span>
                        )}
                      </p>
                    </div>
                    <div className="tag-row">
                      <span className={`tag verdict-${ev.verdict}`}>{verdictLabel(ev.verdict)}</span>
                      <span className={`tag disp-${entry.disposition}`}>
                        {DISPOSITION_LABEL[entry.disposition]}
                      </span>
                      {overdue && <span className="tag overdue">复查逾期</span>}
                      {dueSoon && <span className="tag due">7日内复查</span>}
                    </div>
                  </div>

                  <div className="ledger-rx">
                    <EyeRows label="旧镜" data={entry.oldLens} />
                    <EyeRows label="本次" data={entry.current} />
                    {entry.prescription && <EyeRows label="固定处方" data={entry.prescription} />}
                  </div>

                  {ev.verdict !== "stable" && (
                    <ul className="hit-list">
                      {(["OD", "OS"] as const).map((side) =>
                        ev.eyes[side].rules
                          .filter((r) => r.hit || r.unknown)
                          .map((r) => (
                            <li
                              key={side + r.code}
                              className={r.hit ? "hit" : "missing"}
                            >
                              {EYE_NAME[side]} · {r.hit ? `命中「${r.name}」` : `缺项：${r.missingFields.join("、") || r.name}`}
                            </li>
                          ))
                      )}
                    </ul>
                  )}

                  {entry.note && <p className="ledger-note">备注：{entry.note}</p>}

                  <div className="ledger-foot">
                    <span>验光日期：{entry.examDate || "—"}</span>
                    {entry.disposition === "keep" && (
                      <span className={overdue ? "foot-alert" : ""}>
                        复查日期：{entry.reviewDate || "未填"}
                      </span>
                    )}
                    {entry.confirmedAt && (
                      <span>确认时间：{entry.confirmedAt.slice(0, 10)}</span>
                    )}
                    <span className="foot-spacer" />
                    {entry.disposition === "confirmed" && (
                      <button
                        className="mini-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewVersion(entry);
                        }}
                      >
                        新建版本
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
