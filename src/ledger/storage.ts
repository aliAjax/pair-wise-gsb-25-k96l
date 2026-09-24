// 保存层：localStorage 持久化，与页面、规则、模型解耦
// 重开浏览器/页面后台账仍在；存储损坏时安全回退到初始台账。

import { seedRecords } from "./seed";
import type { LedgerRecord } from "./types";

const STORAGE_KEY = "hxwl-11.optometry-ledger.v1";

function isRecord(value: unknown): value is LedgerRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.rootId === "string" &&
    typeof record.version === "number" &&
    typeof record.customer === "string" &&
    typeof record.oldPair === "object" &&
    typeof record.newPair === "object" &&
    typeof record.result === "object" &&
    typeof record.disposition === "string"
  );
}

/** 读取全部台账；首次打开写入示例台账 */
export function loadRecords(): LedgerRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      persist(seedRecords);
      return seedRecords;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isRecord)) {
      return seedRecords;
    }
    return parsed as LedgerRecord[];
  } catch {
    return seedRecords;
  }
}

function persist(records: LedgerRecord[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/** 保存全部台账（数据变化后统一调用） */
export function saveRecords(records: LedgerRecord[]): void {
  try {
    persist(records);
  } catch {
    // 隐私模式或配额受限时退化为内存态，不影响本次核对
  }
}

export function clearRecords(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
