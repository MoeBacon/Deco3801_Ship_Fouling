import { useId, useRef, useState } from "react";
import { formatBytes } from "../lib/formatBytes";

export const FOOTAGE_MAX_BYTES = 5 * 1024 ** 3;
const ACCEPT =
  "video/mp4,video/x-msvideo,video/quicktime,video/webm,.mp4,.avi,.mov,.mkv,.webm,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.bmp,.webp";

type FootageDropZoneProps = {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
  error?: string | null;
};

export default function FootageDropZone({
  file,
  onFile,
  disabled,
  error,
}: FootageDropZoneProps) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    onFile(f);
  };

  return (
    <section className="rounded-xl border border-border bg-surface-1 p-6">
      <h2 className="text-base font-semibold text-white">Video footage</h2>
      <p className="mt-1 text-sm text-muted">
        Drag-and-drop or browse — sent to the OpenCV import service.
      </p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        onChange={onInputChange}
      />

      <button
        type="button"
        disabled={disabled}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border bg-surface-0/50"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <svg
            className="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          >
            <path d="M12 15V3m0 0 4 4m-4-4L8 7" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </div>
        <p className="max-w-md text-sm text-muted">
          Drag & drop ROV footage or stills here, or click to browse. MP4, AVI,
          MOV, MKV, WebM; images JPG/PNG/WebP. Max{" "}
          {formatBytes(FOOTAGE_MAX_BYTES)}.
        </p>
        <span className="mt-4 inline-flex rounded-lg border border-input-border bg-input-bg px-4 py-2.5 text-sm font-medium text-input-text hover:bg-surface-2 transition-colors">
          Select file
        </span>
      </button>

      <p id={helpId} className="sr-only" aria-live="polite">
        {dragOver
          ? "Drop file now to upload."
          : "Choose a file or drag and drop footage into the upload area."}
      </p>

      {file ? (
        <div className="mt-4 rounded-lg border border-input-border bg-input-bg px-4 py-3 text-sm text-input-text">
          <span className="font-medium text-input-text">{file.name}</span>
          <span className="text-placeholder"> · {formatBytes(file.size)}</span>
          <button
            type="button"
            disabled={disabled}
            className="ml-3 text-accent hover:underline disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
          >
            Remove
          </button>
        </div>
      ) : null}

      {error ? (
        <p id={errorId} className="mt-2 text-sm text-status-sev" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
