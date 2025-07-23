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
      className="fixed inset-0 bg-[rgba(0,0,0,0.9)] flex items-center justify-center z-50"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg shadow-lg p-6 w-full max-w-lg"
      >
        {children}
      </div>
    </div>
  );
}
