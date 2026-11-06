"use client";

import { useState, type FormEvent } from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FILE_TYPES, UPLOAD_LIMITS, validateUploads } from "@/lib/uploads";

export function InspectionForm({
  quantity,
  busy,
  onSubmit,
}: {
  quantity: number;
  busy: boolean;
  onSubmit: (data: FormData) => void;
}) {
  const [error, setError] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const files = data.getAll("files").filter((file): file is File => file instanceof File && file.name !== "");
    const error = Number(data.get("damaged_quantity")) > Number(data.get("received_quantity"))
      ? "Damaged quantity cannot exceed received quantity."
      : validateUploads(files);
    setError(error);
    if (error) return;
    data.delete("files");
    files.forEach((file) => data.append("files", file));
    onSubmit(data);
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quantity received">
            <Input
              name="received_quantity"
              type="number"
              min={0}
              step={1}
              defaultValue={quantity}
              required
            />
          </Field>
          <Field label="Quantity damaged">
            <Input name="damaged_quantity" type="number" min={0} step={1} defaultValue={0} required />
          </Field>
        </div>
        <Field label="Notes">
          <Input name="notes" maxLength={2000} placeholder="Describe any problem" />
        </Field>
        <Field label={`Delivery photos (optional, ${UPLOAD_LIMITS})`}>
          <Input
            name="files"
            type="file"
            accept={FILE_TYPES}
            multiple
            className="pt-2"
            onChange={() => setError("")}
          />
        </Field>
        {error && <p role="alert" className="text-sm font-medium">{error}</p>}
        <Button type="submit" disabled={busy} className="justify-self-start">
          <ClipboardCheck className="size-4" aria-hidden />
          {busy ? "Reviewing inspection..." : "Submit inspection"}
        </Button>
      </fieldset>
    </form>
  );
}
