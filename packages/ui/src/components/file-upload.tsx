"use client";

import { type ChangeEvent, type DragEvent, type ReactNode, useId, useRef, useState } from "react";
import { cn } from "../lib/cn";

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_FILES = 1;

export interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  onFilesChange: (files: File[]) => void;
  onUploadProgress?: (progress: number) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept.split(",").map((pattern) => pattern.trim());
  return patterns.some((pattern) => {
    if (pattern.endsWith("/*")) return file.type.startsWith(pattern.slice(0, -1));
    if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    return file.type === pattern;
  });
}

function ClipIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 7l-7.5 7.5a3 3 0 004.24 4.24L21 12" />
      <path d="M17 7a4 4 0 00-5.66 0L4.5 13.84a5.5 5.5 0 007.78 7.78" />
    </svg>
  );
}

function RemoveIcon(): ReactNode {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

/** @spec SPEC-20260525-001 §7.1 */
export function FileUpload({
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  onFilesChange,
  error,
  disabled = false,
  label,
  hint,
  className,
}: FileUploadProps): ReactNode {
  const inputId = useId();
  const errorId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function acceptFiles(candidates: File[]): void {
    setValidationError(undefined);

    const invalidType = candidates.find((file) => !matchesAccept(file, accept));
    if (invalidType) {
      setValidationError(`Tipo de arquivo não suportado: ${invalidType.name}`);
      return;
    }

    const oversized = candidates.find((file) => file.size > maxSize);
    if (oversized) {
      setValidationError(`${oversized.name} excede o tamanho máximo de ${formatSize(maxSize)}`);
      return;
    }

    const merged = [...files, ...candidates];
    if (merged.length > maxFiles) {
      setValidationError(
        maxFiles === 1 ? "Selecione apenas 1 arquivo" : `Selecione no máximo ${maxFiles} arquivos`,
      );
      return;
    }

    setFiles(merged);
    onFilesChange(merged);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > 0) acceptFiles(selected);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const dropped = Array.from(event.dataTransfer.files ?? []);
    if (dropped.length > 0) acceptFiles(dropped);
  }

  function removeFile(index: number): void {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFilesChange(next);
  }

  const combinedError = error ?? validationError;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      )}
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border",
          combinedError && "border-danger",
          disabled && "pointer-events-none cursor-not-allowed opacity-50",
        )}
      >
        <span className="text-muted-foreground" aria-hidden="true">
          <ClipIcon />
        </span>
        <span className="text-sm">
          Arraste arquivos aqui ou{" "}
          <span className="font-medium text-primary underline underline-offset-2">Selecionar arquivo</span>
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          disabled={disabled}
          onChange={handleInputChange}
          aria-describedby={combinedError ? errorId : undefined}
          className="sr-only"
        />
      </label>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remover ${file.name}`}
                className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <RemoveIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {combinedError && (
        <p id={errorId} className="text-sm text-danger">
          {combinedError}
        </p>
      )}
    </div>
  );
}
