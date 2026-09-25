"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

type DialogProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Dialog({ title, children, onClose, className = "" }: DialogProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`dialog-card ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-button dialog-close" type="button" aria-label="关闭弹窗" onClick={onClose}>
          ×
        </button>
        {children}
      </section>
    </div>
  );
}
