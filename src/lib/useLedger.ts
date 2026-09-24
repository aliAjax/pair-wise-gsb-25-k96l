import { useCallback, useEffect, useMemo, useState } from "react";
import type { Disposition, DraftInput, LedgerEntry } from "../types";
import { createNextVersion, loadEntries, persistEntries, todayISO } from "./storage";
import { saveEntry } from "./ledger";

export function useLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>(() => loadEntries());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 任何变更后立即持久化，重开页面结果仍在
  useEffect(() => {
    persistEntries(entries);
  }, [entries]);

  const selected = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const upsert = useCallback((entry: LedgerEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return [entry, ...prev];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
  }, []);

  const saveDraft = useCallback(
    (
      input: DraftInput,
      disposition: Disposition,
      reviewDate: string,
      base: LedgerEntry | null
    ): { ok: boolean; error?: string } => {
      const res = saveEntry(
        { input, disposition, reviewDate },
        base,
        entries,
        new Date().toISOString()
      );
      if (!res.ok || !res.entry) return { ok: false, error: res.error };
      upsert(res.entry);
      setSelectedId(res.entry.id);
      return { ok: true };
    },
    [entries, upsert]
  );

  /** 确认换镜后再调整：基于已确认版本新建版本，原处方保持不动 */
  const openNewVersion = useCallback(
    (base: LedgerEntry) => {
      const fresh = createNextVersion(base);
      setEntries((prev) => [fresh, ...prev]);
      setSelectedId(fresh.id);
      return fresh;
    },
    []
  );

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  return {
    entries,
    selected,
    selectedId,
    select,
    saveDraft,
    openNewVersion,
    today: todayISO(),
  };
}
