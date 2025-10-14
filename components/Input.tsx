// =============================
// components/Input.tsx
// =============================

"use client";

interface InputProps {
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function Input({
  type = "text",
  value,
  onChange,
  placeholder = "",
  className = "",
  required = false,
}: InputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none ${className}`}
    />
  );
}
