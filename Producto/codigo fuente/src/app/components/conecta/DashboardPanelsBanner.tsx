import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import {
  DASHBOARD_PANELS_KEY,
  readSetting,
  type DashboardPanels,
} from '../../utils/siteSettings';

export function DashboardPanelsBanner() {
  const [data, setData] = useState<DashboardPanels | null>(null);

  useEffect(() => {
    readSetting<DashboardPanels>(DASHBOARD_PANELS_KEY).then(setData);
  }, []);

  if (!data || !data.enabled) return null;
  const paneles = (data.paneles || []).filter(
    (p) => (p.titulo && p.titulo.trim()) || (p.texto && p.texto.trim())
  );
  if (paneles.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {paneles.map((panel, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl p-4 border flex items-start gap-3"
          style={{
            borderColor: '#e9ecef',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#eff6ff' }}
          >
            <Megaphone size={16} color="#2563eb" />
          </div>
          <div className="min-w-0">
            {panel.titulo && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.85rem',
                  color: '#091f34',
                  fontWeight: 700,
                  marginBottom: '2px',
                }}
              >
                {panel.titulo}
              </p>
            )}
            {panel.texto && (
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '0.78rem',
                  color: '#4a4a5a',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {panel.texto}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
