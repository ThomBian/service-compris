import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useToast, type Toast } from "../context/ToastContext";

const VARIANT_CLASSES: Record<Toast["variant"], string> = {
  success:
    "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-[2px_2px_0px_0px_rgba(5,150,105,0.4)]",
  error:
    "bg-red-50 border-red-600 text-red-700 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.4)]",
  warning:
    "bg-amber-50 border-amber-500 text-amber-700 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.4)]",
  info: "bg-white border-[#141414] text-stone-900 shadow-[2px_2px_0px_0px_rgba(20,20,20,0.15)]",
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast();
  return createPortal(
    <div className="fixed top-16 left-4 z-9999 flex flex-col items-start gap-2 pointer-events-none">
      {/* Top-left under the header, aligned with TopBar padding — same band as clock / rating / cash. */}
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`rounded-lg px-3 py-2 text-[11px] border max-w-[240px] ${VARIANT_CLASSES[toast.variant]}`}
          >
            <div className="font-bold leading-snug">{toast.title}</div>
            {toast.detail && (
              <div className="opacity-70 mt-0.5 leading-snug">
                {toast.detail}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
};
