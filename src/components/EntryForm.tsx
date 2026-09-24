import { useMemo, useState } from "react";
import type {
  Disposition,
  DraftInput,
  EyePair,
  EyeSide,
  LedgerEntry,
  Refraction,
} from "../types";
import {
  EYE_NAME,
  emptyRefraction,
  evaluate,
  eyeComplete,
  formatRefraction,
  parseAxis,
  parseDiopter,
} from "../lib/rules";

const EYES: EyeSide[] = ["OD", "OS"];

interface Props {
  base: LedgerEntry | null;
  today: string;
  onSave: (
    input: DraftInput,
    disposition: Disposition,
    reviewDate: string,
    base: LedgerEntry | null
  ) => { ok: boolean; error?: string };
  onNewVersion: (base: LedgerEntry) => void;
  onCancel: () => void;
}

function blankPair(): EyePair<Refraction> {
  return { OD: emptyRefraction(), OS: emptyRefraction() };
}

function inputInvalidDiopter(v: string): boolean {
  return v.trim() !== "" && parseDiopter(v) === null;
}
function inputInvalidAxis(v: string): boolean {
  return v.trim() !== "" && parseAxis(v) === null;
}

export default function EntryForm({ base, today, onSave, onNewVersion, onCancel }: Props) {
  const locked = base?.disposition === "confirmed";

  const [customer, setCustomer] = useState(base?.customer ?? "");
  const [examDate, setExamDate] = useState(base?.examDate ?? today);
  const [note, setNote] = useState(base?.note ?? "");
  const [oldLens, setOldLens] = useState<EyePair<Refraction>>(
    base ? base.oldLens : blankPair()
  );
  const [current, setCurrent] = useState<EyePair<Refraction>>(
    base ? base.current : blankPair()
  );
  const [disposition, setDisposition] = useState<Disposition>(base?.disposition ?? "pending");
  const [reviewDate, setReviewDate] = useState(base?.reviewDate ?? "");
  const [error, setError] = useState("");

  const live = useMemo(() => evaluate(oldLens, current), [oldLens, current]);

  const setField = (
    pair: EyePair<Refraction>,
    setter: (v: EyePair<Refraction>) => void,
    side: EyeSide,
    key: keyof Refraction,
    value: string
  ) => {
    setter({ ...pair, [side]: { ...pair[side], [key]: value } });
  };

  const handleSave = () => {
    setError("");
    const res = onSave({ customer, examDate, note, oldLens, current }, disposition, reviewDate, base);
    if (!res.ok) setError(res.error ?? "保存失败");
  };

  return (
    <section className="panel entry-panel">
      <div className="section-heading">
        <div>
          <p>核对台账</p>
          <h2>{base ? (locked ? "已确认处方（只读）" : "核对 / 修改记录") : "新增核对"}</h2>
          {base && (
            <p className="entry-meta">
              台账编号 {base.entryNo} · 第 {base.version} 版
            </p>
          )}
        </div>
        <div className="heading-actions">
          {locked && (
            <button className="primary-action" onClick={() => onNewVersion(base)}>
              后续调整 · 新建版本
            </button>
          )}
          <button onClick={onCancel}>{base ? "关闭" : "清空"}</button>
        </div>
      </div>

      <div className="field-grid head-fields">
        <label>
          <span>顾客编号 / 姓名</span>
          <input
            value={customer}
            disabled={locked}
            placeholder="如 Patient-032"
            onChange={(e) => setCustomer(e.target.value)}
          />
        </label>
        <label>
          <span>本次验光日期</span>
          <input
            type="date"
            value={examDate}
            disabled={locked}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </label>
        <label className="wide">
          <span>主诉 / 备注</span>
          <input
            value={note}
            disabled={locked}
            placeholder="门店经验判断依据可在此备注"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>

      <div className="eye-grid">
        {EYES.map((side) => {
          const eye = live.eyes[side];
          return (
            <div key={side} className={`eye-card verdict-${eye.verdict}`}>
              <div className="eye-card-head">
                <h3>{EYE_NAME[side]}</h3>
                <span className={`verdict-badge verdict-${eye.verdict}`}>
                  {eye.verdict === "change" && "建议换镜"}
                  {eye.verdict === "unknown" && "无法判断"}
                  {eye.verdict === "stable" && "度数稳定"}
                </span>
              </div>
              <table className="rx-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>球镜 DS</th>
                    <th>柱镜 DC</th>
                    <th>轴位 °</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>旧镜</th>
                    {(["sphere", "cylinder", "axis"] as const).map((k) => (
                      <td key={k}>
                        <input
                          value={oldLens[side][k]}
                          disabled={locked}
                          placeholder="缺项留空"
                          className={
                            k === "axis"
                              ? inputInvalidAxis(oldLens[side][k])
                                ? "invalid"
                                : ""
                              : inputInvalidDiopter(oldLens[side][k])
                              ? "invalid"
                              : ""
                          }
                          onChange={(e) =>
                            setField(oldLens, setOldLens, side, k, e.target.value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th>本次</th>
                    {(["sphere", "cylinder", "axis"] as const).map((k) => (
                      <td key={k}>
                        <input
                          value={current[side][k]}
                          disabled={locked}
                          placeholder="缺项留空"
                          className={
                            k === "axis"
                              ? inputInvalidAxis(current[side][k])
                                ? "invalid"
                                : ""
                              : inputInvalidDiopter(current[side][k])
                              ? "invalid"
                              : ""
                          }
                          onChange={(e) =>
                            setField(current, setCurrent, side, k, e.target.value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
              <ul className="rule-list">
                {eye.rules.map((r) => (
                  <li key={r.code} className={r.hit ? "rule-hit" : r.unknown ? "rule-unknown" : ""}>
                    <span className="rule-tag">
                      {r.hit ? "命中" : r.unknown ? "缺项" : r.applicable ? "未达" : "不适用"}
                    </span>
                    <span>{r.detail}</span>
                  </li>
                ))}
              </ul>
              {locked && base.prescription && (
                <p className="fixed-rx">
                  固定处方：{formatRefraction(base.prescription[side])}
                  {!eyeComplete(base.prescription[side]) && "（含缺项，需复核）"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className={`overall-banner verdict-${live.verdict}`}>
        <strong>核对结论：{live.summary.split("｜")[0]}</strong>
        <span>{live.summary.split("｜")[1]}</span>
      </div>

      {!locked && (
        <div className="save-bar">
          <div className="disposition-group">
            <label className={`radio-chip ${disposition === "pending" ? "active" : ""}`}>
              <input
                type="radio"
                name="disposition"
                checked={disposition === "pending"}
                onChange={() => setDisposition("pending")}
              />
              保存待核对
            </label>
            <label className={`radio-chip ${disposition === "keep" ? "active" : ""}`}>
              <input
                type="radio"
                name="disposition"
                checked={disposition === "keep"}
                onChange={() => setDisposition("keep")}
              />
              暂不换镜
            </label>
            <label className={`radio-chip confirm ${disposition === "confirmed" ? "active" : ""}`}>
              <input
                type="radio"
                name="disposition"
                checked={disposition === "confirmed"}
                onChange={() => setDisposition("confirmed")}
              />
              确认换镜（核对与处方固定）
            </label>
            {disposition === "keep" && (
              <label className="review-date">
                <span>复查日期</span>
                <input
                  type="date"
                  value={reviewDate}
                  min={today}
                  onChange={(e) => setReviewDate(e.target.value)}
                />
              </label>
            )}
          </div>
          <div className="save-actions">
            {error && <span className="form-error">{error}</span>}
            <button className="primary-action" onClick={handleSave}>
              保存台账
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
