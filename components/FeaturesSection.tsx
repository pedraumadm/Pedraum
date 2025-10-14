"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import {
  Timer,
  Network,
  ShieldCheck,
  Handshake,
  BadgeCheck,
} from "lucide-react";

const features = [
  {
    icon: <Timer size={42} className="text-accent" />,
    title: "Agilidade Real",
    description:
      "Publique sua demanda e receba propostas em poucas horas. Elimine o tempo perdido procurando fornecedores sozinho.",
  },
  {
    icon: <Network size={42} className="text-accent" />,
    title: "Mais Opções",
    description:
      "Acesse uma ampla rede de fornecedores e prestadores de serviço em britagem e mineração, em todo o Brasil.",
  },
  {
    icon: <ShieldCheck size={42} className="text-accent" />,
    title: "Fornecedores selecionados",
    description:
      "Negocie apenas com fornecedores que conseguem atender a sua necessidade. .",
  },
  {
    icon: <Handshake size={42} className="text-accent" />,
    title: "Negociação Direta",
    description:
      "Converse e feche negócios diretamente com quem resolve. Sem intermediários, sem taxas extras, sem complicação.",
  },
  {
    icon: <BadgeCheck size={42} className="text-accent" />,
    title: "Especialização no Setor",
    description:
      "Somos focados no setor de britagem e mineração. Sua demanda é atendida por quem entende do assunto.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="w-full py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Título */}
        <h2 className="text-3xl md:text-4xl font-extrabold text-primary mb-3 text-center">
          Por que usar o <span className="text-accent">Pedraum?</span>
        </h2>
        <p className="text-[15.5px] md:text-base text-slate-600 text-center mb-8 max-w-2xl mx-auto">
          Conectamos sua necessidade aos fornecedores ideais do setor de
          britagem e mineração — <b>mais rápido</b>, com <b>mais opções</b> e{" "}
          <b>menos risco</b>.
        </p>

        {/* Carrossel */}
        <Swiper
          spaceBetween={24}
          slidesPerView={1.15}
          breakpoints={{
            640: { slidesPerView: 2.1, spaceBetween: 24 },
            1024: { slidesPerView: 3.2, spaceBetween: 26 },
          }}
          style={{ padding: "8px 0 30px 0" }}
        >
          {features.map((f, i) => (
            <SwiperSlide key={i}>
              <div className="flex flex-col items-center bg-[#F6F9FA] rounded-2xl shadow-lg p-8 text-center border border-[#ececec] h-full hover:scale-[1.03] transition-transform">
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-bold text-lg md:text-xl text-primary mb-2">
                  {f.title}
                </h3>
                <p className="text-gray-600 text-base md:text-[1.02rem] leading-relaxed">
                  {f.description}
                </p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
