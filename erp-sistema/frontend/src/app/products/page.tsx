'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField, { inputClass } from '@/components/FormField';

interface Category { id: number; name: string; }
interface Product { id: number; name: string; price: number; category?: Category; }
interface FormState { name: string; price: string; categoryId: string; }
const empty: FormState = { name: '', price: '', categoryId: '' };

function apiError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao salvar');
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prod, cats] = await Promise.all([
        api.get<{ data: Product[] }>('/products'),
        api.get<Category[]>('/products/categories'),
      ]);
      setProducts(prod.data.data);
      setCategories(cats.data);
    } catch { setError('Não foi possível carregar os produtos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(empty); setFormError(null); setModalOpen(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), categoryId: String(p.category?.id ?? '') });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError('O nome é obrigatório'); return; }
    if (!form.price || Number(form.price) <= 0) { setFormError('O preço deve ser maior que 0'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        ...(form.categoryId ? { categoryId: Number(form.categoryId) } : {}),
      };
      if (editing) await api.put(`/products/${editing.id}`, payload);
      else await api.post('/products', payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(apiError(err));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/products/${deleteTarget.id}`);
    } catch (err) {
      alert(apiError(err));
    }
    setDeleteTarget(null);
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gestão de Produtos</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Produto
        </button>
      </div>

      {loading && <p className="text-gray-500">Carregando...</p>}
      {error && <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'Nome', 'Preço', 'Categoria', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhum produto registrado</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{p.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-green-700 font-semibold">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">
                      {p.category?.name ?? 'Sem categoria'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => setDeleteTarget(p)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Editar Produto' : 'Novo Produto'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <FormField label="Nome" required>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass}
              placeholder="Ex: Camiseta azul"
              autoFocus
            />
          </FormField>

          <FormField label="Preço (R$)" required>
            <input
              type="number"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className={inputClass}
              min="1"
              step="1"
              placeholder="Ex: 50"
            />
          </FormField>

          <FormField label="Categoria (opcional)">
            {categories.length > 0 ? (
              <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} className={inputClass}>
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <p className="text-xs text-gray-400 italic py-2">Nenhuma categoria criada ainda</p>
            )}
          </FormField>

          {formError && (
            <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{formError}</p>
          )}

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
        title="Excluir Produto"
        message={`Deseja excluir "${deleteTarget?.name}"? Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}