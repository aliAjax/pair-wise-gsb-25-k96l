// 初始示例台账：覆盖“建议换镜”“暂无变化”“缺项无法判断”“版本链”四种情况

import { buildRecord, markChange, markRetain } from "./model";
import type { LedgerRecord, RefractionPair } from "./types";

function pair(od: string[], os: string[]): RefractionPair {
  const toRefraction = (values: string[]) => ({
    sphere: values[0],
    cylinder: values[1],
    axis: values[2],
  });
  return { OD: toRefraction(od), OS: toRefraction(os) };
}

// 案例一：球镜变化 + 左眼轴位变化，已确认换镜（处方固定）
const caseA = buildRecord(
  {
    customer: "Patient-032",
    examDate: "2026-09-18",
    note: "儿童近视半年复查，原镜磨损",
    oldPair: pair(
      ["-2.75", "-0.50", "180"],
      ["-2.50", "-0.75", "10"],
    ),
    newPair: pair(
      ["-3.50", "-0.50", "180"],
      ["-3.00", "-0.75", "30"],
    ),
  },
  { id: "seed-a-v2", rootId: "seed-a", version: 2 },
);

// 版本链：上一副已确认换镜的处方（旧版本，仅留档）
const caseAv1 = buildRecord(
  {
    customer: "Patient-032",
    examDate: "2026-03-14",
    note: "上一副处方留档",
    oldPair: pair(
      ["-2.00", "-0.50", "180"],
      ["-1.75", "-0.75", "10"],
    ),
    newPair: pair(
      ["-2.75", "-0.50", "180"],
      ["-2.50", "-0.75", "10"],
    ),
  },
  { id: "seed-a-v1", rootId: "seed-a", version: 1 },
);

// 案例二：变化均不足阈值，暂不换镜，已约复查
const caseB = buildRecord(
  {
    customer: "Patient-144",
    examDate: "2026-09-20",
    note: "散光复查，主诉偶有视疲劳",
    oldPair: pair(
      ["-1.50", "-0.50", "170"],
      ["-1.75", "-0.50", "10"],
    ),
    newPair: pair(
      ["-1.75", "-0.50", "175"],
      ["-1.75", "-0.50", "5"],
    ),
  },
  { id: "seed-b-v1", rootId: "seed-b", version: 1 },
);

// 案例三：旧镜数据未测全，缺项 → 无法判断
const caseC = buildRecord(
  {
    customer: "Patient-081",
    examDate: "2026-09-22",
    note: "渐进片初筛，旧镜参数门店待补测",
    oldPair: pair(
      ["", "", ""],
      ["+1.00", "", ""],
    ),
    newPair: pair(
      ["-0.50", "-0.25", "90"],
      ["+1.25", "-0.50", "85"],
    ),
  },
  { id: "seed-c-v1", rootId: "seed-c", version: 1 },
);

export const seedRecords: LedgerRecord[] = [
  markChange(caseA),
  caseAv1,
  markRetain(caseB, "2026-12-20"),
  caseC,
];
