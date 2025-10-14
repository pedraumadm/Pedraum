// components/PartnersSection.tsx
import { Building2, Users, Briefcase, Handshake } from "lucide-react";

const partners = [
  {
    name: "BritaMax Engenharia",
    description: "Especialistas em britagem e manutenção industrial.",
    icon: <Building2 size={38} className="text-[#FB8500]" />,
    url: "#",
  },
  {
    name: "AgroPneus Serviços",
    description: "Soluções em pneus agrícolas e transporte pesado.",
    icon: <Users size={38} className="text-[#219EBC]" />,
    url: "#",
  },
  {
    name: "Pedra Forte Locação",
    description: "Aluguel de máquinas e equipamentos para mineração.",
    icon: <Briefcase size={38} className="text-[#023047]" />,
    url: "#",
  },
  {
    name: "EcoMove Consultoria",
    description: "Consultoria ambiental e licenciamento para o setor.",
    icon: <Handshake size={38} className="text-[#6d28d9]" />,
    url: "#",
  },
];

export default function PartnersSection() {
  return (
    <section className="w-full py-12 bg-[#f6f9fa]">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-[#023047] mb-3 text-center">
          Nossos Parceiros & Serviços
        </h2>
        <p className="text-lg text-gray-600 text-center mb-8">
          Veja empresas e profissionais que impulsionam negócios no Pedraum
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-7">
          {partners.map((item, idx) => (
            <div
              key={idx}
              className="bg-white shadow-lg rounded-2xl p-6 flex flex-col items-center transition hover:scale-105 hover:shadow-2xl"
            >
              <div className="mb-3">{item.icon}</div>
              <h3 className="text-xl font-semibold text-[#023047] mb-2 text-center">
                {item.name}
              </h3>
              <p className="text-gray-500 text-center text-sm mb-4">
                {item.description}
              </p>
              <a
                href={item.url}
                className="px-4 py-2 rounded-xl bg-[#FB8500] text-white font-medium text-sm shadow hover:bg-[#e17000] transition"
              >
                Saiba mais
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
