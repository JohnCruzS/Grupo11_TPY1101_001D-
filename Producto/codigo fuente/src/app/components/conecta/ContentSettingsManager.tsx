import { useEffect, useState } from 'react';
import {
  Loader2,
  Save,
  Images,
  LayoutPanelTop,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  LANDING_CAROUSEL_KEY,
  DASHBOARD_PANELS_KEY,
  EMPTY_LANDING_CAROUSEL,
  EMPTY_DASHBOARD_PANELS,
  CAROUSEL_IMG_WIDTH,
  CAROUSEL_IMG_HEIGHT,
  CAROUSEL_MAX_IMAGES,
  readSetting,
  writeSetting,
  type LandingCarousel,
  type CarouselImage,
  type DashboardPanels,
} from '../../utils/siteSettings';
import { IndicadoresManager } from './IndicadoresManager';
import { AvisosManager } from './AvisosManager';

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function ContentSettingsManager() {
  const [loading, setLoading] = useState(true);
  const [carousel, setCarousel] = useState<LandingCarousel>(
    EMPTY_LANDING_CAROUSEL
  );
  const [panels, setPanels] = useState<DashboardPanels>(EMPTY_DASHBOARD_PANELS);
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [savingPanels, setSavingPanels] = useState(false);

  useEffect(() => {
    Promise.all([
      readSetting<LandingCarousel>(LANDING_CAROUSEL_KEY),
      readSetting<DashboardPanels>(DASHBOARD_PANELS_KEY),
    ]).then(([c, p]) => {
      if (c) {
        setCarousel({
          enabled: !!c.enabled,
          images: Array.isArray(c.images) ? c.images : [],
        });
      }
      if (p?.paneles?.length) {

        const paneles = [0, 1, 2].map(
          (i) => p.paneles[i] || { titulo: '', texto: '' }
        );
        setPanels({ enabled: !!p.enabled, paneles });
      }
      setLoading(false);
    });
  }, []);

  const saveCarousel = async () => {
    setSavingCarousel(true);
    const clean = {
      ...carousel,
      images: carousel.images.filter((i) => i.url.trim()),
    };
    const res = await writeSetting(LANDING_CAROUSEL_KEY, clean);
    setSavingCarousel(false);
    if (res.ok) toast.success('Carrusel de portada guardado');
    else toast.error(res.error || 'No se pudo guardar');
  };

  const addImage = () => {
    setCarousel((c) =>
      c.images.length >= CAROUSEL_MAX_IMAGES
        ? c
        : { ...c, images: [...c.images, { url: '', alt: '', link: '' }] }
    );
  };

  const setImage = (idx: number, field: keyof CarouselImage, value: string) => {
    setCarousel((c) => ({
      ...c,
      images: c.images.map((img, i) =>
        i === idx ? { ...img, [field]: value } : img
      ),
    }));
  };

  const removeImage = (idx: number) => {
    setCarousel((c) => ({
      ...c,
      images: c.images.filter((_, i) => i !== idx),
    }));
  };

  const savePanels = async () => {
    setSavingPanels(true);
    const res = await writeSetting(DASHBOARD_PANELS_KEY, panels);
    setSavingPanels(false);
    if (res.ok) toast.success('Paneles del inicio guardados');
    else toast.error(res.error || 'No se pudo guardar');
  };

  const setPanel = (idx: number, field: 'titulo' | 'texto', value: string) => {
    setPanels((prev) => {
      const paneles = prev.paneles.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p
      );
      return { ...prev, paneles };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full">

      <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e9ecef' }}>
        <div className="flex items-center gap-2 mb-1">
          <Images className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Carrusel de la portada</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Imágenes que rotan a todo el ancho en la página de inicio pública (lo
          ven los visitantes). Máximo {CAROUSEL_MAX_IMAGES} imágenes.
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-blue-800">
          <strong>Tamaño recomendado:</strong> {CAROUSEL_IMG_WIDTH} ×{' '}
          {CAROUSEL_IMG_HEIGHT} px (formato ancho y bajo, horizontal). Como el banner
          ocupa todo el ancho, usa <strong>todas las imágenes del mismo tamaño</strong>{' '}
          para que no se deformen ni salten. Peso sugerido: &lt; 500 KB c/u.
        </div>

        <button
          type="button"
          onClick={() => setCarousel((c) => ({ ...c, enabled: !c.enabled }))}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
            carousel.enabled
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {carousel.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {carousel.enabled ? 'Visible' : 'Oculto'}
        </button>

        <div className="space-y-4">
          {carousel.images.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              Aún no hay imágenes. Agrega la primera.
            </p>
          )}
          {carousel.images.map((img, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  Imagen {idx + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Eliminar imagen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">

                <div
                  className="flex-shrink-0 rounded-md overflow-hidden bg-gray-100 border border-gray-200"
                  style={{ width: 160, aspectRatio: `${CAROUSEL_IMG_WIDTH} / ${CAROUSEL_IMG_HEIGHT}` }}
                >
                  {img.url?.trim() ? (
                    <img
                      src={img.url}
                      alt={img.alt || `Imagen ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Images className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className={labelCls}>URL de la imagen</label>
                    <input
                      className={inputCls}
                      value={img.url}
                      onChange={(e) => setImage(idx, 'url', e.target.value)}
                      placeholder="https://.../banner.jpg"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Texto alternativo (opcional)</label>
                      <input
                        className={inputCls}
                        value={img.alt || ''}
                        onChange={(e) => setImage(idx, 'alt', e.target.value)}
                        placeholder="Describe la imagen"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Enlace al hacer clic (opcional)</label>
                      <input
                        className={inputCls}
                        value={img.link || ''}
                        onChange={(e) => setImage(idx, 'link', e.target.value)}
                        placeholder="/planes o https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {carousel.images.length < CAROUSEL_MAX_IMAGES && (
          <button
            type="button"
            onClick={addImage}
            className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            <Plus className="w-4 h-4" />
            Agregar imagen
          </button>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={saveCarousel}
            disabled={savingCarousel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {savingCarousel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar carrusel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5" style={{ borderColor: '#e9ecef' }}>
        <div className="flex items-center gap-2 mb-1">
          <LayoutPanelTop className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            Paneles del inicio (dashboard)
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          3 paneles informativos que se muestran en el inicio de todos los roles
          (empleado, empresa, admin y super admin).
        </p>

        <button
          type="button"
          onClick={() => setPanels((p) => ({ ...p, enabled: !p.enabled }))}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium mb-4 ${
            panels.enabled
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}
        >
          {panels.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {panels.enabled ? 'Visible' : 'Oculto'}
        </button>

        <div className="space-y-4">
          {panels.paneles.map((panel, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                Panel {idx + 1}
              </p>
              <div className="space-y-2">
                <input
                  className={inputCls}
                  value={panel.titulo}
                  onChange={(e) => setPanel(idx, 'titulo', e.target.value)}
                  placeholder="Título del panel"
                />
                <textarea
                  className={inputCls}
                  rows={2}
                  value={panel.texto}
                  onChange={(e) => setPanel(idx, 'texto', e.target.value)}
                  placeholder="Texto del panel"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={savePanels}
            disabled={savingPanels}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {savingPanels ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Guardar paneles del inicio
          </button>
        </div>
      </div>

      <IndicadoresManager />

      <AvisosManager />
    </div>
  );
}
