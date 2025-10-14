// =============================
// components/Select.tsx
// =============================

"use client";

interface SelectProps {
  options: string[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  required?: boolean;
}

export default function Select({
  options,
  value,
  onChange,
  className = "",
  required = false,
}: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      required={required}
      className={`w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none ${className}`}
    >
      <option value="">Selecione uma opção</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
