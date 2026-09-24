import { useState } from "react";
import type { LedgerRecord } from "../ledger/types";

interface VersionCardProps {
  record: LedgerRecord;
  chainLength: number;
  onEdit: (record: LedgerRecord) => void;
  onRetain: (record: LedgerRecord, reviewDate: string) => void;
  onChange: (record: LedgerRecord) => void;
  onPending: (record: LedgerRecord) => void;
  onNextVersion: (record: LedgerRecord) => void;
}

function Cell({ value, diff, unit = "D" }: { value: string; diff?: number | null; unit?: "D" | "°" }) {
  const empty = value.trim() === "";
  const shown = diff === null || diff === undefined || diff === 0 ? null : unit === "°" ? `${diff}°` : `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`;
  return (
    <div className={empty ? "cell-empty" : ""}>
      {empty ? "—" : value}
      {shown && <em className={diff! > 0 ? "diff-up" : "diff-down"}>{shown}</em>}
    </div>
  );
}

const VERDICT_META = {
  CHANGE: { text: "建议换镜", className: "verdict-change" },
  KEEP: { text: "暂无明显变化", className: "verdict-keep" },
  UNKNOWN: { text: "无法判断", className: "verdict-unknown" },
} as const;

const DISPOSITION_META = {
  pending: { text: "待核对", className: "disp-pending" },
  retain: { text: "暂不换镜 · 待复查", className: "disp-retain" },
  change: { text: "已确认换镜 · 处方固定", className: "disp-change" },
} as const;

export default function VersionCard({
  record,
  chainLength,
  onEdit,
  onRetain,
  onChange,
  onPending,
  onNextVersion,
}: VersionCardProps) {
  const [reviewDate, setReviewDate] = useState(record.reviewDate);
  const verdict = VERDICT_META[record.result.verdict];
  const disposition = DISPOSITION_META[record.disposition];
  const eyes = [
    { key: "OD" as const, label: "右眼" },
    { key: "OS" as const, label: "左眼" },
  ];

  return (
    <article className={`version-card ${record.locked ? "is-locked" : ""}`}>
      <header className="version-head">
        <div className="version-id">
          <span className="version-tag">v{record.version}</span>
          <span className={`disp-badge ${disposition.className}`}>{disposition.text}</span>
          {record.locked && <span className="lock-tag">已锁定</span>}
        </div>
        <div className="version-meta">
          <span>验光日期：{record.examDate || "未填"}</span>
          {record.confirmedAt && (
            <span>确认时间：{record.confirmedAt.slice(0, 10)}</span>
          )}
          {record.disposition === "retain" && record.reviewDate && (
            <span className="review-date">复查日期：{record.reviewDate}</span>
          )}
        </div>
      </header>

      <div className="data-table" role="table">
        <div className="data-row data-head" role="row">
          <span />
          <span>旧镜球镜</span>
          <span>旧镜柱镜</span>
          <span>旧镜轴位</span>
          <span>本次球镜</span>
          <span>本次柱镜</span>
          <span>本次轴位</span>
        </div>
        {eyes.map((eye) => {
          const oldLens = record.oldPair[eye.key];
          const current = record.newPair[eye.key];
          const result = record.result[eye.key];
          return (
            <div className="data-row" role="row" key={eye.key}>
              <span className="eye-name">{eye.label}</span>
              <Cell value={oldLens.sphere} />
              <Cell value={oldLens.cylinder} />
              <Cell value={oldLens.axis} />
              <Cell value={current.sphere} diff={result.diffs.sphere} />
              <Cell value={current.cylinder} diff={result.diffs.cylinder} />
              <Cell value={current.axis} diff={result.diffs.axis} unit="°" />
            </div>
          );
        })}
      </div>

      <div className={`card-verdict ${verdict.className}`}>
        <strong>{verdict.text}</strong>
        {record.result.hits.length > 0 && (
          <ul className="hit-list">
            {record.result.hits.map((hit) => (
              <li key={`${hit.eye}-${hit.rule}`}>{hit.text}</li>
            ))}
          </ul>
        )}
        {record.result.missing.length > 0 && (
          <p className="missing-list">
            缺项无法核对：{record.result.missing.join("、")}（空值未按变化处理）
          </p>
        )}
        {record.note && <p className="record-note">备注：{record.note}</p>}
      </div>

      <footer className="version-actions">
        {record.locked ? (
          <>
            <p className="lock-hint">核对与处方已固定；如需调整请基于该版本新建。</p>
            <button type="button" onClick={() => onNextVersion(record)}>
              新建调整版本
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onEdit(record)}>
              修订
            </button>
            <div className="retain-box">
              <label>
                <span>暂不换镜 · 复查日期</span>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={!reviewDate}
                onClick={() => onRetain(record, reviewDate)}
              >
                暂不换镜
              </button>
            </div>
            <button
              type="button"
              className="primary-action"
              onClick={() => onChange(record)}
            >
              确认换镜
            </button>
            {record.disposition !== "pending" && (
              <button type="button" onClick={() => onPending(record)}>
                重新核对
              </button>
            )}
          </>
        )}
      </footer>

      {chainLength > 1 && record.locked && (
        <p className="chain-hint">该处方共 {chainLength} 个核对版本</p>
      )}
    </article>
  );
}
