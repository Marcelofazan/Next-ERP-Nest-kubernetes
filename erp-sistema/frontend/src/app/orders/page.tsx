'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField, { inputClass } from '@/components/FormField';

interface User { id: number; email: string; }
interface Product { id: number; name: string; price: number; }
interface OrderItem { id: number; quantity: number; unit_price: number; product?: Product; }
interface Order { id: number; status: string; total: number; created_at: string; customer?: User; items?: OrderItem[]; }

const STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Tradução visual dos status para o usuário final
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Em processamento',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

interface OrderFormItem { productId: string; quantity: string; }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([{ productId: '', quantity: '1' }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ord, usr, prod] = await Promise.all([
        api.get<{ data: Order[] }>('/orders'),
        api.get<{ data: User[] }>('/users'),
        api.get<{ data: Product[] }>('/products'),
      ]);
      setOrders(ord.data.data);
      setUsers(usr.data.data);
      setProducts(prod.data.data);
    } catch { setError('Erro ao carregar pedidos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function addItem() { setOrderItems(i => [...i, { productId: '', quantity: '1' }]); }
  function removeItem(idx: number) { setOrderItems(i => i.filter((_, j) => j !== idx)); }
  function updateItem(idx: number, field: keyof OrderFormItem, val: string) {
    setOrderItems(items => items.map((it, j) => j === idx ? { ...it, [field]: val } : it));
  }

  function openCreate() {
    setCustomerId('');
    setOrderItems([{ productId: '', quantity: '1' }]);
    setModalOpen(true);
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post('/orders', {
        customerId: Number(customerId),
        status: 'pending',
        items: orderItems.filter(i => i.productId).map(i => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
      });
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao criar pedido'));
    } finally { setSaving(false); }
  }

  async function handleStatusChange() {
    if (!statusOrder) return;
    try {
      await api.put(`/orders/${statusOrder.id}`, { status: newStatus });
      setStatusOrder(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Erro ao atualizar status');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/orders/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Erro ao excluir pedido');
    }
  }

  const previewTotal = orderItems.reduce((sum, item) => {
    const prod = products.find(p => p.id === Number(item.productId));
    return sum + (prod ? Number(prod.price) * Number(item.quantity || 0) : 0);
  }, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gestão de Pedidos</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Pedido
        </button>
      </div>

      {loading && <p className="text-gray-500">Carregando...</p>}
      {error && <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Cliente', 'Total', 'Status', 'Data', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nenhum pedido registrado</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">#{order.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{order.customer?.email ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-green-700 font-semibold">
                    R$ {Number(order.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button onClick={() => setDetailOrder(order)} className="text-gray-600 hover:underline">Ver</button>
                    <button onClick={() => { setStatusOrder(order); setNewStatus(order.status); }} className="text-blue-600 hover:underline">Status</button>
                    <button onClick={() => setDeleteTarget(order)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

{/* Modal: Novo Pedido */}
      <Modal open={modalOpen} title="Novo Pedido" onClose={() => setModalOpen(false)} size="lg">
        <div className="space-y-4">
          <FormField label="Cliente" required>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">Selecione um cliente</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
            </select>
          </FormField>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Produtos <span className="text-red-500">*</span></label>
              <button onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Adicionar item</button>
            </div>
            {orderItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className={`${inputClass} flex-1`}>
                  <option value="">Produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className={`${inputClass} w-20`} min="1" />
                {orderItems.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-red-500 text-lg px-1">&times;</button>
                )}
              </div>
            ))}
          </div>

          {previewTotal > 0 && (
            <p className="text-right text-sm font-semibold text-green-700">
              Total estimado: R$ {previewTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Detalhes */}
      <Modal open={!!detailOrder} title={`Pedido #${detailOrder?.id}`} onClose={() => setDetailOrder(null)}>
        {detailOrder && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Cliente:</span> <span className="font-medium">{detailOrder.customer?.email}</span></div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[detailOrder.status]}`}>
                  {STATUS_LABELS[detailOrder.status] ?? detailOrder.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total:</span>{' '}
                <span className="font-semibold text-green-700">
                  R$ {Number(detailOrder.total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div><span className="text-gray-500">Data:</span> {new Date(detailOrder.created_at).toLocaleDateString('pt-BR')}</div>
            </div>
            <hr />
            <p className="text-sm font-medium text-gray-700">Itens:</p>
            {detailOrder.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                <span>{item.product?.name}</span>
                <span className="text-gray-500">
                  x{item.quantity} · R$ {Number(item.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada
                </span>
                <span className="font-semibold">
                  R$ {(Number(item.unit_price) * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal: Alterar Status */}
      <Modal open={!!statusOrder} title="Alterar Status" onClose={() => setStatusOrder(null)} size="sm">
        <div className="space-y-4">
          <FormField label="Novo status">
            <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className={inputClass}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
            </select>
          </FormField>
          <div className="flex justify-end gap-3">
            <button onClick={() => setStatusOrder(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={handleStatusChange} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Atualizar</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Pedido"
        message={`Deseja excluir o pedido #${deleteTarget?.id}? Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}