import { useMemo } from "react";
import { evaluatePair } from "../ledger/rules";
import type { Draft, Eye, Refraction } from "../ledger/types";

interface EntryFormProps {
  value: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onReset: () => void;
  editing: boolean;
}

const EYES: { key: Eye; label: string }[] = [
  { key: "OD", label: "右眼 OD" },
  { key: "OS", label: "左眼 OS" },
];

const FIELDS: { key: keyof Refraction; label: string; placeholder: string; hint: string }[] = [
  { key: "sphere", label: "球镜 DS", placeholder: "如 -2.75", hint: "0.25D 步进" },
  { key: "cylinder", label: "柱镜 DC", placeholder: "如 -0.50", hint: "可留空" },
  { key: "axis", label: "轴位", placeholder: "1–180", hint: "度" },
];

function EyeBlock({
  eye,
  title,
  value,
  onChange,
}: {
  eye: Eye;
  title: string;
  value: Draft["oldPair"]["OD"];
  onChange: (next: Refraction) => void;
}) {
  return (
    <div className="eye-block">
      <h4>{title}</h4>
      <div className="eye-fields">
        {FIELDS.map((field) => (
          <label key={`${eye}-${field.key}`}>
            <span>{field.label}</span>
            <input
              inputMode="decimal"
              value={value[field.key]}
              placeholder={field.placeholder}
              onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
            />
            <em>{field.hint}</em>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function EntryForm({ value, onChange, onSave, onReset, editing }: EntryFormProps) {
  const preview = useMemo(
    () => evaluatePair(value.oldPair, value.newPair),
    [value.oldPair, value.newPair],
  );

  const updatePair = (side: "oldPair" | "newPair", eye: Eye, next: Refraction) => {
    onChange({ ...value, [side]: { ...value[side], [eye]: next } });
  };

  return (
    <section className="panel entry-panel" id="entry">
      <div className="section-heading">
        <div>
          <p>核对台账</p>
          <h2>{editing ? "修订核对记录" : "新增验光核对"}</h2>
        </div>
        <div className="heading-actions">
          <button type="button" onClick={onReset}>
            {editing ? "放弃修订" : "清空"}
          </button>
          <button type="button" className="primary-action" onClick={onSave}>
            {editing ? "保存修订" : "保存核对"}
          </button>
        </div>
      </div>

      <div className="form-meta">
        <label>
          <span>顾客 / 档案号</span>
          <input
            value={value.customer}
            placeholder="如 Patient-032"
            onChange={(event) => onChange({ ...value, customer: event.target.value })}
          />
        </label>
        <label>
          <span>验光日期</span>
          <input
            type="date"
            value={value.examDate}
            onChange={(event) => onChange({ ...value, examDate: event.target.value })}
          />
        </label>
        <label className="meta-note">
          <span>备注</span>
          <input
            value={value.note}
            placeholder="主诉、用眼场景等（选填）"
            onChange={(event) => onChange({ ...value, note: event.target.value })}
          />
        </label>
      </div>

      <div className="pair-grid">
        <div className="pair-column pair-old">
          <h3>旧镜度数</h3>
          {EYES.map((eye) => (
            <EyeBlock
              key={`old-${eye.key}`}
              eye={eye.key}
              title={eye.label}
              value={value.oldPair[eye.key]}
              onChange={(next) => updatePair("oldPair", eye.key, next)}
            />
          ))}
        </div>
        <div className="pair-column pair-new">
          <h3>本次验光</h3>
          {EYES.map((eye) => (
            <EyeBlock
              key={`new-${eye.key}`}
              eye={eye.key}
              title={eye.label}
              value={value.newPair[eye.key]}
              onChange={(next) => updatePair("newPair", eye.key, next)}
            />
          ))}
        </div>
      </div>

      <VerdictPreview preview={preview} />
    </section>
  );
}

function VerdictPreview({ preview }: { preview: ReturnType<typeof evaluatePair> }) {
  const badgeClass =
    preview.verdict === "CHANGE"
      ? "verdict-badge verdict-change"
      : preview.verdict === "KEEP"
        ? "verdict-badge verdict-keep"
        : "verdict-badge verdict-unknown";

  const text =
    preview.verdict === "CHANGE"
      ? "建议换镜"
      : preview.verdict === "KEEP"
        ? "度数无明显变化，可暂不换镜"
        : "无法判断（存在缺项）";

  return (
    <div className={`verdict-preview verdict-preview-${preview.verdict.toLowerCase()}`}>
      <div className="verdict-head">
        <span className={badgeClass}>{text}</span>
        <span className="verdict-tip">保存后核对结果随记录固定</span>
      </div>
      {preview.hits.length > 0 && (
        <ul className="hit-list">
          {preview.hits.map((hit) => (
            <li key={`${hit.eye}-${hit.rule}`}>{hit.text}</li>
          ))}
        </ul>
      )}
      {preview.missing.length > 0 && (
        <p className="missing-list">缺项（无法核对，不作变化处理）：{preview.missing.join("、")}</p>
      )}
      {preview.verdict === "KEEP" && (
        <p className="missing-list">
          双眼球镜、柱镜相差均不足 0.50D，原有散光轴位变化不超过 15°。
        </p>
      )}
    </div>
  );
}
