'use client';

import React, { useState } from 'react';
import { CompanyBillingView, CompanyActivePlanView } from './CompanyBillingView';
import { AdminBillingView } from './AdminBillingView';
import { PlanSelectionView } from './PlanSelectionView';
import { Building2, User, CreditCard, Layout } from 'lucide-react';

export function BillingPreview() {
  const [activeView, setActiveView] = useState<'empresa-trial' | 'empresa-activa' | 'seleccion-plan' | 'admin'>('empresa-trial');

  const views = [
    { id: 'empresa-trial', label: 'Empresa - Sin Plan (Trial)', icon: Building2, component: CompanyBillingView },
    { id: 'empresa-activa', label: 'Empresa - Plan Activo', icon: CreditCard, component: CompanyActivePlanView },
    { id: 'seleccion-plan', label: 'Selección de Plan', icon: User, component: PlanSelectionView },
    { id: 'admin', label: 'Admin - Gestión Facturación', icon: Layout, component: AdminBillingView },
  ];

  const ActiveComponent = views.find(v => v.id === activeView)?.component || CompanyBillingView;

  return (
    <div className="min-h-screen bg-gray-100">

      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Vistas de Facturación - Preview</h1>
              <p className="text-sm text-gray-500">Selecciona una vista para ver el diseño</p>
            </div>
            <div className="text-sm text-gray-400">
              Mockup visual - No funcional
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === view.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {view.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4">
        <ActiveComponent />
      </div>
    </div>
  );
}

export default BillingPreview;
