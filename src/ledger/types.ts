// 验光核对台账的数据结构（数据层）

export type Eye = "OD" | "OS"; // 右眼 / 左眼

/** 单眼单次屈光参数：球镜、柱镜、轴位；空字符串表示缺项 */
export interface Refraction {
  sphere: string; // 球镜 DS
  cylinder: string; // 柱镜 DC
  axis: string; // 轴位（度）
}

/** 一眼一对：旧镜度数 + 本次验光 */
export type RefractionPair = Record<Eye, Refraction>;

export type RuleCode = "SPHERE" | "CYLINDER" | "AXIS";

/** 命中的换镜规则项，保存时保留 */
export interface HitItem {
  eye: Eye;
  rule: RuleCode;
  text: string;
}

/** 规则判断结果：建议换镜 / 度数无明显变化 / 无法判断（有缺项） */
export type Verdict = "CHANGE" | "KEEP" | "UNKNOWN";

export interface EyeEvaluation {
  verdict: Verdict;
  hits: HitItem[]; // 命中项
  missing: string[]; // 无法核对的缺项（含空值与非法值）
  diffs: {
    sphere: number | null;
    cylinder: number | null;
    axis: number | null;
  };
}

export interface PairEvaluation {
  OD: EyeEvaluation;
  OS: EyeEvaluation;
  verdict: Verdict;
  hits: HitItem[];
  missing: string[];
}

/** 门店处置：待核对 / 暂不换镜（填复查日期） / 已确认换镜（处方固定） */
export type Disposition = "pending" | "retain" | "change";

/** 表单草稿（未保存前） */
export interface Draft {
  customer: string;
  examDate: string;
  note: string;
  oldPair: RefractionPair;
  newPair: RefractionPair;
}

/** 台账记录 = 一条已核对版本；确认换镜后锁定，后续调整新建版本 */
export interface LedgerRecord {
  id: string;
  rootId: string; // 同一顾客同一副眼镜的版本链
  version: number;
  customer: string;
  examDate: string;
  note: string;
  oldPair: RefractionPair;
  newPair: RefractionPair;
  result: PairEvaluation;
  disposition: Disposition;
  reviewDate: string; // 暂不换镜时的复查日期
  locked: boolean;
  createdAt: string;
  confirmedAt?: string;
}
