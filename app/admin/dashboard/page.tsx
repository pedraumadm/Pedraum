"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Layers,
  Star,
  BarChart,
  ShoppingCart,
  MessageCircle,
  Bell,
  DollarSign,
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
import Link from "next/link";

// Dados mock para exemplo
const stats = {
  usuarios: 218,
  maquinas: 44,
  vendas: 19,
  demandas: 13,
  faturamento: 95400,
  mensagens: 7,
  notificacoes: 5,
  avaliacoes: 25,
};

const activityData = [
  { name: "Jan", vendas: 6 },
  { name: "Fev", vendas: 9 },
  { name: "Mar", vendas: 13 },
  { name: "Abr", vendas: 11 },
  { name: "Mai", vendas: 19 },
  { name: "Jun", vendas: 14 },
];

export default function AdminDashboard() {
  return (
    <main className="min-h-screen bg-[#f6f9fa] flex flex-col items-center py-10 px-2">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#023047] mb-2 flex items-center gap-2">
          <BarChart className="text-[#FB8500]" size={32} /> Dashboard
          Administrativo
        </h1>
        <p className="text-gray-600 mb-6">
          Visão geral da plataforma e métricas principais do Pedraum.
        </p>

        {/* KPIs/Indicadores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-6 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <Users className="text-[#FB8500] mb-1" size={30} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.usuarios}
            </div>
            <div className="text-sm font-medium text-gray-500">Usuários</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-6 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <Layers className="text-[#FB8500] mb-1" size={30} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.maquinas}
            </div>
            <div className="text-sm font-medium text-gray-500">Máquinas</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-6 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <ShoppingCart className="text-[#FB8500] mb-1" size={30} />
            <div className="text-2xl font-bold text-[#023047]">
              {stats.vendas}
            </div>
            <div className="text-sm font-medium text-gray-500">Vendas</div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-6 text-center shadow hover:shadow-lg flex flex-col items-center"
          >
            <DollarSign className="text-[#FB8500] mb-1" size={30} />
            <div className="text-2xl font-bold text-[#023047]">
              R$ {stats.faturamento.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-gray-500">Faturamento</div>
          </motion.div>
        </div>

        {/* Indicadores Secundários */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-4 text-center shadow flex flex-col items-center"
          >
            <Star className="text-[#FB8500] mb-1" size={28} />
            <div className="text-lg font-bold text-[#023047]">
              {stats.avaliacoes}
            </div>
            <div className="text-xs font-medium text-gray-500">Avaliações</div>
            <Link
              href="/admin/avaliacoes"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver todas
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-4 text-center shadow flex flex-col items-center"
          >
            <MessageCircle className="text-[#FB8500] mb-1" size={28} />
            <div className="text-lg font-bold text-[#023047]">
              {stats.mensagens}
            </div>
            <div className="text-xs font-medium text-gray-500">Mensagens</div>
            <Link
              href="/admin/mensagens"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver mensagens
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-4 text-center shadow flex flex-col items-center"
          >
            <Bell className="text-[#FB8500] mb-1" size={28} />
            <div className="text-lg font-bold text-[#023047]">
              {stats.notificacoes}
            </div>
            <div className="text-xs font-medium text-gray-500">
              Notificações
            </div>
            <Link
              href="/admin/notificacoes"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver notificações
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.08 }}
            className="rounded-2xl bg-[#F6F9FA] border border-[#e0e0e0] p-4 text-center shadow flex flex-col items-center"
          >
            <BarChart className="text-[#FB8500] mb-1" size={28} />
            <div className="text-lg font-bold text-[#023047]">
              {stats.demandas}
            </div>
            <div className="text-xs font-medium text-gray-500">Demandas</div>
            <Link
              href="/admin/demandas"
              className="text-xs text-[#FB8500] mt-1 hover:underline"
            >
              Ver demandas
            </Link>
          </motion.div>
        </div>

        {/* Gráfico de vendas/faturamento */}
        <div className="bg-[#f8fafc] rounded-2xl shadow-inner p-4 mb-10 border border-[#e0e0e0]">
          <h2 className="text-lg font-bold text-[#023047] mb-4">
            Vendas na Plataforma (últimos 6 meses)
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
                dataKey="vendas"
                stroke="#FB8500"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Atividades rápidas / notificações */}
        <div className="bg-[#f8fafc] rounded-2xl shadow-inner p-4 border border-[#e0e0e0]">
          <h2 className="text-lg font-bold text-[#023047] mb-2">
            Ações rápidas do admin
          </h2>
          <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
            <li>
              <Link
                href="/admin/maquinas-pendentes"
                className="text-[#FB8500] hover:underline font-semibold"
              >
                Aprovar máquinas pendentes
              </Link>
            </li>
            <li>
              <Link
                href="/admin/denuncias"
                className="text-[#FB8500] hover:underline font-semibold"
              >
                Analisar denúncias/reclamações
              </Link>
            </li>
            <li>
              <Link
                href="/admin/usuarios"
                className="text-[#FB8500] hover:underline font-semibold"
              >
                Gerenciar usuários e permissões
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
