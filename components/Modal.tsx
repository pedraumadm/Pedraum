// =============================
// components/Modal.tsx
// =============================

"use client";

import { ReactNode } from "react";

interface ModalProps {
  show: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function Modal({ show, onClose, children, title }: ModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full p-6 relative">
        {title && (
          <h2 className="text-xl font-semibold text-[#023047] mb-4">{title}</h2>
        )}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-xl"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
