import { formatRate, groupMatches, normalizeGroup } from "@/lib/client";
import type { ServiceOccurrence, ServiceRate, ServiceRecord } from "@/ui2/queries/types";

export interface Leaf {
  key: string;
  componentName: string;
  batchName: string;
  rates: ServiceRate[];
  occurrences: ServiceOccurrence[];
}

/** Every (component, batch) of a service as one list. A service without components has one leaf with its flat rates and occurrences. */
export function leavesOf(s: ServiceRecord): Leaf[] {
  const comps = s.OptionalComponents ?? [];
  if (comps.length === 0) return [{ key: s.ServiceID, componentName: "", batchName: "", rates: s.Rates ?? [], occurrences: s.OccuranceList ?? [] }];
  return comps.flatMap((c) => (c.Batches ?? []).map((b) => ({ key: b.BatchID, componentName: c.ComponentName || "", batchName: b.BatchName || "", rates: b.Rates ?? [], occurrences: b.OccuranceList ?? [] })));
}

export const rateText = (r: ServiceRate) => formatRate({ Currency: r.Currency, Rate: r.Rate, Description: r.Description }, { showDescription: true }) as string;
export const occurrenceText = (o: ServiceOccurrence) => `${o.Day} ${o.Time} (${o.Duration}h)`;
export const groupLabel = (s: ServiceRecord) => (normalizeGroup(s.Group) as string[]).join(", ");
export const inGroup = (s: ServiceRecord, g: string) => groupMatches(s.Group, g) as boolean;
