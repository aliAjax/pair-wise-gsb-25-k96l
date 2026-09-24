import type {
  EyePair,
  EyeSide,
  Evaluation,
  EyeEvaluation,
  HitCode,
  Refraction,
  RuleResult,
  Verdict,
} from "../types";

// ---- 规则阈值（规则层独立，页面不内置魔法数字） ----
export const SPHERE_THRESHOLD = 0.5; // 球镜相差 ≥ 0.50D
export const CYLINDER_THRESHOLD = 0.5; // 柱镜相差 ≥ 0.50D
export const AXIS_THRESHOLD = 15; // 轴位相差 > 15 度
export const OLD_CYL_REQUIRED = 0.5; // 原柱镜不低于 0.50D 才看轴位
export const AXIS_MIN = 0;
export const AXIS_MAX = 180;
export const DIOPTER_MIN = -30;
export const DIOPTER_MAX = 30;

export const EYE_NAME: Record<EyeSide, string> = {
  OD: "右眼",
  OS: "左眼",
};

/** 解析屈光度数：空串 = 缺项（null），绝不当作 0 */
export function parseDiopter(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const v = Number(t);
  if (!Number.isFinite(v)) return null;
  if (v < DIOPTER_MIN || v > DIOPTER_MAX) return null;
  return v;
}

/** 解析轴位 0–180 */
export function parseAxis(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const v = Number(t);
  if (!Number.isFinite(v)) return null;
  if (v < AXIS_MIN || v > AXIS_MAX) return null;
  return v;
}

export function emptyRefraction(): Refraction {
  return { sphere: "", cylinder: "", axis: "" };
}

/** 轴位环形差：180 与 0 相邻 */
export function axisDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 180;
  return d > 90 ? 180 - d : d;
}

export function formatD(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}D`;
}

export function formatRefraction(r: Refraction): string {
  const s = parseDiopter(r.sphere);
  const c = parseDiopter(r.cylinder);
  const a = parseAxis(r.axis);
  const parts: string[] = [];
  if (s !== null) parts.push(`${formatD(s)}S`);
  if (c !== null) parts.push(`${formatD(c)}C`);
  if (a !== null) parts.push(`${a}°`);
  return parts.length ? parts.join(" / ") : "—";
}

function missing(names: string[]): string {
  return `缺 ${names.join("、")}`;
}

// ---- 三条规则逐条判定，命中项随台账保存 ----

function evalSphereRule(oldL: Refraction, cur: Refraction): RuleResult {
  const name = "球镜变化 ≥0.50D";
  const o = parseDiopter(oldL.sphere);
  const n = parseDiopter(cur.sphere);
  const code: HitCode = "sphere050";
  if (o === null || n === null) {
    return {
      code,
      name,
      hit: false,
      unknown: true,
      applicable: true,
      detail: `球镜相差无法核算（${missing([
        o === null ? "旧镜球镜" : "",
        n === null ? "本次球镜" : "",
      ].filter(Boolean))}）`,
      missingFields: [o === null ? "旧镜球镜" : "", n === null ? "本次球镜" : ""].filter(Boolean),
    };
  }
  const diff = Math.abs(n - o);
  const hit = diff >= SPHERE_THRESHOLD;
  return {
    code,
    name,
    hit,
    unknown: false,
    applicable: true,
    detail: `球镜 ${formatD(o)} → ${formatD(n)}，相差 ${diff.toFixed(2)}D，${
      hit ? "达到" : "未达"
    } 0.50D`,
    missingFields: [],
  };
}

function evalCylinderRule(oldL: Refraction, cur: Refraction): RuleResult {
  const name = "柱镜变化 ≥0.50D";
  const o = parseDiopter(oldL.cylinder);
  const n = parseDiopter(cur.cylinder);
  const code: HitCode = "cylinder050";
  if (o === null || n === null) {
    return {
      code,
      name,
      hit: false,
      unknown: true,
      applicable: true,
      detail: `柱镜相差无法核算（${missing([
        o === null ? "旧镜柱镜" : "",
        n === null ? "本次柱镜" : "",
      ].filter(Boolean))}）`,
      missingFields: [o === null ? "旧镜柱镜" : "", n === null ? "本次柱镜" : ""].filter(Boolean),
    };
  }
  const diff = Math.abs(n - o);
  const hit = diff >= CYLINDER_THRESHOLD;
  return {
    code,
    name,
    hit,
    unknown: false,
    applicable: true,
    detail: `柱镜 ${formatD(o)} → ${formatD(n)}，相差 ${diff.toFixed(2)}D，${
      hit ? "达到" : "未达"
    } 0.50D`,
    missingFields: [],
  };
}

function evalAxisRule(oldL: Refraction, cur: Refraction): RuleResult {
  const name = "轴位变化 >15°";
  const code: HitCode = "axis15";
  const oldCyl = parseDiopter(oldL.cylinder);

  // 原有柱镜低于 0.50D（或缺失）时，轴位规则不适用 / 无法判断
  if (oldCyl === null) {
    return {
      code,
      name,
      hit: false,
      unknown: true,
      applicable: false,
      detail: `原柱镜缺项，无法确认是否满足“不低于 ${OLD_CYL_REQUIRED.toFixed(2)}D”，轴位变化无法判断`,
      missingFields: ["旧镜柱镜"],
    };
  }
  if (Math.abs(oldCyl) < OLD_CYL_REQUIRED) {
    return {
      code,
      name,
      hit: false,
      unknown: false,
      applicable: false,
      detail: `原柱镜 ${formatD(oldCyl)} 低于 ${OLD_CYL_REQUIRED.toFixed(
        2
      )}D，轴位变化不作为换镜依据`,
      missingFields: [],
    };
  }

  const o = parseAxis(oldL.axis);
  const n = parseAxis(cur.axis);
  if (o === null || n === null) {
    return {
      code,
      name,
      hit: false,
      unknown: true,
      applicable: true,
      detail: `轴位差无法核算（${missing([
        o === null ? "旧镜轴位" : "",
        n === null ? "本次轴位" : "",
      ].filter(Boolean))}）`,
      missingFields: [o === null ? "旧镜轴位" : "", n === null ? "本次轴位" : ""].filter(Boolean),
    };
  }
  const diff = axisDiff(o, n);
  const hit = diff > AXIS_THRESHOLD;
  return {
    code,
    name,
    hit,
    unknown: false,
    applicable: true,
    detail: `原柱镜 ${formatD(oldCyl)}（≥${OLD_CYL_REQUIRED.toFixed(
      2
    )}D），轴位 ${o}° → ${n}°，相差 ${diff}°，${hit ? "超过" : "未超过"} ${AXIS_THRESHOLD}°`,
    missingFields: [],
  };
}

export function evaluateEye(side: EyeSide, oldL: Refraction, cur: Refraction): EyeEvaluation {
  const rules = [evalSphereRule(oldL, cur), evalCylinderRule(oldL, cur), evalAxisRule(oldL, cur)];
  const hits = rules.filter((r) => r.hit).map((r) => r.code);
  const missingRules = rules.filter((r) => r.unknown).map((r) => r.code);

  let verdict: Verdict;
  if (hits.length > 0) {
    verdict = "change";
  } else if (missingRules.length > 0) {
    verdict = "unknown";
  } else {
    verdict = "stable";
  }
  return { side, verdict, rules, hits, missingRules };
}

const OVERALL_TEXT: Record<Verdict, string> = {
  change: "建议换镜",
  unknown: "无法判断",
  stable: "度数稳定，可暂不换镜",
};

export function evaluate(oldLens: EyePair<Refraction>, current: EyePair<Refraction>): Evaluation {
  const eyes: EyePair<EyeEvaluation> = {
    OD: evaluateEye("OD", oldLens.OD, current.OD),
    OS: evaluateEye("OS", oldLens.OS, current.OS),
  };

  let verdict: Verdict;
  if (eyes.OD.verdict === "change" || eyes.OS.verdict === "change") {
    verdict = "change";
  } else if (eyes.OD.verdict === "unknown" || eyes.OS.verdict === "unknown") {
    verdict = "unknown";
  } else {
    verdict = "stable";
  }

  const eyeText = (e: EyeEvaluation): string => {
    if (e.verdict === "change")
      return `${EYE_NAME[e.side]}：建议换镜（${e.rules
        .filter((r) => r.hit)
        .map((r) => r.name)
        .join("、")}）`;
    if (e.verdict === "unknown") return `${EYE_NAME[e.side]}：无法判断（有缺项）`;
    return `${EYE_NAME[e.side]}：度数稳定`;
  };

  return {
    eyes,
    verdict,
    summary: `${OVERALL_TEXT[verdict]}｜${eyeText(eyes.OD)}；${eyeText(eyes.OS)}`,
  };
}

/** 整只眼数据是否齐全（用于确认换镜校验；缺项不得确认） */
export function eyeComplete(r: Refraction): boolean {
  return (
    parseDiopter(r.sphere) !== null &&
    parseDiopter(r.cylinder) !== null &&
    parseAxis(r.axis) !== null
  );
}

export function pairComplete(p: EyePair<Refraction>): boolean {
  return eyeComplete(p.OD) && eyeComplete(p.OS);
}
