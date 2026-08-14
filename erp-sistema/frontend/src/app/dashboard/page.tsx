'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Stats {
  users: number;
  products: number;
  orders: number;
  inventory: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ users: 0, products: 0, orders: 0, inventory: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Request page=1&limit=1 to get meta.total without loading all records
    Promise.allSettled([
      api.get<{ meta: { total: number } }>('/users?limit=1'),
      api.get<{ meta: { total: number } }>('/products?limit=1'),
      api.get<{ meta: { total: number } }>('/orders?limit=1'),
      api.get<{ meta: { total: number } }>('/inventory?limit=1'),
    ]).then(([users, products, orders, inventory]) => {
      setStats({
        users: users.status === 'fulfilled' ? users.value.data.meta.total : 0,
        products: products.status === 'fulfilled' ? products.value.data.meta.total : 0,
        orders: orders.status === 'fulfilled' ? orders.value.data.meta.total : 0,
        inventory: inventory.status === 'fulfilled' ? inventory.value.data.meta.total : 0,
      });
      setLoading(false);
    });
  }, []);

  const cards = [
    { label: 'Usuários', value: stats.users, color: 'bg-blue-500', icon: '👥' },
    { label: 'Produtos', value: stats.products, color: 'bg-purple-500', icon: '📦' },
    { label: 'Pedidos', value: stats.orders, color: 'bg-green-500', icon: '🛒' },
    { label: 'Estoque', value: stats.inventory, color: 'bg-orange-500', icon: '🏭' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Executivo</h1>

      {loading ? (
        <p className="text-gray-500">Carregando estatísticas...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cards.map(card => (
            <div key={card.label} className={`${card.color} text-white p-5 rounded-xl shadow`}>
              <div className="text-3xl mb-2">{card.icon}</div>
              <p className="text-3xl font-bold">{card.value}</p>
              <p className="text-sm opacity-90 mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}