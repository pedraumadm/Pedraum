// =============================
// components/Pagination.tsx
// =============================

"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center mt-8 gap-2">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            currentPage === page
              ? "bg-[#FB8500] text-white"
              : "bg-white border border-gray-300 hover:bg-gray-100 text-[#023047]"
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
}
