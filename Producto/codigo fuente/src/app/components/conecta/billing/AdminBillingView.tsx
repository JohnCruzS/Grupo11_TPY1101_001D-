'use client';

import React, { useState } from 'react';
import { Search, Filter, CreditCard, AlertCircle, CheckCircle, Clock, MoreVertical, Download, Eye, DollarSign, Building2 } from 'lucide-react';

export function AdminBillingView() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const mockCompanies = [
    {
      id: '1',
      name: 'Empresa Constructora ABC',
      rut: '76.123.456-7',
      status: 'trial',
      plan: null,
      auditoriaPaid: false,
      lastPayment: null,
      nextPayment: null,
      monthlyPrice: null,
      debt: 0,
    },
    {
      id: '2',
      name: 'Consultora Tech SpA',
      rut: '77.234.567-8',
      status: 'active',
      plan: 'B',
      planName: 'Gestión PyME',
      auditoriaPaid: true,
      lastPayment: '2026-05-15',
      nextPayment: '2026-06-15',
      monthlyPrice: 159000,
      debt: 0,
      discountApplied: true,
    },
    {
      id: '3',
      name: 'Importadora del Sur Ltda',
      rut: '78.345.678-9',
      status: 'active',
      plan: 'D',
      planName: 'RRHH Integral',
      auditoriaPaid: true,
      lastPayment: '2026-04-15',
      nextPayment: '2026-05-15',
      monthlyPrice: 429000,
      debt: 429000,
      discountApplied: false,
    },
    {
      id: '4',
      name: 'Restaurante Gourmet Spa',
      rut: '79.456.789-0',
      status: 'suspended',
      plan: 'C',
      planName: 'Remuneraciones',
      auditoriaPaid: true,
      lastPayment: '2026-03-15',
      nextPayment: '2026-05-15',
      monthlyPrice: 269000,
      debt: 538000,
      discountApplied: false,
    },
    {
      id: '5',
      name: 'Servicios Logísticos XYZ',
      rut: '80.567.890-1',
      status: 'active',
      plan: 'A',
      planName: 'Asesoría Básica',
      auditoriaPaid: true,
      lastPayment: '2026-05-10',
      nextPayment: '2026-06-10',
      monthlyPrice: 79000,
      debt: 0,
      discountApplied: true,
    },
  ];

  const filteredCompanies = filterStatus === 'all'
    ? mockCompanies
    : mockCompanies.filter(c => c.status === filterStatus);

  const getStatusBadge = (status: string, debt: number) => {
    if (debt > 0) return { color: 'bg-red-100 text-red-700', label: `Moroso ($${debt.toLocaleString()})` };
    if (status === 'trial') return { color: 'bg-yellow-100 text-yellow-700', label: 'Sin Plan' };
    if (status === 'active') return { color: 'bg-green-100 text-green-700', label: 'Activo' };
    if (status === 'suspended') return { color: 'bg-gray-100 text-gray-700', label: 'Suspendido' };
    return { color: 'bg-gray-100 text-gray-700', label: status };
  };

  const getPlanBadge = (plan: string | null, planName: string | null) => {
    if (!plan) return <span className="text-gray-400">-</span>;
    const colors: Record<string, string> = {
      'A': 'bg-blue-100 text-blue-700',
      'B': 'bg-purple-100 text-purple-700',
      'C': 'bg-orange-100 text-orange-700',
      'D': 'bg-indigo-100 text-indigo-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[plan] || 'bg-gray-100'}`}>
        Plan {plan} - {planName}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Facturación</h1>
          <p className="text-gray-500 mt-1">Administra planes, pagos y suscripciones de empresas</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Registrar Pago
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">5</p>
              <p className="text-sm text-gray-500">Empresas Totales</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">3</p>
              <p className="text-sm text-gray-500">Activas al Día</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">1</p>
              <p className="text-sm text-gray-500">Sin Plan (Auditoría)</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">$967K</p>
              <p className="text-sm text-gray-500">Monto en Mora</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar empresa..."
            className="flex-1 outline-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'trial', label: 'Sin Plan' },
            { id: 'active', label: 'Activas' },
            { id: 'suspended', label: 'Suspendidas' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterStatus(filter.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === filter.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auditoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mensualidad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Próximo Pago</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCompanies.map((company) => {
              const status = getStatusBadge(company.status, company.debt);
              return (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{company.name}</p>
                      <p className="text-sm text-gray-500">{company.rut}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getPlanBadge(company.plan, company.planName)}
                  </td>
                  <td className="px-6 py-4">
                    {company.auditoriaPaid ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Pagada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-yellow-600 text-sm">
                        <Clock className="w-4 h-4" />
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {company.monthlyPrice ? (
                      <p className="font-medium text-gray-900">
                        ${company.monthlyPrice.toLocaleString()}/mes
                      </p>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {company.nextPayment ? (
                      <div>
                        <p className={`text-sm ${company.debt > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {new Date(company.nextPayment).toLocaleDateString('es-CL')}
                        </p>
                        {company.debt > 0 && (
                          <p className="text-xs text-red-500">Vencido</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Registrar pago">
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" title="Más opciones">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full m-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Detalle de Empresa</h3>
            <p className="text-gray-600">Modal de detalle aquí...</p>
            <button
              onClick={() => setSelectedCompany(null)}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBillingView;
