# hxwl-11 眼科验光记录

旧镜度数 × 本次验光 核对台账：门店凭核对结果与经验判断是否换镜。

## 技术栈

React + Vite + TypeScript + CSS（localStorage 本地持久化，无后端）

## 本地运行

```bash
npm install
npm run dev
```

开发端口：5111

## 核对规则（双眼分别判定，任一眼命中即建议换镜）

1. 球镜相差 **≥ 0.50D**
2. 柱镜相差 **≥ 0.50D**
3. **原有柱镜不低于 0.50D** 且轴位相差 **> 15°**（轴位按 0–180 环形计算）

- 命中任一规则 → **建议换镜**，命中项随台账保留
- 所需数据缺项 → 该规则 **无法判断**；空值绝不当作 0 或"无变化"
- 数据齐全且均未命中 → **度数稳定**

## 处理方式

- **保存待核对**：先留档，结论与命中项已保存
- **暂不换镜**：必须填写复查日期，列表对临期/逾期做提示
- **确认换镜**：双眼六项数据齐全才允许确认；确认后核对结论与处方**固定只读**；后续调整只能在该台账下**新建版本**（旧镜自动沿用上一版固定处方，同编号、版本号递增）

## 分层结构

```
src/
  types.ts                 领域模型（旧镜/本次/结论/处方/版本）
  lib/rules.ts             规则层：解析、三条规则、双眼核对（纯函数，无副作用）
  lib/storage.ts           保存层：localStorage 读写、编号/版本链、初始演示台账
  lib/ledger.ts            业务层：保存校验（缺项、复查日期、固定记录保护）
  lib/useLedger.ts         React store（页面只通过它操作数据）
  components/EntryForm.tsx 录入与实时核对页面
  components/LedgerList.tsx 台账列表（版本链、命中项、复查提醒）
  App.tsx                  页面组装
scripts/check-rules.ts     规则边界用例（npm run test:rules）
```

数据保存在浏览器 `localStorage`（键 `hxwl11.ledger.v1`），重开页面结果仍在。

## 校验

```bash
npm run typecheck     # TypeScript 类型检查
npm run test:rules    # 规则边界用例
npm run build         # 生产构建
```

## 可继续扩展

IndexedDB 大容量存储、权限、后端 API 同步、屈光进展图表、复查短信提醒。
