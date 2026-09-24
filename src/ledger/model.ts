// 台账模型层：建档、编辑、门店处置、版本派生；不直接接触存储与 DOM

import { evaluatePair } from "./rules";
import type {
  Draft,
  Eye,
  LedgerRecord,
  Refraction,
  RefractionPair,
} from "./types";

export function emptyRefraction(): Refraction {
  return { sphere: "", cylinder: "", axis: "" };
}

export function emptyPair(): RefractionPair {
  return { OD: emptyRefraction(), OS: emptyRefraction() };
}

export function emptyDraft(): Draft {
  return {
    customer: "",
    examDate: "",
    note: "",
    oldPair: emptyPair(),
    newPair: emptyPair(),
  };
}

export function clonePair(pair: RefractionPair): RefractionPair {
  const eyes: Eye[] = ["OD", "OS"];
  const copy = {} as RefractionPair;
  eyes.forEach((eye) => {
    copy[eye] = { ...pair[eye] };
  });
  return copy;
}

export function draftFromRecord(record: LedgerRecord): Draft {
  return {
    customer: record.customer,
    examDate: record.examDate,
    note: record.note,
    oldPair: clonePair(record.oldPair),
    newPair: clonePair(record.newPair),
  };
}

export function createId(): string {
  return `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 由表单草稿生成一条记录；结果在保存时固定写入，后续不因规则调整而漂移 */
export function buildRecord(
  draft: Draft,
  options: { id?: string; rootId?: string; version?: number } = {},
): LedgerRecord {
  const now = new Date().toISOString();
  return {
    id: options.id ?? createId(),
    rootId: options.rootId ?? createId(),
    version: options.version ?? 1,
    customer: draft.customer.trim(),
    examDate: draft.examDate,
    note: draft.note.trim(),
    oldPair: clonePair(draft.oldPair),
    newPair: clonePair(draft.newPair),
    result: evaluatePair(draft.oldPair, draft.newPair),
    disposition: "pending",
    reviewDate: "",
    locked: false,
    createdAt: now,
  };
}

/** 暂不换镜：核对结果保留，填写复查日期，记录仍可继续核对/修订 */
export function markRetain(record: LedgerRecord, reviewDate: string): LedgerRecord {
  return {
    ...record,
    disposition: "retain",
    reviewDate,
    confirmedAt: undefined,
    locked: false,
  };
}

/** 确认换镜：核对结果与处方固定，之后只能新建版本调整 */
export function markChange(record: LedgerRecord): LedgerRecord {
  return {
    ...record,
    disposition: "change",
    reviewDate: "",
    locked: true,
    confirmedAt: new Date().toISOString(),
  };
}

/** 回到“待核对”状态（仍在核对期时允许改主意） */
export function markPending(record: LedgerRecord): LedgerRecord {
  return {
    ...record,
    disposition: "pending",
    reviewDate: "",
    confirmedAt: undefined,
    locked: false,
  };
}

/**
 * 确认换镜后的后续调整：以已确认处方为“旧镜”开新版本。
 * 本次验光留空，回到待核对状态。
 */
export function createNextVersion(record: LedgerRecord): LedgerRecord {
  return {
    ...buildRecord(
      {
        customer: record.customer,
        examDate: "",
        note: "",
        oldPair: clonePair(record.newPair),
        newPair: emptyPair(),
      },
      { rootId: record.rootId, version: record.version + 1 },
    ),
  };
}
