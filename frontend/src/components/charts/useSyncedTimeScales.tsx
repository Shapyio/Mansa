import { useEffect } from "react";
import type { IChartApi } from "lightweight-charts";

/**
 * One-way time-axis sync. Whenever the master's visible range changes
 * (pan, zoom, fit), every follower is set to the same range. Followers
 * never talk back to the master, so there's no feedback loop.
 */
export function useSyncedTimeScales(
  master:    IChartApi | null,
  followers: (IChartApi | null)[],
) {
  useEffect(() => {
    if (!master) return;
    const live = followers.filter((c): c is IChartApi => !!c);
    if (live.length === 0) return;

    const push = () => {
      const r = master.timeScale().getVisibleLogicalRange();
      if (!r) return;
      for (const f of live) {
        try { f.timeScale().setVisibleLogicalRange(r); } catch { /* pane not ready */ }
      }
    };

    push();  // align once on mount / on follower change
    master.timeScale().subscribeVisibleLogicalRangeChange(push);
    return () => {
      master.timeScale().unsubscribeVisibleLogicalRangeChange(push);
    };
  }, [master, followers]);
}
