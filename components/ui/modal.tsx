import { useEffect } from "react";

export default function Modal({
  show,
  onClose,
  children,
}: {
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // ESC ile kapat
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      console.log(e.key);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!show) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-overlay w-full max-w-lg rounded-lg border bg-card p-6 text-card-foreground shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
