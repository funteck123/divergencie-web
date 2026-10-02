"use client";

import { useState } from "react";
import { toast } from "sonner";
import { batchScheduleLabel } from "@/lib/billing";
import { Button } from "@/ui2/components/Button";
import { Combobox } from "@/ui2/components/Combobox";
import { Field, TextInput } from "@/ui2/components/Field";
import { Sheet } from "@/ui2/components/Sheet";
import { useUpdateEnrollment } from "@/ui2/queries/enrollments";
import type { EnrollmentRecord, ServiceRecord, UserRecord } from "@/ui2/queries/types";
import { batchesFor, pickService, rateLabel, ratesFor } from "./enrollLogic";

/** Change who, which service, batch, rate or dates of one enrollment (the classic in-row editor). Sends all six fields, as classic does. */
export function EnrollmentEditSheet({ enrollment, users, services, onClose }: { enrollment: EnrollmentRecord | null; users: readonly UserRecord[]; services: readonly ServiceRecord[]; onClose: () => void }) {
  return (
    <Sheet open={!!enrollment} onOpenChange={(o) => !o && onClose()} title="Edit enrollment" subtitle={enrollment?.EnrolmentID}>
      {enrollment && <Form key={enrollment.EnrolmentID} enrollment={enrollment} users={users} services={services} onClose={onClose} />}
    </Sheet>
  );
}

function Form({ enrollment, users, services, onClose }: { enrollment: EnrollmentRecord; users: readonly UserRecord[]; services: readonly ServiceRecord[]; onClose: () => void }) {
  const [userId, setUserId] = useState(enrollment.UserID);
  const [serviceId, setServiceId] = useState(enrollment.ServiceID);
  const [batchId, setBatchId] = useState(enrollment.BatchID || "");
  const [rateId, setRateId] = useState(enrollment.RateID || "");
  const [startDate, setStartDate] = useState(enrollment.StartDate || "");
  const [endDate, setEndDate] = useState(enrollment.EndDate || "");
  const [error, setError] = useState("");
  const update = useUpdateEnrollment();

  const svc = services.find((s) => s.ServiceID === serviceId);
  const user = users.find((u) => u.UserID === userId);
  const batches = batchesFor(svc);
  const rates = ratesFor(svc, batchId, user?.UserType);

  async function save() {
    setError("");
    try {
      await update.mutateAsync({ enrolmentId: enrollment.EnrolmentID, patch: { userId, serviceId, batchId, rateId, startDate, endDate } });
      toast.success("Enrollment saved.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <div className="u2-form">
      <Field label="Person">
        <Combobox value={userId} onChange={setUserId} options={users.map((u) => ({ value: u.UserID, label: `${u.Name} (${u.UserType})` }))} />
      </Field>
      <Field label="Service">
        <Combobox
          value={serviceId}
          onChange={(id) => {
            const next = pickService(services, id);
            setServiceId(next.serviceId);
            setBatchId(next.batchId);
            setRateId(next.rateId);
          }}
          options={services.map((s) => ({ value: s.ServiceID, label: s.Name }))}
        />
      </Field>
      <Field label="Batch">
        <Combobox
          value={batchId}
          onChange={(id) => {
            setBatchId(id);
            setRateId("");
          }}
          options={batches.map((b) => ({ value: b.BatchID, label: `${b.BatchName ?? ""}${batchScheduleLabel(b) ? ` — ${batchScheduleLabel(b)}` : ""}` }))}
        />
      </Field>
      <Field label="Rate">
        <Combobox value={rateId} onChange={setRateId} placeholder="Select a rate…" options={rates.map((r) => ({ value: r.RateID, label: rateLabel(r) }))} />
      </Field>
      <div className="u2-grid2">
        <Field label="Start date">
          <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date">
          <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      {error && (
        <p role="alert" className="u2-form__error">
          {error}
        </p>
      )}
      <div className="u2-form__actions">
        <Button variant="primary" loading={update.isPending} disabled={!rateId} disabledReason="Select a rate first." onClick={() => void save()}>
          Save
        </Button>
        <Button variant="ghost" disabled={update.isPending} onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
