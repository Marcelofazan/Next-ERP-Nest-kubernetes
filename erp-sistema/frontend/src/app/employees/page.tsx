'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

// IMPORTANTE: Mantém as chaves exatamente como o NestJS envia (id, department, salary, user)
interface Employee {
  id: number;
  department: string;
  salary: string | number;
  user: {
    id: number;
    email: string;
  };
}

interface ApiResponse {
  data: Employee[];
  meta: {
    total: number;
    page: number;
    lastPage: number;
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ApiResponse>('/employees')
      .then((response) => {
        // Trata a paginação padrão { data, meta } do seu paginate.ts
        setEmployees(response.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Não foi possível carregar a lista de funcionários. Verifique sua sessão.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Carregando funcionários...</div>;
  if (error) return <div className="p-6 text-red-500 font-semibold">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestão de Funcionários</h1>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700">
            <tr>
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">E-mail</th>
              <th className="px-6 py-3">Departamento</th>
              <th className="px-6 py-3">Salário</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                  Nenhum funcionário registrado.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">#{emp.id}</td>
                  <td className="px-6 py-4">{emp.user?.email || 'N/A'}</td>
                  <td className="px-6 py-4">{emp.department || 'Não informado'}</td>
                  <td className="px-6 py-4">
                    {Number(emp.salary).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}