"use client";

import { useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const FILE_TYPES = ".jpg,.jpeg,.png,.webp,.pdf";

export function ShipmentForm({
  quantity,
  busy,
  onSubmit,
}: {
  quantity: number;
  busy: boolean;
  onSubmit: (data: FormData) => void;
}) {
  const [carrier, setCarrier] = useState("DHL");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("carrier", carrier);
    onSubmit(data);
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Carrier">
          <select
            className="h-10 rounded-md border border-foreground/20 bg-background px-3 text-sm"
            value={carrier}
            onChange={(event) => setCarrier(event.target.value)}
          >
            <option>DHL</option>
            <option>FEDEX</option>
            <option>UPS</option>
          </select>
        </Field>
        <Field label="Tracking number">
          <Input name="tracking_number" required minLength={3} />
        </Field>
        <Field label="Quantity shipped">
          <Input name="shipped_quantity" type="number" min={1} defaultValue={quantity} required />
        </Field>
      </div>
      <Field label="Shipping proof (up to 3 files, 5 MB each)">
        <Input name="files" type="file" accept={FILE_TYPES} multiple required className="pt-2" />
      </Field>
      <Button type="submit" disabled={busy} className="justify-self-start">
        <Upload className="size-4" aria-hidden />
        Submit for AI check
      </Button>
    </form>
  );
}
