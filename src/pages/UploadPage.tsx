import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FootageDropZone, {
  FOOTAGE_MAX_BYTES,
} from "../components/FootageDropZone";
import ImportStatusCard from "../components/ImportStatusCard";
import PageHeader from "../components/PageHeader";
import VesselDetailsForm from "../components/VesselDetailsForm";
import { useImportWorkflow } from "../features/import/useImportWorkflow";
import type { VesselFormPayload } from "../features/import/types";
import { formatBytes } from "../lib/formatBytes";
import { ROUTES } from "../lib/routes";
import { readUploadDraft, writeUploadDraft } from "../lib/uploadDraft";

const emptyVessel: VesselFormPayload = {
  vessel_name: "",
  inspection_date: "",
  operator_name: "",
  location: "",
  notes: "",
};

const REQUIRED_VESSEL_FIELDS: Array<keyof VesselFormPayload> = [
  "vessel_name",
  "inspection_date",
  "operator_name",
  "location",
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export default function UploadPage() {
  const [initialDraft] = useState(() => readUploadDraft());
  const navigate = useNavigate();
  const [vessel, setVessel] = useState<VesselFormPayload>(() => ({
    ...emptyVessel,
    ...(initialDraft?.vessel ?? {}),
  }));
  const [file, setFile] = useState<File | null>(null);
  const [footageError, setFootageError] = useState<string | null>(null);
  const [vesselErrors, setVesselErrors] = useState<
    Partial<Record<keyof VesselFormPayload, string>>
  >({});
  const [lastImportedVessel, setLastImportedVessel] =
    useState<VesselFormPayload | null>(
      () => initialDraft?.result?.vessel ?? null,
    );
  const {
    uploading,
    result,
    setResult,
    importError,
    setImportError,
    liveJob,
    liveStage,
    processingDelayElapsed,
    runImport: executeImport,
  } = useImportWorkflow(vessel);

  useEffect(() => {
    writeUploadDraft({ vessel, result });
  }, [vessel, result]);

  const onPickFile = (f: File | null) => {
    setImportError(null);
    setResult(null);
    setFootageError(null);
    if (f && f.size > FOOTAGE_MAX_BYTES) {
      setFootageError(
        `File exceeds maximum size of ${formatBytes(FOOTAGE_MAX_BYTES)}.`,
      );
      setFile(null);
      return;
    }

    if (f && lastImportedVessel) {
      const sameMetadata = REQUIRED_VESSEL_FIELDS.every(
        (field) =>
          normalizeText(vessel[field]) ===
          normalizeText(lastImportedVessel[field]),
      );
      if (sameMetadata) {
        const shouldContinue = window.confirm(
          "This vessel name/date/operator/location matches your last upload. Consider updating metadata to avoid duplicates. Continue anyway?",
        );
        if (!shouldContinue) {
          setFile(null);
          return;
        }
      }
    }
    setFile(f);
  };

  const runImport = async () => {
    if (!file) {
      setImportError("Select a video or image file first.");
      return;
    }
    const nextErrors: Partial<Record<keyof VesselFormPayload, string>> = {};
    for (const field of REQUIRED_VESSEL_FIELDS) {
      if (!vessel[field].trim()) {
        nextErrors[field] = "This field is required.";
      }
    }
    setVesselErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setImportError("Fill in all required vessel details before uploading.");
      return;
    }
    const data = await executeImport(file, vessel);
    if (data) {
      setLastImportedVessel(data.vessel);
    }
  };

  const goAnalysis = () => {
    if (!result?.ok) return;
    void navigate(ROUTES.analysisByVideo(result.video_id), {
      state: { import: result },
    });
  };

  const busy = uploading;

  return (
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <PageHeader
        breadcrumbs={["Inspections", "New Import"]}
        title="Upload & Import Inspection"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <VesselDetailsForm
          value={vessel}
          onChange={(next) => {
            setVessel(next);
            if (Object.keys(vesselErrors).length > 0) {
              const cleaned: Partial<Record<keyof VesselFormPayload, string>> =
                {};
              for (const key of REQUIRED_VESSEL_FIELDS) {
                if (!next[key].trim()) cleaned[key] = "This field is required.";
              }
              setVesselErrors(cleaned);
            }
          }}
          disabled={busy}
          requiredErrors={vesselErrors}
        />

        <FootageDropZone
          file={file}
          onFile={onPickFile}
          disabled={busy}
          error={footageError}
        />

        {importError ? (
          <div className="rounded-lg border border-status-sev/40 bg-status-sev/10 px-4 py-3 text-sm text-red-100">
            {importError}
          </div>
        ) : null}

        <ImportStatusCard
          uploading={uploading}
          result={result}
          clientFile={file}
          liveJob={liveJob}
          liveStage={liveStage}
          processingDelayElapsed={processingDelayElapsed}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => {
              void runImport();
            }}
            className="inline-flex w-full items-center justify-center rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm font-semibold text-input-text hover:bg-surface-1 disabled:opacity-50 transition-colors sm:w-auto"
          >
            {uploading ? "Uploading & processing…" : "Upload video & queue job"}
          </button>

          <button
            type="button"
            disabled={!result?.ok || busy}
            onClick={goAnalysis}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50 transition-colors sm:ml-auto sm:w-auto sm:min-w-[200px]"
          >
            <span>Run analysis</span>
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8 5v14l11-7L8 5Z" />
            </svg>
          </button>
        </div>

        {result?.ok ? (
          <p className="text-xs text-muted">
            Previous import is saved for this tab. You can switch sections and
            come back without losing this analysis link.
          </p>
        ) : null}

        <p className="text-xs text-muted">
          Backend:{" "}
          <code className="rounded bg-surface-1 px-1 py-0.5 text-slate-300">
            uvicorn app.main:app --reload
          </code>
          . Vite proxies{" "}
          <code className="rounded bg-surface-1 px-1 py-0.5 text-slate-300">
            /api
          </code>{" "}
          and{" "}
          <code className="rounded bg-surface-1 px-1 py-0.5 text-slate-300">
            /static
          </code>{" "}
          to that server.
        </p>
      </div>
    </div>
  );
}
