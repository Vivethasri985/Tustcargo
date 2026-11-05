"use client";

import type { FormEvent } from "react";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function InspectionForm({
  quantity,
  busy,
  onSubmit,
}: {
  quantity: number;
  busy: boolean;
  onSubmit: (data: FormData) => void;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const files = data.getAll("files").filter((file) => (file as File).size > 0);
    data.delete("files");
    files.forEach((file) => data.append("files", file));
    onSubmit(data);
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity received">
          <Input
            name="received_quantity"
            type="number"
            min={0}
            defaultValue={quantity}
            required
          />
        </Field>
        <Field label="Quantity damaged">
          <Input name="damaged_quantity" type="number" min={0} defaultValue={0} required />
        </Field>
      </div>
      <Field label="Notes">
        <Input name="notes" maxLength={2000} placeholder="Describe any problem" />
      </Field>
      <Field label="Delivery photos (optional)">
        <Input
          name="files"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          multiple
          className="pt-2"
        />
      </Field>
      <Button type="submit" disabled={busy} className="justify-self-start">
        <ClipboardCheck className="size-4" aria-hidden />
        Submit inspection
      </Button>
    </form>
  );
}
