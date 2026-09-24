import type { DraftInput, EyePair, LedgerEntry, Refraction } from "../types";
import { emptyRefraction, evaluate } from "./rules";

const STORAGE_KEY = "hxwl11.ledger.v1";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- 保存层：与页面无关，重开页面结果仍在 ----

export function loadEntries(): LedgerEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = seedEntries();
      persistEntries(seed);
      return seed;
    }
    const parsed = JSON.parse(raw) as LedgerEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistEntries(entries: LedgerEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // 存储不可用时仅影响持久化，不阻断本次录入
  }
}

// ---- 版本链：同一台账编号，确认换镜后调整走新版本 ----

function nextEntryNo(existing: LedgerEntry[]): string {
  const year = new Date().getFullYear();
  const nums = existing
    .map((e) => Number(e.entryNo.split("-")[1]))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 100) + 1;
  return `TZ-${next}-${year}`;
}

export function createEntry(input: DraftInput, existing: LedgerEntry[]): LedgerEntry {
  const now = new Date().toISOString();
  const id = uid();
  return {
    id,
    entryNo: nextEntryNo(existing),
    version: 1,
    rootId: id,
    parentId: null,
    customer: input.customer.trim(),
    examDate: input.examDate,
    note: input.note.trim(),
    oldLens: input.oldLens,
    current: input.current,
    evaluation: evaluate(input.oldLens, input.current),
    disposition: "pending",
    reviewDate: "",
    confirmedAt: null,
    prescription: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** 在已有版本基础上新建调整版本：旧镜沿用已固定处方，本次验光清空重验 */
export function createNextVersion(base: LedgerEntry): LedgerEntry {
  if (base.disposition !== "confirmed" || !base.prescription) {
    throw new Error("只有已确认换镜的台账才能新建版本");
  }
  const now = new Date().toISOString();
  const blank: EyePair<Refraction> = { OD: emptyRefraction(), OS: emptyRefraction() };
  // 深拷贝固定处方，新版本表单改动不影响上一版留档
  const carried: EyePair<Refraction> = JSON.parse(JSON.stringify(base.prescription));
  return {
    id: uid(),
    entryNo: base.entryNo,
    version: base.version + 1,
    rootId: base.rootId,
    parentId: base.id,
    customer: base.customer,
    examDate: "",
    note: "",
    oldLens: carried, // 旧镜 = 上次固定处方（快照副本）
    current: blank,
    evaluation: evaluate(base.prescription, blank),
    disposition: "pending",
    reviewDate: "",
    confirmedAt: null,
    prescription: null,
    createdAt: now,
    updatedAt: now,
  };
}

// ---- 首次打开时的演示台账 ----

function r(sphere: string, cylinder: string, axis: string): Refraction {
  return { sphere, cylinder, axis };
}

function seedEntries(): LedgerEntry[] {
  const now = "2026-09-20T09:00:00.000Z";

  const v1Old: EyePair<Refraction> = {
    OD: r("-2.00", "-0.50", "180"),
    OS: r("-1.75", "-0.75", "170"),
  };
  const v1Current: EyePair<Refraction> = {
    OD: r("-2.75", "-1.00", "5"),
    OS: r("-2.00", "-0.75", "175"),
  };

  const v1: LedgerEntry = {
    id: uid(),
    entryNo: "TZ-101-2026",
    version: 1,
    rootId: "",
    parentId: null,
    customer: "Patient-032",
    examDate: "2026-09-12",
    note: "儿童近视复查，家长主诉看黑板吃力",
    oldLens: v1Old,
    current: v1Current,
    evaluation: evaluate(v1Old, v1Current),
    disposition: "confirmed",
    reviewDate: "",
    confirmedAt: now,
    prescription: v1Current,
    createdAt: now,
    updatedAt: now,
  };
  v1.rootId = v1.id;

  const v2Current: EyePair<Refraction> = {
    OD: r("-3.00", "-1.00", "10"),
    OS: { ...emptyRefraction() },
  };
  const v2: LedgerEntry = {
    id: uid(),
    entryNo: v1.entryNo,
    version: 2,
    rootId: v1.rootId,
    parentId: v1.id,
    customer: "Patient-032",
    examDate: "2026-09-22",
    note: "戴镜两周复查，左眼本次验光单未带回",
    oldLens: v1Current,
    current: v2Current,
    evaluation: evaluate(v1Current, v2Current),
    disposition: "pending",
    reviewDate: "",
    confirmedAt: null,
    prescription: null,
    createdAt: "2026-09-22T03:30:00.000Z",
    updatedAt: "2026-09-22T03:30:00.000Z",
  };

  const kOld: EyePair<Refraction> = {
    OD: r("-1.50", "0.00", ""),
    OS: r("-1.50", "0.00", ""),
  };
  const kCurrent: EyePair<Refraction> = {
    OD: r("-1.75", "0.00", ""),
    OS: r("-1.50", "0.00", ""),
  };
  const keep: LedgerEntry = {
    id: uid(),
    entryNo: "TZ-102-2026",
    version: 1,
    rootId: "",
    parentId: null,
    customer: "Patient-144",
    examDate: "2026-09-18",
    note: "散光复查，主诉眼疲劳，试戴无不适",
    oldLens: kOld,
    current: kCurrent,
    evaluation: evaluate(kOld, kCurrent),
    disposition: "keep",
    reviewDate: "2026-12-18",
    confirmedAt: null,
    prescription: null,
    createdAt: "2026-09-18T08:10:00.000Z",
    updatedAt: "2026-09-18T08:10:00.000Z",
  };
  keep.rootId = keep.id;

  const uOld: EyePair<Refraction> = {
    OD: r("-3.50", "-1.25", "20"),
    OS: r("-3.25", "-1.00", "160"),
  };
  const uCurrent: EyePair<Refraction> = {
    OD: r("-3.50", "", "20"),
    OS: r("-3.25", "-1.00", ""),
  };
  const unknown: LedgerEntry = {
    id: uid(),
    entryNo: "TZ-103-2026",
    version: 1,
    rootId: "",
    parentId: null,
    customer: "Patient-081",
    examDate: "2026-09-23",
    note: "渐进片初配，验光单柱镜/轴位尚未补全",
    oldLens: uOld,
    current: uCurrent,
    evaluation: evaluate(uOld, uCurrent),
    disposition: "pending",
    reviewDate: "",
    confirmedAt: null,
    prescription: null,
    createdAt: "2026-09-23T02:00:00.000Z",
    updatedAt: "2026-09-23T02:00:00.000Z",
  };
  unknown.rootId = unknown.id;

  return [unknown, keep, v2, v1];
}
