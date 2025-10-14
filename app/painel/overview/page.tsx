"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Star,
  Bell,
  MessageCircle,
  Heart,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Exemplo de dados para o gráfico de visitas/atividade
const activityData = [
  { name: "Seg", visitas: 23 },
  { name: "Ter", visitas: 40 },
  { name: "Qua", visitas: 35 },
  { name: "Qui", visitas: 28 },
  { name: "Sex", visitas: 48 },
  { name: "Sáb", visitas: 54 },
  { name: "Dom", visitas: 41 },
];

const stats = {
  maquinas: 2,
  favoritos: 4,
  mensagens: 1,
  notificacoes: 2,
  avaliacoes: 5,
};

export default function OverviewPage() {
  return (
    <main className="min-h-screen bg-[#f6f9fa] flex flex-col items-center py-10 px-2">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#023047] mb-2 flex items-center gap-2">
          <BarChart className="text-[#FB8500]" size={32} /> Visão Geral do
          Painel
        </h1>
        <p className="text-gray-600 mb-6">
          Aqui você encontra os principais números e desempenho da sua conta.
        </p>

        {/* KPIs/Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-5 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <Layers className="text-[#FB8500] mb-1" size={32} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.maquinas}
            </div>
            <div className="text-sm font-medium text-gray-500">Máquinas</div>
            <Link
              href="/machines"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver todas
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-5 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <Heart className="text-[#FB8500] mb-1" size={32} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.favoritos}
            </div>
            <div className="text-sm font-medium text-gray-500">Favoritos</div>
            <Link
              href="/favoritos"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver favoritos
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-5 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <MessageCircle className="text-[#FB8500] mb-1" size={32} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.mensagens}
            </div>
            <div className="text-sm font-medium text-gray-500">Mensagens</div>
            <Link
              href="/mensagens"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver mensagens
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-5 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <Bell className="text-[#FB8500] mb-1" size={32} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.notificacoes}
            </div>
            <div className="text-sm font-medium text-gray-500">
              Notificações
            </div>
            <Link
              href="/notificacoes"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver notificações
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-5 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <Star className="text-[#FB8500] mb-1" size={32} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.avaliacoes}
            </div>
            <div className="text-sm font-medium text-gray-500">Avaliações</div>
            <Link
              href="/avaliacoes"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver avaliações
            </Link>
          </motion.div>
        </div>

        {/* Gráfico de Atividade */}
        <div className="bg-[#f8fafc] rounded-2xl shadow-inner p-4 mb-10 border border-[#e0e0e0]">
          <h2 className="text-lg font-bold text-[#023047] mb-4">
            Atividade na Plataforma (últimos 7 dias)
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={activityData}
              margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="visitas"
                stroke="#FB8500"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Atividades recentes (mock simples) */}
        <div className="bg-[#f8fafc] rounded-2xl shadow-inner p-4 border border-[#e0e0e0]">
          <h2 className="text-lg font-bold text-[#023047] mb-2">
            Minhas atividades recentes
          </h2>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
            <li>Você recebeu 1 nova mensagem.</li>
            <li>
              Seu anúncio{" "}
              <span className="font-semibold text-[#FB8500]">
                Britador 90×26
              </span>{" "}
              foi publicado.
            </li>
            <li>Você tem 2 notificações não lidas.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
