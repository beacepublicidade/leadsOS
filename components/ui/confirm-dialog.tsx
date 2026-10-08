"use client";

interface ConfirmDialogProps {
  title:     string;
  message:   string;
  variant?:  "danger" | "warning";
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel:  () => void;
}

export function ConfirmDialog({
  title,
  message,
  variant = "danger",
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const btnColor = variant === "danger"
    ? { background: "var(--error-light)", color: "var(--error)", border: "1px solid var(--error-border)" }
    : { background: "var(--warning-light)", color: "var(--warning)", border: "1px solid var(--warning-border)" };

  return (
    <div className="overlay" style={{ zIndex: 60 }}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
          {title}
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-sm" style={btnColor} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
