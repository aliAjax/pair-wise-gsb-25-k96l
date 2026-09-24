// 领域模型：旧镜度数与本次验光分开记录，核对结论与处方独立留档

export type EyeSide = "OD" | "OS";

/** 一只眼的一组屈光数据，空字符串表示缺项（不得当作 0 参与判断） */
export interface Refraction {
  sphere: string; // 球镜 DS
  cylinder: string; // 柱镜 DC
  axis: string; // 轴位 °
}

export interface EyePair<T> {
  OD: T;
  OS: T;
}

/** 命中的换镜规则编码 */
export type HitCode = "sphere050" | "cylinder050" | "axis15";

export type Verdict = "change" | "unknown" | "stable";

/** 单条规则的判定结果（保存时随台账一起快照留档） */
export interface RuleResult {
  code: HitCode;
  name: string;
  hit: boolean; // 是否命中
  unknown: boolean; // 缺项导致无法判断
  applicable: boolean; // 规则是否适用（如原柱镜低于 0.50D 时轴位规则不适用）
  detail: string;
  missingFields: string[]; // 无法判断时涉及的缺项
}

export interface EyeEvaluation {
  side: EyeSide;
  verdict: Verdict;
  rules: RuleResult[];
  hits: HitCode[];
  missingRules: HitCode[];
}

export interface Evaluation {
  eyes: EyePair<EyeEvaluation>;
  verdict: Verdict;
  summary: string;
}

/** 台账处理状态：待核对 / 暂不换镜（等复查） / 已确认换镜（处方固定） */
export type Disposition = "pending" | "keep" | "confirmed";

export interface LedgerEntry {
  id: string;
  entryNo: string; // 同一顾客同一副眼镜的台账编号，跨版本不变
  version: number; // 版本号，确认换镜后再调整需新建版本
  rootId: string; // 版本链根记录 id
  parentId: string | null; // 上一版本 id

  customer: string;
  examDate: string; // 本次验光日期
  note: string;

  oldLens: EyePair<Refraction>; // 旧镜度数
  current: EyePair<Refraction>; // 本次验光

  evaluation: Evaluation; // 保存时的核对结论快照（含命中项）

  disposition: Disposition;
  reviewDate: string; // 暂不换镜时填写的复查日期
  confirmedAt: string | null; // 确认换镜时间
  prescription: EyePair<Refraction> | null; // 确认后固定的处方

  createdAt: string;
  updatedAt: string;
}

/** 表单录入内容 */
export interface DraftInput {
  customer: string;
  examDate: string;
  note: string;
  oldLens: EyePair<Refraction>;
  current: EyePair<Refraction>;
}
