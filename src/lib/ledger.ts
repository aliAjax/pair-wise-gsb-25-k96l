import type { Disposition, DraftInput, EyePair, LedgerEntry, Refraction } from "../types";
import { evaluate, pairComplete } from "./rules";
import { createEntry } from "./storage";

export interface SaveRequest {
  input: DraftInput;
  disposition: Disposition;
  reviewDate: string;
}

export interface SaveResult {
  ok: boolean;
  error?: string;
  entry?: LedgerEntry;
}

function clonePair(p: EyePair<Refraction>): EyePair<Refraction> {
  return JSON.parse(JSON.stringify(p));
}

/** 按门店处理方式落库；数据与规则结论在保存时一并快照 */
export function saveEntry(
  req: SaveRequest,
  base: LedgerEntry | null,
  existing: LedgerEntry[],
  now: string
): SaveResult {
  const { disposition, reviewDate } = req;
  const input: DraftInput = {
    ...req.input,
    customer: req.input.customer.trim(),
    note: req.input.note.trim(),
    oldLens: clonePair(req.input.oldLens),
    current: clonePair(req.input.current),
  };

  // 已确认换镜的记录为固定台账，任何修改只能走新版本
  if (base && base.disposition === "confirmed") {
    return { ok: false, error: "该台账已确认换镜，核对与处方已固定；后续调整请新建版本" };
  }

  if (!input.customer) return { ok: false, error: "请填写顾客编号/姓名" };
  if (!input.examDate) return { ok: false, error: "请填写本次验光日期" };

  if (disposition === "keep" && !reviewDate) {
    return { ok: false, error: "暂不换镜需填写复查日期" };
  }

  if (disposition === "confirmed") {
    // 确认换镜 = 处方固定，缺项不得确认
    if (!pairComplete(input.oldLens) || !pairComplete(input.current)) {
      return { ok: false, error: "存在缺项，无法确认换镜；请先补全双眼旧镜与本次三项数据" };
    }
  }

  const common = {
    customer: input.customer,
    examDate: input.examDate,
    note: input.note,
    oldLens: input.oldLens,
    current: input.current,
    evaluation: evaluate(input.oldLens, input.current),
    disposition,
    reviewDate: disposition === "keep" ? reviewDate : "",
    confirmedAt: disposition === "confirmed" ? now : null,
    // 处方独立留一份快照，不与本次验光对象共享引用
    prescription: disposition === "confirmed" ? clonePair(input.current) : null,
  };

  const entry: LedgerEntry = base
    ? { ...base, ...common, updatedAt: now }
    : { ...createEntry(input, existing), ...common, updatedAt: now };

  return { ok: true, entry };
}
