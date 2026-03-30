import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  ChevronLeft,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProof } from "@/hooks/useProof";
import { useReviewProof } from "@/hooks/useReviewProof";

type ModalView = "proof" | "rejecting";

interface ReviewProofModalProps {
  installmentId: string;
  installmentNo: number;
  loanId: string;
  open: boolean;
  onClose: () => void;
}

function isImageUrl(fileUrl: string): boolean {
  const ext = fileUrl.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "heic", "gif"].includes(ext);
}

export function ReviewProofModal({
  installmentId,
  installmentNo,
  loanId,
  open,
  onClose,
}: ReviewProofModalProps) {
  const { profile } = useAuth();
  const [view, setView] = useState<ModalView>("proof");
  const [adminNote, setAdminNote] = useState("");

  const { data: proof, isLoading: proofLoading } = useProof(installmentId, open);
  const { mutateAsync: reviewProof, isPending: reviewing } = useReviewProof(loanId);

  function handleClose() {
    if (reviewing) return;
    setView("proof");
    setAdminNote("");
    onClose();
  }

  async function handleApprove() {
    if (!proof || !profile) return;
    await reviewProof({
      proofId: proof.id,
      installmentId,
      loanId,
      action: "approve",
      adminNote: "",
      reviewedBy: profile.id,
      fileUrl: null,
    });
    handleClose();
  }

  async function handleReject() {
    if (!proof || !profile || !adminNote.trim()) return;
    await reviewProof({
      proofId: proof.id,
      installmentId,
      loanId,
      action: "reject",
      adminNote: adminNote.trim(),
      reviewedBy: profile.id,
      fileUrl: proof.file_url,
    });
    handleClose();
  }

  const isImage = proof?.file_url ? isImageUrl(proof.file_url) : false;

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
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            className="bg-background border-border/60 fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border shadow-2xl"
          >
            {/* Header */}
            <div className="border-border/60 flex items-center gap-3 border-b px-5 py-4">
              {view === "rejecting" && (
                <button
                  onClick={() => {
                    setView("proof");
                    setAdminNote("");
                  }}
                  disabled={reviewing}
                  className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg p-1 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex-1">
                <h2 className="text-foreground font-semibold">
                  {view === "rejecting" ? "Reject Payment" : "Review Proof"}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">Installment #{installmentNo}</p>
              </div>
              <button
                onClick={handleClose}
                disabled={reviewing}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Loading */}
              {proofLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
                </div>
              )}

              {/* No proof found */}
              {!proofLoading && !proof && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <AlertCircle className="text-muted-foreground h-8 w-8" />
                  <p className="text-foreground text-sm font-medium">No proof submitted</p>
                  <p className="text-muted-foreground text-xs">
                    The borrower has not uploaded a payment receipt yet.
                  </p>
                </div>
              )}

              {/* Proof viewer */}
              {!proofLoading && proof && (
                <div className="space-y-4">
                  {/* Borrower note */}
                  {proof.note && (
                    <div className="bg-muted/40 border-border/60 flex gap-2.5 rounded-xl border px-3 py-2.5">
                      <MessageSquare className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p className="text-foreground text-sm">{proof.note}</p>
                    </div>
                  )}

                  {/* Receipt */}
                  {proof.file_url ? (
                    isImage && proof.signedUrl ? (
                      <div className="border-border/60 overflow-hidden rounded-xl border">
                        <img
                          src={proof.signedUrl}
                          alt="Payment receipt"
                          className={cn(
                            "w-full object-contain",
                            view === "rejecting" ? "max-h-40" : "max-h-72"
                          )}
                        />
                      </div>
                    ) : (
                      /* PDF / unsupported */
                      <div className="border-border/60 bg-muted/30 flex items-center gap-3 rounded-xl border p-4">
                        <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                          <FileText className="text-primary h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-medium">
                            {proof.file_url.split("/").pop()}
                          </p>
                          <p className="text-muted-foreground text-xs">PDF document</p>
                        </div>
                      </div>
                    )
                  ) : (
                    /* No receipt attached */
                    <div className="border-border/60 bg-muted/20 flex items-center gap-2.5 rounded-xl border px-3 py-2.5">
                      <Paperclip className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                      <p className="text-muted-foreground text-xs">No receipt attached</p>
                    </div>
                  )}

                  {/* Open full size link */}
                  {proof.signedUrl && (
                    <a
                      href={proof.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary/80 hover:text-primary flex cursor-pointer items-center gap-1.5 text-xs transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open full size
                    </a>
                  )}

                  {/* Rejection note input */}
                  {view === "rejecting" && (
                    <div className="space-y-1.5">
                      <label className="text-foreground text-xs font-medium">
                        Reason for rejection <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        rows={3}
                        placeholder="Explain why this payment is being rejected…"
                        className="bg-muted/50 border-border/60 focus:border-primary/60 placeholder:text-muted-foreground/50 w-full resize-none rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {!proofLoading && proof && (
              <div className="border-border/60 flex items-center justify-end gap-3 border-t px-5 py-4">
                {view === "proof" ? (
                  <>
                    <button
                      onClick={() => setView("rejecting")}
                      disabled={reviewing}
                      className="cursor-pointer rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => void handleApprove()}
                      disabled={reviewing}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Approve Payment
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setView("proof");
                        setAdminNote("");
                      }}
                      disabled={reviewing}
                      className="border-border/60 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void handleReject()}
                      disabled={!adminNote.trim() || reviewing}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-600 disabled:opacity-50"
                    >
                      {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Confirm Rejection
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
