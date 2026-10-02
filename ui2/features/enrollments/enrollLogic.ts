import { batchesOf, ratesOf } from "@/lib/billing";
import type { ServiceRecord } from "@/ui2/queries/types";

interface Batch {
  BatchID: string;
  BatchName?: string;
}
interface Rate {
  RateID: string;
  Currency: string;
  Rate: number | string;
  Description?: string;
  Group?: string;
}

export const batchesFor = (service: ServiceRecord | undefined): Batch[] => (service ? (batchesOf(service) as Batch[]) : []);

/** Rates the person may pick: a rate reserved for one group is hidden from people of another group. */
export function ratesFor(service: ServiceRecord | undefined, batchId: string, userType: string | undefined): Rate[] {
  if (!service) return [];
  return (ratesOf(service, batchId) as Rate[]).filter((r) => !r.Group || r.Group === userType);
}

/** Picking a service selects its first batch and clears the rate (the rate list depends on the batch). */
export function pickService(services: readonly ServiceRecord[], serviceId: string): { serviceId: string; batchId: string; rateId: string } {
  const svc = services.find((s) => s.ServiceID === serviceId);
  return { serviceId, batchId: batchesFor(svc)[0]?.BatchID ?? "", rateId: "" };
}

export const rateLabel = (r: Rate) => `${r.Currency} ${r.Rate}${r.Description ? ` (${r.Description})` : ""}`;

/** Message shown when some of the requested enrollments failed (same wording as classic). */
export function failureMessage(failures: readonly { serviceId: string; message: string }[], total: number, nameOf: (serviceId: string) => string): string {
  return `${failures.length} of ${total} enrollment(s) failed — ${failures.map((f) => `${nameOf(f.serviceId)}: ${f.message}`).join("; ")}`;
}
