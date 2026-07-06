

import { getSupabase } from '../context/AuthContext';

const TABLE = 'kv_store_7d36b31f';

export const LANDING_HERO_KEY = 'site_settings:landing_hero';
export const LANDING_CAROUSEL_KEY = 'site_settings:landing_carousel';
export const DASHBOARD_PANELS_KEY = 'site_settings:dashboard_panels';

export const CAROUSEL_IMG_WIDTH = 1920;
export const CAROUSEL_IMG_HEIGHT = 300;
export const CAROUSEL_MAX_IMAGES = 5;
export const INDICADORES_KEY = 'site_settings:indicadores';
export const AVISOS_KEY = 'site_settings:avisos';
export const empresaNotesKey = (empresaId: string) => `empresa_notes:${empresaId}`;

export interface LandingHero {
  enabled: boolean;
  titulo: string;
  texto: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface CarouselImage {
  url: string;
  alt?: string;
  link?: string;
}

export interface LandingCarousel {
  enabled: boolean;
  images: CarouselImage[];
}

export interface DashboardPanel {
  titulo: string;
  texto: string;
}

export interface DashboardPanels {
  enabled: boolean;
  paneles: DashboardPanel[];
}

export interface EmpresaNotes {
  enabled: boolean;
  titulo: string;
  texto: string;
}

export interface EmpresaAviso {
  id: string;
  titulo: string;
  texto: string;
  enabled: boolean;
  targetIds: string[];
  expiresAt?: string;
  createdAt: string;
}

export interface EmpresaAvisoData {
  avisos: EmpresaAviso[];
}

export interface Indicador {
  label: string;
  value: string;
}

export interface Indicadores {
  enabled: boolean;
  items: Indicador[];
  updatedAt: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  texto: string;
  enabled: boolean;
  scope: 'all' | 'empresas' | 'trabajadores';
  targetIds: string[];
  createdAt: string;
  expiresAt?: string;
  createdBy?: string;
}

export const EMPTY_INDICADORES: Indicadores = {
  enabled: false,
  items: [
    { label: 'Valor UF', value: '' },
    { label: 'Valor UTM', value: '' },
    { label: 'Renta mínima imponible', value: '' },
    { label: 'Tope imponible AFP', value: '' },
    { label: 'Seguro de invalidez y sobrevivencia (SIS)', value: '' },
    { label: 'Asignación familiar (tramo y monto)', value: '' },
    { label: 'Valor dólar', value: '' },
  ],
  updatedAt: '',
};

export const EMPTY_LANDING_HERO: LandingHero = {
  enabled: false,
  titulo: '',
  texto: '',
  ctaLabel: '',
  ctaUrl: '',
};

export const EMPTY_LANDING_CAROUSEL: LandingCarousel = {
  enabled: false,
  images: [],
};

export const EMPTY_DASHBOARD_PANELS: DashboardPanels = {
  enabled: false,
  paneles: [
    { titulo: '', texto: '' },
    { titulo: '', texto: '' },
    { titulo: '', texto: '' },
  ],
};

export const EMPTY_EMPRESA_NOTES: EmpresaNotes = {
  enabled: false,
  titulo: '',
  texto: '',
};

export const ARTICLES_KEY = 'site_articles';

export interface Article {
  id: string;
  slug: string;
  titulo: string;
  descripcionSeo: string;
  contenido: string;
  imagenPortada?: string;
  keywords: string[];
  publicado: boolean;
  creadoEn: string;
  actualizadoEn: string;
  autor: string;
}

export interface ArticlesData {
  articles: Article[];
}

export async function readSetting<T>(key: string): Promise<T | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from(TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error || !data) return null;
    return (data.value as T) ?? null;
  } catch {
    return null;
  }
}

export async function writeSetting(
  key: string,
  value: unknown
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from(TABLE)
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error' };
  }
}
