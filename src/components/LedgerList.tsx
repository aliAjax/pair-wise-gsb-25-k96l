import VersionCard from "./VersionCard";
import type { LedgerRecord } from "../ledger/types";

interface LedgerListProps {
  records: LedgerRecord[];
  onEdit: (record: LedgerRecord) => void;
  onRetain: (record: LedgerRecord, reviewDate: string) => void;
  onChange: (record: LedgerRecord) => void;
  onPending: (record: LedgerRecord) => void;
  onNextVersion: (record: LedgerRecord) => void;
}

interface Chain {
  rootId: string;
  customer: string;
  versions: LedgerRecord[];
}

/** 同一顾客的版本链归为一组，版本号从新到旧排列 */
export function groupChains(records: LedgerRecord[]): Chain[] {
  const map = new Map<string, Chain>();
  records.forEach((record) => {
    const chain = map.get(record.rootId) ?? {
      rootId: record.rootId,
      customer: record.customer || "未命名顾客",
      versions: [],
    };
    chain.versions.push(record);
    map.set(record.rootId, chain);
  });

  return Array.from(map.values())
    .map((chain) => ({
      ...chain,
      versions: chain.versions.sort((a, b) => b.version - a.version),
    }))
    .sort((a, b) => {
      const aTime = a.versions[0].createdAt;
      const bTime = b.versions[0].createdAt;
      return bTime.localeCompare(aTime);
    });
}

export default function LedgerList({
  records,
  onEdit,
  onRetain,
  onChange,
  onPending,
  onNextVersion,
}: LedgerListProps) {
  const chains = groupChains(records);

  if (chains.length === 0) {
    return (
      <section className="panel ledger-panel">
        <div className="section-heading">
          <div>
            <p>核对台账</p>
            <h2>台账为空</h2>
          </div>
        </div>
        <p className="empty-hint">先在上方录入旧镜度数与本次验光，保存后在此核对。</p>
      </section>
    );
  }

  return (
    <section className="panel ledger-panel">
      <div className="section-heading">
        <div>
          <p>核对台账</p>
          <h2>顾客核对记录</h2>
        </div>
        <span className="ledger-count">共 {chains.length} 位顾客 · {records.length} 条版本</span>
      </div>

      <div className="chain-list">
        {chains.map((chain) => (
          <div className="chain-group" key={chain.rootId}>
            <h3 className="chain-title">
              {chain.customer}
              {chain.versions.length > 1 && (
                <span className="chain-count">{chain.versions.length} 个版本</span>
              )}
            </h3>
            {chain.versions.map((record) => (
              <VersionCard
                key={record.id}
                record={record}
                chainLength={chain.versions.length}
                onEdit={onEdit}
                onRetain={onRetain}
                onChange={onChange}
                onPending={onPending}
                onNextVersion={onNextVersion}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
