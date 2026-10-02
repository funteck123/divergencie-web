"use client";

import { useBills } from "@/ui2/queries/billing";

/** Invoices are only read here (to show whether a trial's first invoice is sent or paid). */
export const useInvoicesForPipeline = () => useBills("invoice");
