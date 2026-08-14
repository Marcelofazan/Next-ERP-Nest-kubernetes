'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormField, { inputClass } from '@/components/FormField';

interface Role { id: number; name: string; }
interface User { id: number; email: string; role?: Role; created_at: string; }
interface FormState { email: string; password: string; roleId: string; }
const empty: FormState = { email: '', password: '', roleId: '' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<{ data: User[] }>('/users'),
        api.get<Role[]>('/users/roles'),
      ]);
      setUsers(usersRes.data.data);
      setRoles(rolesRes.data);
    } catch {
      setError('Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(empty); setModalOpen(true); }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ email: u.email, password: '', roleId: String(u.role?.id ?? '') });
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (editing) {
        const payload: Record<string, unknown> = { email: form.email };
        if (form.password) payload.password = form.password;
        if (form.roleId) payload.roleId = Number(form.roleId);
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', { email: form.email, password: form.password, roleId: form.roleId ? Number(form.roleId) : undefined });
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      alert(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Erro ao salvar'));
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg ?? 'Erro ao excluir usuário');
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Novo Usuário
        </button>
      </div>

      {loading && <p className="text-gray-500">Carregando...</p>}
      {error && <p className="text-red-600 bg-red-50 p-3 rounded">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'E-mail', 'Cargo', 'Criado em', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhum usuário registrado</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{user.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                      {user.role?.name ?? 'Sem cargo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <button onClick={() => openEdit(user)} className="text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => setDeleteTarget(user)} className="text-red-600 hover:underline">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Editar Usuário' : 'Novo Usuário'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <FormField label="E-mail" required>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputClass} placeholder="usuario@empresa.com" />
          </FormField>
          <FormField label={editing ? 'Nova senha (opcional)' : 'Senha'} required={!editing}>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={inputClass} placeholder="mín. 6 caracteres" minLength={editing ? 0 : 6} />
          </FormField>
          <FormField label="Cargo (opcional)">
            <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} className={inputClass}>
              <option value="">Sem cargo</option>
              {roles.map(r => (
                <option key={r.id} value={String(r.id)}>{r.name}</option>
              ))}
            </select>
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
        title="Excluir Usuário"
        message={`Deseja excluir ${deleteTarget?.email}? Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}