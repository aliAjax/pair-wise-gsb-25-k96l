// 换镜判断规则层：纯函数，不读写存储、不依赖页面
//
// 命中任一规则即建议换镜，并保留命中项：
//   1. 球镜相差至少 0.50D
//   2. 柱镜相差至少 0.50D
//   3. 原有柱镜不低于 0.50D 且轴位差超过 15 度
// 规则所需数值缺项（空值/非法值）时该规则无法核对；有命中即给换镜建议，
// 无命中但有缺项则判“无法判断”。空值绝不当作 0 处理。

import type {
  Eye,
  EyeEvaluation,
  HitItem,
  PairEvaluation,
  RefractionPair,
  RuleCode,
} from "./types";

export const SPHERE_THRESHOLD = 0.5;
export const CYLINDER_THRESHOLD = 0.5;
export const AXIS_CYLINDER_MIN = 0.5;
export const AXIS_THRESHOLD = 15;

export const RULE_LABELS: Record<RuleCode, string> = {
  SPHERE: "球镜变化",
  CYLINDER: "柱镜变化",
  AXIS: "轴位变化",
};

export const EYE_LABELS: Record<Eye, string> = {
  OD: "右眼",
  OS: "左眼",
};

type Refraction = RefractionPair[Eye];

/** 解析屈光度，空值或非法值返回 null（缺项）；只接受 0.25D 步进 */
export function parseDiopter(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  if (!/^[+-]?\d+(\.(?:00|25|50|75))?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** 解析轴位 1–180，空值或非法值返回 null（缺项） */
export function parseAxis(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  if (!/^\d{1,3}$/.test(text)) return null;
  const value = Number(text);
  if (value < 1 || value > 180) return null;
  return value;
}

/** 圆周上的最小轴位差：0 与 180 视为同一方向 */
export function axisDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 180;
  return Math.min(diff, 180 - diff);
}

function formatDiopter(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}D`;
}

/** 判断单眼 */
export function evaluateEye(eye: Eye, oldLens: Refraction, current: Refraction): EyeEvaluation {
  const oldSphere = parseDiopter(oldLens.sphere);
  const newSphere = parseDiopter(current.sphere);
  const oldCylinder = parseDiopter(oldLens.cylinder);
  const newCylinder = parseDiopter(current.cylinder);
  const oldAxis = parseAxis(oldLens.axis);
  const newAxis = parseAxis(current.axis);

  const hits: HitItem[] = [];
  const missing: string[] = [];
  const eyeLabel = EYE_LABELS[eye];

  // 规则一：球镜相差 ≥ 0.50D
  if (oldSphere === null) missing.push(`${eyeLabel}旧镜球镜`);
  if (newSphere === null) missing.push(`${eyeLabel}本次球镜`);
  if (oldSphere !== null && newSphere !== null) {
    const diff = newSphere - oldSphere;
    if (Math.abs(diff) >= SPHERE_THRESHOLD) {
      hits.push({
        eye,
        rule: "SPHERE",
        text: `${eyeLabel}球镜相差 ${Math.abs(diff).toFixed(2)}D（${formatDiopter(oldSphere)} → ${formatDiopter(newSphere)}）`,
      });
    }
  }

  // 规则二：柱镜相差 ≥ 0.50D
  if (oldCylinder === null) missing.push(`${eyeLabel}旧镜柱镜`);
  if (newCylinder === null) missing.push(`${eyeLabel}本次柱镜`);
  if (oldCylinder !== null && newCylinder !== null) {
    const diff = newCylinder - oldCylinder;
    if (Math.abs(diff) >= CYLINDER_THRESHOLD) {
      hits.push({
        eye,
        rule: "CYLINDER",
        text: `${eyeLabel}柱镜相差 ${Math.abs(diff).toFixed(2)}D（${formatDiopter(oldCylinder)} → ${formatDiopter(newCylinder)}）`,
      });
    }
  }

  // 规则三：原有柱镜 ≥ 0.50D 且轴位差 > 15 度（前提不满足时轴位缺项不计入）
  if (oldCylinder !== null && Math.abs(oldCylinder) >= AXIS_CYLINDER_MIN) {
    if (oldAxis === null) missing.push(`${eyeLabel}旧镜轴位`);
    if (newAxis === null) missing.push(`${eyeLabel}本次轴位`);
    if (oldAxis !== null && newAxis !== null) {
      const diff = axisDiff(oldAxis, newAxis);
      if (diff > AXIS_THRESHOLD) {
        hits.push({
          eye,
          rule: "AXIS",
          text: `${eyeLabel}原柱镜${formatDiopter(oldCylinder)}，轴位相差 ${diff}°（${oldAxis}° → ${newAxis}°）`,
        });
      }
    }
  }

  let verdict: EyeEvaluation["verdict"];
  if (hits.length > 0) verdict = "CHANGE";
  else if (missing.length > 0) verdict = "UNKNOWN";
  else verdict = "KEEP";

  return {
    verdict,
    hits,
    missing,
    diffs: {
      sphere: oldSphere !== null && newSphere !== null ? newSphere - oldSphere : null,
      cylinder: oldCylinder !== null && newCylinder !== null ? newCylinder - oldCylinder : null,
      axis: oldAxis !== null && newAxis !== null ? axisDiff(oldAxis, newAxis) : null,
    },
  };
}

/** 判断双眼：任一眼建议换镜即建议换镜；无命中但有缺项则无法判断 */
export function evaluatePair(oldPair: RefractionPair, newPair: RefractionPair): PairEvaluation {
  const OD = evaluateEye("OD", oldPair.OD, newPair.OD);
  const OS = evaluateEye("OS", oldPair.OS, newPair.OS);
  const hits = [...OD.hits, ...OS.hits];
  const missing = [...OD.missing, ...OS.missing];

  const verdict = hits.length > 0 ? "CHANGE" : missing.length > 0 ? "UNKNOWN" : "KEEP";

  return { OD, OS, verdict, hits, missing };
}
