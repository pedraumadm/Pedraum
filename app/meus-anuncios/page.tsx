// =============================
// app/meus-anuncios/page.tsx
// =============================

"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import LayoutWithSidebar from "@/components/LayoutWithSidebar";

interface Machine {
  id: string;
  nome: string;
  preco: string;
  imagens: string[];
  categoria: string;
  descricao: string;
  userId: string;
}

export default function MeusAnunciosPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyMachines = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(
        collection(db, "machines"),
        where("userId", "==", user.uid),
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Machine[];
      setMachines(data);
      setLoading(false);
    };

    fetchMyMachines();
  }, []);

  return (
    <LayoutWithSidebar>
      <div>
        <h1 className="text-3xl font-bold text-[#023047] mb-6">
          Meus Anúncios
        </h1>
        {loading ? (
          <p className="text-gray-500">Carregando seus anúncios...</p>
        ) : machines.length === 0 ? (
          <p className="text-gray-600">
            Você ainda não cadastrou nenhuma máquina.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {machines.map((machine) => (
              <div
                key={machine.id}
                className="bg-white border border-gray-200 rounded-2xl shadow hover:shadow-md transition-all overflow-hidden"
              >
                <img
                  src={machine.imagens?.[0] || "/no-image.png"}
                  alt={machine.nome}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 space-y-2">
                  <h3 className="text-lg font-bold text-[#023047]">
                    {machine.nome}
                  </h3>
                  <p className="text-sm text-gray-600">{machine.categoria}</p>
                  <p className="text-sm text-gray-800 font-medium">
                    R$ {machine.preco}
                  </p>
                  <a
                    href={`/machines/${machine.id}`}
                    className="inline-block mt-2 text-sm text-white bg-[#FB8500] hover:bg-[#FFB703] transition-colors px-4 py-1 rounded-full"
                  >
                    Ver detalhes
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  );
}
