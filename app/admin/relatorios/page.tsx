"use client";

import LayoutWithSidebar from "@/components/LayoutWithSidebar";
import { useEffect, useState } from "react";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function RelatoriosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [demandas, setDemandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarRelatorios() {
      const usuariosSnap = await getDocs(collection(db, "usuarios"));
      const maquinasSnap = await getDocs(collection(db, "maquinas"));
      const demandasSnap = await getDocs(collection(db, "demandas"));

      setUsuarios(usuariosSnap.docs.map((doc) => doc.data()));
      setMaquinas(maquinasSnap.docs.map((doc) => doc.data()));
      setDemandas(demandasSnap.docs.map((doc) => doc.data()));
      setLoading(false);
    }

    carregarRelatorios();
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-[#023047] mb-8">
          Relatórios da Plataforma
        </h1>

        {loading ? (
          <p className="text-gray-500">Carregando dados...</p>
        ) : (
          <div className="space-y-8">
            <RelatorioCard
              titulo="Total de usuários cadastrados"
              valor={usuarios.length}
            />
            <RelatorioCard
              titulo="Total de máquinas postadas"
              valor={maquinas.length}
            />
            <RelatorioCard
              titulo="Total de demandas recebidas"
              valor={demandas.length}
            />

            <div className="mt-10">
              <h2 className="text-xl font-semibold text-[#023047] mb-4">
                Usuários (amostra)
              </h2>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                {usuarios.slice(0, 5).map((u, i) => (
                  <li key={i}>
                    {u.nome || "Usuário sem nome"} — {u.email || "sem email"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  );
}

function RelatorioCard({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div className="bg-white border rounded-xl shadow p-6">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className="text-3xl font-bold text-[#023047]">{valor}</p>
    </div>
  );
}
