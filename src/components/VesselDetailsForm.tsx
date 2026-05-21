import type { VesselFormPayload } from "../features/import/types";

type VesselDetailsFormProps = {
  value: VesselFormPayload;
  onChange: (next: VesselFormPayload) => void;
  disabled?: boolean;
  requiredErrors?: Partial<Record<keyof VesselFormPayload, string>>;
};

const fields: {
  key: keyof VesselFormPayload;
  label: string;
  type: string;
  placeholder?: string;
}[] = [
  {
    key: "vessel_name",
    label: "Vessel name",
    type: "text",
    placeholder: "e.g. Oceanic Explorer",
  },
  {
    key: "inspection_date",
    label: "Inspection date",
    type: "date",
    placeholder: "",
  },
  {
    key: "operator_name",
    label: "Operator name",
    type: "text",
    placeholder: "ROV pilot / inspector",
  },
  {
    key: "location",
    label: "Location / port",
    type: "text",
    placeholder: "Port of Brisbane",
  },
];

export default function VesselDetailsForm({
  value,
  onChange,
  disabled,
  requiredErrors,
}: VesselDetailsFormProps) {
  const set = (key: keyof VesselFormPayload, v: string) =>
    onChange({ ...value, [key]: v });

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-6">
      <h2 className="text-base font-semibold text-white">Vessel details</h2>
      <p className="mt-1 text-sm text-muted">
        Metadata is sent with your footage to the import API.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {fields.map(({ key, label, type, placeholder }) => (
          <div key={key} className="space-y-2">
            <label
              className="text-xs font-medium uppercase tracking-widest text-label-text"
              htmlFor={key}
            >
              {label} <span className="text-status-sev">*</span>
            </label>
            <input
              id={key}
              name={key}
              type={type}
              disabled={disabled}
              placeholder={placeholder}
              value={value[key]}
              onChange={(e) => set(key, e.target.value)}
              onFocus={(e) => {
                if (type === "date" && "showPicker" in e.currentTarget) {
                  (
                    e.currentTarget as HTMLInputElement & {
                      showPicker?: () => void;
                    }
                  ).showPicker?.();
                }
              }}
              aria-invalid={requiredErrors?.[key] ? "true" : "false"}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-3 text-sm text-input-text outline-none placeholder:text-placeholder transition-all focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
            />
            {requiredErrors?.[key] ? (
              <p className="text-xs text-status-sev">{requiredErrors[key]}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-2">
        <label
          className="text-xs font-medium uppercase tracking-widest text-label-text"
          htmlFor="notes"
        >
          Optional notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          disabled={disabled}
          placeholder="Dock number, cleaning scope, visibility, …"
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="w-full resize-y rounded-lg border border-input-border bg-input-bg px-3 py-3 text-sm text-input-text outline-none placeholder:text-placeholder transition-all focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
        />
      </div>
    </section>
  );
}
