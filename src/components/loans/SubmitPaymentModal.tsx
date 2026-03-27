import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Upload, FileText, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSubmitPaymentProof } from "@/hooks/useSubmitPaymentProof";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SubmitPaymentModalProps {
  installmentId: string;
  installmentNo: number;
  loanId: string;
  open: boolean;
  onClose: () => void;
}

export function SubmitPaymentModal({
  installmentId,
  installmentNo,
  loanId,
  open,
  onClose,
}: SubmitPaymentModalProps) {
  const { profile } = useAuth();
  const { mutateAsync: submitProof, isPending } = useSubmitPaymentProof(loanId);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    if (isPending) return;
    setFile(null);
    setPreview(null);
    setFileError(null);
    onClose();
  }

  function validateAndSet(selected: File) {
    setFileError(null);

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError("Only JPG, PNG, WebP, HEIC, or PDF files are accepted.");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setFileError(`File exceeds the ${MAX_SIZE_MB} MB limit.`);
      return;
    }

    setFile(selected);

    if (selected.type.startsWith("image/")) {
      const url = URL.createObjectURL(selected);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) validateAndSet(selected);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSet(dropped);
  }

  async function handleSubmit() {
    if (!file || !profile) return;

    await submitProof({
      installmentId,
      loanId,
      borrowerId: profile.id,
      file,
    });

    handleClose();
  }

  const isImage = file?.type.startsWith("image/");

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            className="bg-background border-border/60 fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border shadow-2xl"
          >
            {/* Header */}
            <div className="border-border/60 flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-foreground font-semibold">Submit Payment</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Installment #{installmentNo} — attach your receipt
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {/* Drop zone */}
              <div
                onClick={() => !isPending && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors",
                  isDragging
                    ? "border-primary/60 bg-primary/5"
                    : "border-border/60 hover:border-border hover:bg-muted/30",
                  isPending && "pointer-events-none opacity-50"
                )}
              >
                {/* Preview or placeholder */}
                {file ? (
                  isImage && preview ? (
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="max-h-40 w-full rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl">
                        <FileText className="text-primary h-6 w-6" />
                      </div>
                      <p className="text-foreground text-sm font-medium">{file.name}</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">
                      <ImageIcon className="text-muted-foreground h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-foreground text-sm font-medium">
                        Drop file or click to upload
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        JPG, PNG, WebP, HEIC, PDF · max {MAX_SIZE_MB} MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* File info */}
              {file && (
                <div className="border-border/60 flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isImage
                      ? <ImageIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                      : <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                    }
                    <span className="text-foreground truncate text-xs">{file.name}</span>
                  </div>
                  <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                    {formatBytes(file.size)}
                  </span>
                </div>
              )}

              {/* Validation error */}
              {fileError && (
                <div className="flex items-center gap-2 text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {fileError}
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Footer */}
            <div className="border-border/60 flex items-center justify-end gap-3 border-t px-5 py-4">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="border-border/60 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!file || !!fileError || isPending}
                className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Proof
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
