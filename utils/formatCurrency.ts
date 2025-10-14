// =============================
// utils/formatCurrency.ts
// =============================

export function formatCurrency(valor: number | string) {
  const numero = typeof valor === "string" ? parseFloat(valor) : valor;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
