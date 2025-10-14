"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query as fsQuery,
  where,
} from "firebase/firestore";

type DemandFire = {
  titulo?: string;
  categoria?: string;
  cidade?: string;
  estado?: string;
  priceCents?: number;
  visivel?: boolean;
  createdAt?: any;
};

type DemandaMini = DemandFire & { id: string };

function currencyCents(cents?: number) {
  const n = Number(cents ?? 0);
  if (!n) return "R$ 0,00";
  return `R$ ${(n / 100).toFixed(2).replace(".", ",")}`;
}

type Props = {
  currentId: string;
  categoria?: string;
  title?: string;
  take?: number;
  debug?: boolean; // loga no console
  showWhenEmpty?: boolean; // mostra título mesmo vazio
};

export default function RelatedDemandsCarousel({
  currentId,
  categoria,
  title = "Você também pode querer atender",
  take = 10,
  debug = false,
  showWhenEmpty = false,
}: Props) {
  const [items, setItems] = useState<DemandaMini[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stop = false;

    async function fetchData() {
      try {
        const col = collection(db, "demandas");

        // 1) tenta por categoria
        let list: DemandaMini[] = [];
        if (categoria) {
          let q = fsQuery(
            col,
            where("categoria", "==", categoria),
            limit(take),
          );
          try {
            q = fsQuery(
              col,
              where("categoria", "==", categoria),
              orderBy("createdAt", "desc"),
              limit(take),
            );
          } catch {}
          const snaps = await getDocs(q);
          snaps.forEach((s) => {
            if (s.id === currentId) return;
            const d = s.data() as DemandFire;
            if (d?.visivel === false) return;
            list.push({ id: s.id, ...d });
          });
        }

        // 2) fallback: recentes (caso não tenha nada por categoria)
        if (list.length === 0) {
          let q2 = fsQuery(col, limit(take));
          try {
            q2 = fsQuery(col, orderBy("createdAt", "desc"), limit(take));
          } catch {}
          const snaps2 = await getDocs(q2);
          const seen = new Set(list.map((i) => i.id));
          snaps2.forEach((s) => {
            if (s.id === currentId || seen.has(s.id)) return;
            const d = s.data() as DemandFire;
            if (d?.visivel === false) return;
            list.push({ id: s.id, ...d });
          });
        }

        if (debug) {
          // eslint-disable-next-line no-console
          console.log(
            "[RelatedDemandsCarousel] categoria:",
            categoria,
            "itens:",
            list.length,
          );
        }

        if (!stop) setItems(list);
      } catch (e) {
        if (debug) console.error("[RelatedDemandsCarousel] erro:", e);
        if (!stop) setItems([]);
      } finally {
        if (!stop) setLoading(false);
      }
    }

    fetchData();
    return () => {
      stop = true;
    };
  }, [currentId, categoria, take, debug]);

  if (loading) {
    return (
      <div className="op-recomenda">
        <h3>{title}</h3>
        <div className="op-carousel">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="op-card-mini op-card-skel" />
          ))}
        </div>
        <Styles />
      </div>
    );
  }

  if (!items.length && !showWhenEmpty) return null;

  return (
    <div className="op-recomenda">
      <h3>{title}</h3>
      {items.length ? (
        <div className="op-carousel" role="list">
          {items.map((d) => (
            <Link
              role="listitem"
              key={d.id}
              href={`/demandas/${d.id}`}
              className="op-card-mini"
              title={d.titulo || "Ver demanda"}
            >
              <div className="op-card-mini-title">{d.titulo || "Demanda"}</div>
              <div className="op-card-mini-meta">
                {d.categoria || "—"} • {d.cidade || "—"}
                {d.estado ? `, ${d.estado}` : ""}
              </div>
              <div className="op-card-mini-price">
                {currencyCents(d.priceCents)}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="op-empty">Sem recomendações no momento.</div>
      )}
      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style jsx>{`
      .op-recomenda {
        margin-top: 34px;
      }
      .op-recomenda h3 {
        font-size: 1.25rem;
        font-weight: 800;
        color: #023047;
        margin-bottom: 12px;
      }
      .op-empty {
        padding: 14px;
        border: 1.5px dashed #e5e7eb;
        border-radius: 12px;
        color: #475569;
        background: #fff;
      }
      .op-carousel {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        padding-bottom: 10px;
        scroll-snap-type: x mandatory;
      }
      .op-carousel::-webkit-scrollbar {
        height: 8px;
      }
      .op-carousel::-webkit-scrollbar-thumb {
        background: #d9e7ef;
        border-radius: 999px;
      }
      .op-card-mini {
        flex: 0 0 240px;
        scroll-snap-align: start;
        background: #fff;
        border: 1.5px solid #e5e7eb;
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 2px 10px #0000000a;
        transition: transform 0.15s;
        text-decoration: none;
      }
      .op-card-mini:hover {
        transform: translateY(-2px);
      }
      .op-card-mini-title {
        font-weight: 800;
        color: #111827;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .op-card-mini-meta {
        font-size: 0.9rem;
        color: #555;
        margin-bottom: 6px;
      }
      .op-card-mini-price {
        font-weight: 900;
        color: #fb8500;
      }
      .op-card-skel {
        height: 110px;
        background: linear-gradient(
          90deg,
          #eef5fb 25%,
          #f5faff 37%,
          #eef5fb 63%
        );
        background-size: 400% 100%;
        animation: opShimmer 1.3s infinite;
        border-radius: 14px;
      }
      @keyframes opShimmer {
        0% {
          background-position: 100% 0;
        }
        100% {
          background-position: 0 0;
        }
      }
    `}</style>
  );
}
