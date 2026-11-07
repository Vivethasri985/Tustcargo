"use client";

import { useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FILE_TYPES, UPLOAD_LIMITS, validateUploads } from "@/lib/uploads";

const TRACKING_HINTS: Record<string, string> = {
  DHL: "10 digits, such as 1234567890",
  FEDEX: "12 or 15 digits, such as 123456789012",
  UPS: "1Z followed by 16 letters or digits",
  OTHER: "6-30 letters or digits",
};

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
  const [otherCarrier, setOtherCarrier] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const files = data.getAll("files").filter((file): file is File => file instanceof File && file.name !== "");
    const error = validateUploads(files, true);
    setError(error);
    if (error) return;
    data.set("carrier", carrier === "OTHER" ? otherCarrier.trim() : carrier);
    onSubmit(data);
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Carrier">
            <select
              className="form-select"
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
            >
              <option value="DHL">DHL</option>
              <option value="FEDEX">FedEx</option>
              <option value="UPS">UPS</option>
              <option value="OTHER">Other carrier</option>
            </select>
          </Field>
          <Field label="Tracking number">
            <Input
              name="tracking_number"
              required
              minLength={6}
              maxLength={40}
              placeholder={TRACKING_HINTS[carrier]}
            />
          </Field>
          <Field label="Quantity shipped">
            <Input name="shipped_quantity" type="number" min={1} step={1} defaultValue={quantity} required />
          </Field>
        </div>
        {carrier === "OTHER" && (
          <Field label="Carrier name">
            <Input
              required
              minLength={2}
              maxLength={80}
              value={otherCarrier}
              onChange={(event) => setOtherCarrier(event.target.value)}
              placeholder="For example, Blue Dart"
            />
          </Field>
        )}
        <p className="text-xs text-muted">Format: {TRACKING_HINTS[carrier]}</p>
        <Field label={`Shipping proof (${UPLOAD_LIMITS})`}>
          <Input name="files" type="file" accept={FILE_TYPES} multiple required className="pt-2" onChange={() => setError("")} />
        </Field>
        {error && <p role="alert" className="text-sm font-medium">{error}</p>}
        <Button type="submit" disabled={busy} className="justify-self-start">
          <Upload className="size-4" aria-hidden />
          {busy ? "Checking proof..." : "Submit for AI check"}
        </Button>
      </fieldset>
    </form>
  );
}
