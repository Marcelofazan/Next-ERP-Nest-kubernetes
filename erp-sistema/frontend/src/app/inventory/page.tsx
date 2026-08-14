'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField, { inputClass } from '@/components/FormField';

interface Product { id: number; name: string; }
interface Inventory { id: number; quantity: number; warehouse_id: number; product?: Product; }
interface FormState { productId: string; warehouse_id: string; quantity: string; }
const empty: FormState = { productId: '', warehouse_id: '', quantity: '' };

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Inventory | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Inventory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, prod] = await Promise.all([
        api.get<{ data: Inventory[] }>('/inventory'),
        api.get<{ data: Product[] }>('/products'),
      ]);
      setItems(inv.data.data);
      setProducts(prod.data.data);
    } catch { setError('Erro ao carregar o estoque'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(empty); setModalOpen(true); }
  function openEdit(item: Inventory) {
    setEditing(item);
    setForm({ productId: String(item.product?.id ?? ''), warehouse_id: String(item.warehouse_id), quantity: String(item.quantity) });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/inventory/${editing.id}`, { quantity: Number(form.quantity), warehouse_id: Number(form.warehouse_id) });
      } else {
        await api.post('/inventory', { productId: Number(form.productId), warehouse_id: Number(form.warehouse_id), quantity: Number(form.quantity) });
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/inventory/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Erro ao excluir registro');
    }
  }

  const stockColor = (q: number) => q === 0 ? 'text-red-600 font-bold' : q < 10 ? 'text-orange-500 font-semibold' : 'text-green-700 font-semibold';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Controle de Estoque</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Adicionar Estoque
        </button>
      </div>

      {loading && <p className="text-gray-500">Carregando...</p>}
      {error && <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Produto', 'Depósito #', 'Quantidade', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Nenhum registro de estoque</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{item.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.product?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.warehouse_id}</td>
                  <td className={`px-4 py-3 text-sm ${stockColor(item.quantity)}`}>{item.quantity}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.quantity === 0
                      ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Sem estoque</span>
                      : item.quantity < 10
                      ? <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">Estoque baixo</span>
                      : <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">OK</span>}
                  </td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button onClick={() => openEdit(item)} className="text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => setDeleteTarget(item)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Editar Estoque' : 'Adicionar Estoque'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          {!editing && (
            <FormField label="Produto" required>
              <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} className={inputClass}>
                <option value="">Selecione um produto</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="ID do Depósito" required>
            <input type="number" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} className={inputClass} min="1" />
          </FormField>
          <FormField label="Quantidade" required>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className={inputClass} min="0" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir Registro"
        message={`Deseja excluir o estoque de "${deleteTarget?.product?.name}"? Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}