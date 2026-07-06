'use client';

import React, { useState } from 'react';
import { Check, CreditCard, Sparkles, ArrowRight, AlertCircle, X } from 'lucide-react';

export function PlanSelectionView() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const userData = {
    auditoriaPaid: true,
    auditoriaAmount: 149000,
    companyName: 'Empresa Constructora ABC',
  };

  const plans = [
    {
      id: 'A',
      name: 'Asesoría Básica',
      description: 'Ideal para empresas que necesitan orientación puntual en materias laborales',
      features: [
        '1 consulta mensual con experto',
        'Respuestas en 48 hrs',
        'Acceso a base de normativas',
        'Soporte vía chat',
      ],
      basePrice: 79000,
      firstMonthDiscount: 0,
      firstMonthPrice: 79000,
      color: 'blue',
      popular: false,
    },
    {
      id: 'B',
      name: 'Gestión PyME',
      description: 'Solución completa para pequeñas y medianas empresas',
      features: [
        '5 consultas mensuales',
        'Respuestas en 24 hrs',
        'Acceso a base de normativas',
        'Revisión de 2 contratos/mes',
        'Informes trimestrales',
        'Soporte prioritario',
      ],
      basePrice: 159000,
      firstMonthDiscount: 50000,
      firstMonthPrice: 109000,
      color: 'purple',
      popular: true,
    },
    {
      id: 'C',
      name: 'Remuneraciones',
      description: 'Gestión integral de nómina y compensaciones',
      features: [
        'Consultas ilimitadas',
        'Respuestas en 12 hrs',
        'Cálculo de remuneraciones',
        'Optimización de costos laborales',
        'Revisión de 5 contratos/mes',
        'Reportes mensuales personalizados',
        'Soporte telefónico',
      ],
      basePrice: 269000,
      firstMonthDiscount: 100000,
      firstMonthPrice: 169000,
      color: 'orange',
      popular: false,
    },
    {
      id: 'D',
      name: 'RRHH Integral',
      description: 'Outsourcing completo de recursos humanos para empresas grandes',
      features: [
        'Consultas ilimitadas VIP',
        'Respuestas inmediatas',
        'Gestión integral de RRHH',
        'Auditorías trimestrales',
        'Revisión de contratos ilimitada',
        'Reportes semanales ejecutivos',
        'Soporte 24/7 dedicado',
        'Workshops trimestrales',
      ],
      basePrice: 429000,
      firstMonthDiscount: 149000,
      firstMonthPrice: 280000,
      color: 'indigo',
      popular: false,
    },
  ];

  const getColorClasses = (color: string, selected: boolean) => {
    const colors: Record<string, { border: string; bg: string; text: string; button: string }> = {
      blue: {
        border: selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        button: 'bg-blue-600 hover:bg-blue-700',
      },
      purple: {
        border: selected ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        button: 'bg-purple-600 hover:bg-purple-700',
      },
      orange: {
        border: selected ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200',
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        button: 'bg-orange-600 hover:bg-orange-700',
      },
      indigo: {
        border: selected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200',
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        button: 'bg-indigo-600 hover:bg-indigo-700',
      },
    };
    return colors[color] || colors.blue;
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    if (selectedPlan) {
      setShowConfirmModal(true);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
            <Check className="w-4 h-4" />
            Auditoría pagada exitosamente
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Elige tu Plan de Suscripción
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Has pagado <strong>${userData.auditoriaAmount.toLocaleString()}</strong> por la auditoría inicial.
            Este monto se convertirá en descuento para tu primer mes.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-12 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Tu descuento de bienvenida por plan
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Plan</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Precio Base</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Tu Descuento</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-green-600">Pagarás el 1° Mes</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Desde el 2° Mes</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr
                    key={plan.id}
                    className={`border-b border-gray-100 ${selectedPlan === plan.id ? 'bg-green-50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-900">Plan {plan.id}</span>
                      <span className="text-gray-500 text-sm ml-2">- {plan.name}</span>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-900">
                      ${plan.basePrice.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-green-600 font-medium">
                        -${plan.firstMonthDiscount.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-lg font-bold text-green-700">
                        ${plan.firstMonthPrice.toLocaleString()}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-500">
                      ${plan.basePrice.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            * El descuento de ${userData.auditoriaAmount.toLocaleString()} se aplica solo al primer mes.
            Desde el segundo mes pagarás el precio base del plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => {
            const colors = getColorClasses(plan.color, selectedPlan === plan.id);
            return (
              <div
                key={plan.id}
                onClick={() => handlePlanSelect(plan.id)}
                className={`relative bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${colors.border}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Más Popular
                  </div>
                )}

                <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <span className={`text-2xl font-bold ${colors.text}`}>{plan.id}</span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.firstMonthPrice.toLocaleString()}
                    </span>
                    <span className="text-gray-500">/mes 1°</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 line-through text-sm">
                      ${plan.basePrice.toLocaleString()}
                    </span>
                    <span className="text-green-600 text-sm font-medium">
                      Ahorras ${plan.firstMonthDiscount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Luego ${plan.basePrice.toLocaleString()}/mes
                  </p>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-lg font-medium text-white transition-colors ${
                    selectedPlan === plan.id ? colors.button : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {selectedPlan === plan.id ? 'Seleccionado' : 'Seleccionar Plan'}
                </button>
              </div>
            );
          })}
        </div>

        {selectedPlan && (
          <div className="text-center">
            <button
              onClick={handleContinue}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              Continuar con Plan {selectedPlan}
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-gray-500 mt-2">
              Primer pago: ${selectedPlanData?.firstMonthPrice.toLocaleString()}
              (con descuento de ${selectedPlanData?.firstMonthDiscount.toLocaleString()} aplicado)
            </p>
          </div>
        )}

        {showConfirmModal && selectedPlanData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Confirmar Suscripción</h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Plan seleccionado</p>
                  <p className="font-semibold text-gray-900">Plan {selectedPlanData.id} - {selectedPlanData.name}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Descuento aplicado</p>
                  <p className="font-semibold text-green-900">-${selectedPlanData.firstMonthDiscount.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">
                    (de tu auditoría de ${userData.auditoriaAmount.toLocaleString()})
                  </p>
                </div>

                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                  <span className="text-gray-600">Total a pagar hoy:</span>
                  <span className="text-2xl font-bold text-gray-900">
                    ${selectedPlanData.firstMonthPrice.toLocaleString()}
                  </span>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Desde el próximo mes pagarás ${selectedPlanData.basePrice.toLocaleString()} mensuales.
                    Puedes cancelar en cualquier momento.
                  </p>
                </div>

                <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Proceder al Pago
                </button>

                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-3 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Volver y revisar otros planes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanSelectionView;
