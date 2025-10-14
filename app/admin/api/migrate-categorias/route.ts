// app/api/admin/migrate-categorias/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { mapAntigoParaNovo } from "@/lib/mapCategorias";

type Pair = { categoria: string; subcategoria: string };

function norm(s = "") {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function dedupPairs(pairs: Pair[]) {
  const m = new Map<string, Pair>();
  for (const p of pairs)
    m.set(`${norm(p.categoria)}::${norm(p.subcategoria)}`, p);
  return Array.from(m.values());
}

const MAX_CATS = 5;

function limitByTopCategories(pairs: Pair[]) {
  const catFreq = new Map<string, number>();
  for (const p of pairs)
    catFreq.set(p.categoria, (catFreq.get(p.categoria) || 0) + 1);
  const distinct = Array.from(new Set(pairs.map((p) => p.categoria)));
  if (distinct.length <= MAX_CATS) return pairs;

  const top = distinct
    .sort((a, b) => catFreq.get(b)! - catFreq.get(a)!)
    .slice(0, MAX_CATS);
  return pairs.filter((p) => top.includes(p.categoria));
}

export async function POST(req: NextRequest) {
  try {
    const { pageSize = 64 } = await req.json().catch(() => ({ pageSize: 64 }));

    const snap = await getDocs(collection(db, "usuarios"));

    let migrados = 0;
    for (const d of snap.docs) {
      if (migrados >= pageSize) break;

      const u = d.data() || {};

      // Coleta possíveis fontes “legado”
      const legacyStrings: string[] = [
        ...(Array.isArray(u.categorias) ? u.categorias : []),
        ...(Array.isArray(u.categoriasAtuacao) ? u.categoriasAtuacao : []),
      ].filter(Boolean);

      // Se já tem pares novos bonitinhos, pula
      if (
        Array.isArray(u.categoriasAtuacaoPairs) &&
        u.categoriasAtuacaoPairs.length > 0 &&
        legacyStrings.length === 0
      ) {
        continue;
      }

      // Tenta extrair rastro de pares antigos (às vezes era só texto)
      if (Array.isArray(u.categoriasAtuacaoPairs)) {
        for (const p of u.categoriasAtuacaoPairs) {
          const c = [p?.categoria, p?.subcategoria].filter(Boolean).join(" ");
          if (c) legacyStrings.push(c);
        }
      }

      const mapped = dedupPairs(
        legacyStrings.map((txt) => mapAntigoParaNovo(String(txt))),
      );
      if (mapped.length === 0) continue;

      const finais = limitByTopCategories(mapped);
      const cats = Array.from(new Set(finais.map((p) => p.categoria)));

      await updateDoc(doc(db, "usuarios", d.id), {
        categoriasAtuacaoPairs: finais,
        categoriasAtuacao: cats,
        // opcional: limpe campos legados
        // categorias: [],
      });

      migrados++;
    }

    return NextResponse.json({ ok: true, migrados });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 },
    );
  }
}
