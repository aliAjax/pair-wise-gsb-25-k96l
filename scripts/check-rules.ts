import { evaluate, axisDiff } from "../src/lib/rules";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${name} ${extra}`);
  }
}

const r = (sphere: string, cylinder: string, axis: string) => ({ sphere, cylinder, axis });
const pair = (od: ReturnType<typeof r>, os: ReturnType<typeof r>) => ({ OD: od, OS: os });

// 1. 球镜相差 0.50 -> 命中（边界含等于）
check(
  "sphere diff exactly 0.50 hits",
  evaluate(pair(r("-2.00", "", ""), r("", "", "")), pair(r("-2.50", "", ""), r("", "", "")))
    .eyes.OD.hits[0] === "sphere050"
);

// 2. 球镜相差 0.25 -> 不命中
check(
  "sphere diff 0.25 stable",
  evaluate(pair(r("-2.00", "", ""), r("", "", "")), pair(r("-2.25", "", ""), r("", "", "")))
    .eyes.OD.verdict === "unknown" // 柱镜轴位都缺 -> 单眼整体仍有缺项，但球镜规则本身未命中
);

// 3. 全部不缺且无变化 -> stable
check(
  "all equal stable",
  evaluate(pair(r("-2.00", "-0.50", "180"), r("-1.00", "-0.75", "90")),
    pair(r("-2.00", "-0.50", "180"), r("-1.00", "-0.75", "90"))).verdict === "stable"
);

// 4. 空值不当变化：旧镜全空 -> 无法判断（不是 change）
check(
  "empty old lens is unknown not change",
  evaluate(pair(r("", "", ""), r("", "", "")), pair(r("-3.00", "-1.00", "20"), r("-3.00", "-1.00", "20")))
    .verdict === "unknown"
);

// 5. 柱镜相差 0.50 -> 命中
check(
  "cylinder diff 0.50 hits",
  evaluate(pair(r("-2.00", "-0.50", "180"), r("-2.00", "-0.50", "180")),
    pair(r("-2.00", "-1.00", "180"), r("-2.00", "-0.50", "180")))
    .eyes.OD.hits.includes("cylinder050")
);

// 6. 原柱镜 0.50 且轴位差 16 -> 命中
check(
  "axis diff 16 with old cyl 0.50 hits",
  evaluate(pair(r("-2.00", "-0.50", "180"), r("", "", "")),
    pair(r("-2.00", "-0.50", "164"), r("", "", "")))
    .eyes.OD.hits.includes("axis15")
);

// 7. 原柱镜 0.50 且轴位差正好 15 -> 不命中（超过15才命中）
check(
  "axis diff exactly 15 does not hit",
  !evaluate(pair(r("-2.00", "-0.50", "180"), r("", "", "")),
    pair(r("-2.00", "-0.50", "165"), r("", "", "")))
    .eyes.OD.hits.includes("axis15")
);

// 8. 原柱镜 0.25 轴位差 30 -> 轴位规则不适用，整体 stable（数据齐全）
check(
  "low old cyl axis rule not applicable, stable",
  evaluate(pair(r("-2.00", "-0.25", "180"), r("", "", "")),
    pair(r("-2.00", "-0.25", "150"), r("", "", "")))
    .eyes.OD.verdict === "stable"
);

// 9. 原柱镜缺失 -> 轴位无法判断（不能因轴位数字差判变化）
check(
  "missing old cyl -> axis unknown",
  evaluate(pair(r("-2.00", "", "180"), r("", "", "")),
    pair(r("-2.00", "", "10"), r("", "", "")))
    .eyes.OD.missingRules.includes("axis15")
);

// 10. 轴位环形差 170 vs 180 = 10
check("axis wrap 170/180 = 10", axisDiff(170, 180) === 10);
check("axis wrap 5/180 = 5", axisDiff(5, 180) === 5);
check("axis wrap 90/0 = 90", axisDiff(90, 0) === 90);

// 11. 一眼命中一眼稳定 -> 总判 change，且命中项保留
{
  const ev = evaluate(
    pair(r("-2.00", "-0.50", "180"), r("-1.00", "-0.50", "90")),
    pair(r("-2.75", "-0.50", "180"), r("-1.00", "-0.50", "90"))
  );
  check("one eye change overall change", ev.verdict === "change");
  check("hit preserved on OD only", ev.eyes.OD.hits[0] === "sphere050" && ev.eyes.OS.hits.length === 0);
}

// 12. 一眼缺项一眼稳定 -> unknown
{
  const ev = evaluate(
    pair(r("", "", ""), r("-1.00", "-0.50", "90")),
    pair(r("", "-0.50", "180"), r("-1.00", "-0.50", "90"))
  );
  check("one unknown one stable -> unknown", ev.verdict === "unknown");
}

// 13. 正柱镜写法 +0.50 同样适用轴位规则
check(
  "positive cyl 0.50 axis applies",
  evaluate(pair(r("+2.00", "+0.50", "10"), r("", "", "")),
    pair(r("+2.00", "+0.50", "30"), r("", "", "")))
    .eyes.OD.hits.includes("axis15")
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
