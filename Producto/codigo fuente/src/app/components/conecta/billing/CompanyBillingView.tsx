'use client';

import React from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, ArrowRight, FileText, Download } from 'lucide-react';

export function CompanyBillingView() {

  const mockData = {
    status: 'trial',
    plan: null,
    auditoriaPaid: false,
    nextPayment: null,
    paymentHistory: []
  };

  const plans = [
    { id: 'A', name: 'Asesoría Básica', price: 79000, discount: 0, finalPrice: 79000 },
    { id: 'B', name: 'Gestión PyME', price: 159000, discount: 50000, finalPrice: 109000 },
    { id: 'C', name: 'Remuneraciones', price: 269000, discount: 100000, finalPrice: 169000 },
    { id: 'D', name: 'RRHH Integral', price: 429000, discount: 149000, finalPrice: 280000 },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mi Suscripción</h1>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
          Auditaría Pendiente
        </span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Paso 1: Auditoría Inicial</h3>
            <p className="text-gray-600 mt-1">
              Para comenzar, realice el pago de la auditoría inicial de <strong>$149.000</strong>.
              Este valor se convertirá en descuento para su primer mes de plan.
            </p>

            <div className="mt-4 flex items-center gap-4">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pagar Auditoría $149.000
              </button>
              <span className="text-sm text-gray-500">
                Pago seguro vía WebPay/Flow
              </span>
            </div>
          </div>
          <div className="text-3xl text-gray-300">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 opacity-60">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-500">Paso 2: Seleccionar Plan</h3>
        </div>

        <p className="text-gray-500 mb-4">
          Una vez pagada la auditoría, podrá elegir su plan y aplicar el descuento de bienvenida.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-white rounded-lg border border-gray-200 p-4 relative">
              {plan.discount > 0 && (
                <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  Ahorra ${plan.discount.toLocaleString()}
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-2xl font-bold text-gray-400">{plan.id}</span>
                  <h4 className="font-semibold text-gray-500">{plan.name}</h4>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 line-through">
                    ${plan.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-400">
                    ${plan.finalPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-400">/mes (1° mes)</span>
                </div>
                <p className="text-xs text-gray-400">
                  Luego ${plan.price.toLocaleString()}/mes
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Pague la auditoría inicial de $149.000</li>
          <li>Reciba el descuento equivalente en su primer mes de plan</li>
          <li>Desde el segundo mes, paga el precio normal del plan</li>
          <li>Puede cambiar de plan o cancelar en cualquier momento</li>
        </ol>
      </div>
    </div>
  );
}

export function CompanyActivePlanView() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mi Suscripción</h1>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          Plan Activo
        </span>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-blue-100 text-sm mb-1">Plan Actual</p>
            <h2 className="text-3xl font-bold mb-2">Plan C - Remuneraciones</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">$269.000</span>
              <span className="text-blue-200">/mes</span>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-lg p-3">
            <Calendar className="w-8 h-8" />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/20 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Próximo pago</p>
            <p className="text-xl font-semibold">15 de junio de 2026</p>
          </div>
          <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Pagar Ahora
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Pagos</h3>
        </div>
        <div className="divide-y divide-gray-200">
          <div className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Auditoría Inicial</p>
                <p className="text-sm text-gray-500">10 de mayo, 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">$149.000</p>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Pagado
              </span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Plan C - 1° Mes (con descuento)</p>
                <p className="text-sm text-gray-500">15 de mayo, 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                <span className="text-gray-400 line-through text-sm">$269.000</span>
                {' '}$169.000
              </p>
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Pagado
              </span>
            </div>
          </div>

          <div className="p-4 flex items-center justify-between bg-yellow-50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Plan C - Mensualidad Junio</p>
                <p className="text-sm text-gray-500">Vence: 15 de junio, 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">$269.000</p>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Pagar ahora →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button className="flex-1 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cambiar de Plan
        </button>
        <button className="flex-1 py-3 border border-red-300 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors">
          Cancelar Suscripción
        </button>
      </div>
    </div>
  );
}

export default CompanyBillingView;
