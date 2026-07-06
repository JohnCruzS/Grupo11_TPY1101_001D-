import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  PenLine, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, XCircle, RefreshCw, Globe, FileText,
  Calendar, User, Clock, ExternalLink, BookOpen,
} from 'lucide-react';
import {
  ARTICLES_KEY, readSetting, writeSetting,
  type Article, type ArticlesData,
} from '../../utils/siteSettings';
import { analyzeSeo, scoreColor, scoreLabel, type SeoCheck } from '../../utils/seoAnalyzer';

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function toSlug(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function readingTime(text: string) {
  return Math.max(1, Math.round(wordCount(text) / 200));
}

const EMPTY_FORM: Omit<Article, 'id' | 'creadoEn' | 'actualizadoEn'> = {
  slug: '', titulo: '', descripcionSeo: '', contenido: '',
  imagenPortada: '', keywords: [], publicado: false, autor: '',
};

function CheckRow({ check }: { check: SeoCheck }) {
  const cfg = check.status === 'ok'
    ? { icon: <CheckCircle2 size={13} />, bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', sub: '#166534' }
    : check.status === 'warn'
    ? { icon: <AlertCircle size={13} />, bg: '#fffbeb', border: '#fde68a', text: '#b45309', sub: '#92400e' }
    : { icon: <XCircle size={13} />, bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', sub: '#991b1b' };

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '8px 10px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: '8px', marginBottom: '6px' }}>
      <span style={{ color: cfg.text, marginTop: '1px', flexShrink: 0 }}>{cfg.icon}</span>
      <div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.73rem', fontWeight: 700, color: cfg.text, margin: 0 }}>{check.label}</p>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: cfg.sub, margin: 0, lineHeight: 1.4 }}>{check.detail}</p>
      </div>
    </div>
  );
}

function ArticleCard({
  article, onEdit, onToggle, onDelete,
}: {
  article: Article;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const mins = readingTime(article.contenido);
  const words = wordCount(article.contenido);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'white', borderRadius: '14px',
        border: `1px solid ${hovered ? '#bfdbfe' : '#e5e7eb'}`,
        overflow: 'hidden', display: 'grid',
        gridTemplateColumns: article.imagenPortada ? '140px 1fr' : '1fr',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hovered ? '0 4px 16px rgba(29,78,216,0.08)' : 'none',
      }}
    >

      {article.imagenPortada && (
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <img
            src={article.imagenPortada}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover', minHeight: '120px',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform 0.35s ease',
            }}
          />
        </div>
      )}

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#111827', margin: 0, flex: 1, lineHeight: 1.35 }}>
            {article.titulo || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>(sin título)</span>}
          </p>
          <span style={{
            flexShrink: 0, padding: '2px 8px', borderRadius: '99px',
            fontFamily: "'Inter',sans-serif", fontSize: '0.67rem', fontWeight: 700,
            background: article.publicado ? '#dcfce7' : '#f3f4f6',
            color: article.publicado ? '#15803d' : '#6b7280',
            border: `1px solid ${article.publicado ? '#86efac' : '#e5e7eb'}`,
          }}>
            {article.publicado ? '● Publicado' : '○ Borrador'}
          </span>
        </div>

        {article.keywords.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {article.keywords.slice(0, 3).map((kw, i) => (
              <span key={kw} style={{
                padding: '2px 7px', borderRadius: '99px', fontFamily: "'Inter',sans-serif",
                fontSize: '0.67rem', fontWeight: i === 0 ? 700 : 400,
                background: i === 0 ? '#eff6ff' : '#f9fafb',
                color: i === 0 ? '#1d4ed8' : '#6b7280',
                border: `1px solid ${i === 0 ? '#bfdbfe' : '#e5e7eb'}`,
              }}>
                {i === 0 && '★ '}{kw}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#9ca3af' }}>
            <User size={11} /> {article.autor || '—'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#9ca3af' }}>
            <Calendar size={11} /> {new Date(article.actualizadoEn).toLocaleDateString('es-CL')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#9ca3af' }}>
            <Clock size={11} /> {mins} min · {words} palabras
          </span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: '#94a3b8' }}>
            /blog/{article.slug}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
          <button
            onClick={onEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', border: '1px solid #bfdbfe', borderRadius: '7px',
              background: '#eff6ff', cursor: 'pointer',
              fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', fontWeight: 600, color: '#1d4ed8',
            }}
          >
            <PenLine size={12} /> Editar
          </button>
          <button
            onClick={onToggle}
            title={article.publicado ? 'Despublicar' : 'Publicar'}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', border: `1px solid ${article.publicado ? '#e5e7eb' : '#bbf7d0'}`, borderRadius: '7px',
              background: article.publicado ? '#f9fafb' : '#f0fdf4', cursor: 'pointer',
              fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', fontWeight: 600,
              color: article.publicado ? '#6b7280' : '#15803d',
            }}
          >
            {article.publicado ? <EyeOff size={12} /> : <Eye size={12} />}
            {article.publicado ? 'Despublicar' : 'Publicar'}
          </button>
          {article.publicado && (
            <a
              href={`/blog/${article.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: '7px',
                background: 'white', textDecoration: 'none',
                fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', color: '#6b7280',
              }}
            >
              <ExternalLink size={12} /> Ver
            </a>
          )}
          <button
            onClick={onDelete}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', border: '1px solid #fecaca', borderRadius: '7px',
              background: '#fef2f2', cursor: 'pointer',
              fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', color: '#dc2626',
            }}
          >
            <Trash2 size={12} /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

interface Props { authorName: string }

export function ArticlesManager({ authorName }: Props) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [kwInput, setKwInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [seoOpen, setSeoOpen] = useState(true);

  useEffect(() => {
    readSetting<ArticlesData>(ARTICLES_KEY).then((data) => {
      setArticles(data?.articles ?? []);
      setLoading(false);
    });
  }, []);

  const seo = useMemo(() => analyzeSeo({
    titulo: form.titulo, descripcionSeo: form.descripcionSeo,
    contenido: form.contenido, slug: form.slug, keywords: form.keywords,
  }), [form.titulo, form.descripcionSeo, form.contenido, form.slug, form.keywords]);

  function openNew() {
    setEditingId('__new__');
    setForm({ ...EMPTY_FORM, autor: authorName });
    setKwInput('');
  }

  function openEdit(a: Article) {
    setEditingId(a.id);
    setForm({
      slug: a.slug, titulo: a.titulo, descripcionSeo: a.descripcionSeo,
      contenido: a.contenido, imagenPortada: a.imagenPortada ?? '',
      keywords: a.keywords, publicado: a.publicado, autor: a.autor,
    });
    setKwInput('');
  }

  async function save() {
    if (!form.titulo.trim()) { toast.error('El título es obligatorio'); return; }
    if (!form.slug.trim()) { toast.error('El slug es obligatorio'); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const updated = editingId === '__new__'
      ? [{ ...form, id: generateId(), creadoEn: now, actualizadoEn: now }, ...articles]
      : articles.map((a) => a.id === editingId ? { ...a, ...form, actualizadoEn: now } : a);
    const result = await writeSetting(ARTICLES_KEY, { articles: updated });
    if (result.ok) {
      setArticles(updated);
      setEditingId(null);
      toast.success(editingId === '__new__' ? 'Artículo creado' : 'Artículo guardado');
    } else {
      toast.error('Error al guardar');
    }
    setSaving(false);
  }

  async function togglePublish(a: Article) {
    const updated = articles.map((x) =>
      x.id === a.id ? { ...x, publicado: !x.publicado, actualizadoEn: new Date().toISOString() } : x
    );
    const r = await writeSetting(ARTICLES_KEY, { articles: updated });
    if (r.ok) { setArticles(updated); toast.success(a.publicado ? 'Despublicado' : 'Publicado'); }
  }

  async function deleteArticle(id: string) {
    if (!confirm('¿Eliminar este artículo? Esta acción no se puede deshacer.')) return;
    const updated = articles.filter((a) => a.id !== id);
    const r = await writeSetting(ARTICLES_KEY, { articles: updated });
    if (r.ok) { setArticles(updated); if (editingId === id) setEditingId(null); toast.success('Eliminado'); }
  }

  function addKeyword() {
    const kw = kwInput.trim();
    if (!kw || form.keywords.includes(kw)) return;
    setForm((f) => ({ ...f, keywords: [...f.keywords, kw] }));
    setKwInput('');
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', border: '1px solid #e2e8f0',
    borderRadius: '8px', fontFamily: "'Inter',sans-serif", fontSize: '0.83rem',
    color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa',
  };
  const lbl: React.CSSProperties = {
    fontFamily: "'Inter',sans-serif", fontSize: '0.75rem', fontWeight: 700,
    color: '#374151', marginBottom: '5px', display: 'block',
  };

  if (loading) return (
    <div style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontFamily: "'Inter',sans-serif", fontSize: '0.85rem' }}>
      Cargando…
    </div>
  );

  if (editingId !== null) {
    const wc = wordCount(form.contenido);
    const mins = readingTime(form.contenido);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '20px', alignItems: 'start' }}>

        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PenLine size={14} color="#1d4ed8" />
              </div>
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                {editingId === '__new__' ? 'Nuevo artículo' : 'Editar artículo'}
              </span>
              {wc > 0 && (
                <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: '#64748b' }}>
                  {wc} palabras · {mins} min
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditingId(null)} style={{ padding: '6px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: '#64748b', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 16px', border: 'none', borderRadius: '8px', background: saving ? '#93c5fd' : '#1d4ed8', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', fontWeight: 700, color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Guardando…' : '✓ Guardar'}
              </button>
            </div>
          </div>

          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={lbl}>Título <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                style={{ ...inp, fontSize: '0.95rem', fontWeight: 600, border: form.titulo.length > 60 ? '1px solid #fbbf24' : '1px solid #e2e8f0' }}
                value={form.titulo}
                placeholder="Ej: Cómo gestionar contratos laborales en Chile"
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((f) => ({ ...f, titulo: val, slug: editingId === '__new__' ? toSlug(val) : f.slug }));
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: '#94a3b8' }}>Google muestra hasta 60 caracteres</span>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: form.titulo.length > 60 ? '#f59e0b' : '#94a3b8', fontWeight: form.titulo.length > 60 ? 700 : 400 }}>
                  {form.titulo.length}/60
                </span>
              </div>
            </div>

            <div>
              <label style={lbl}>URL del artículo <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fafafa', overflow: 'hidden' }}>
                <span style={{ padding: '9px 10px 9px 12px', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: '#94a3b8', background: '#f1f5f9', borderRight: '1px solid #e2e8f0', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  /blog/
                </span>
                <input
                  style={{ ...inp, border: 'none', borderRadius: 0, flex: 1, background: 'transparent' }}
                  value={form.slug}
                  placeholder="como-gestionar-contratos"
                  onChange={(e) => setForm((f) => ({ ...f, slug: toSlug(e.target.value) }))}
                />
                <button
                  onClick={() => setForm((f) => ({ ...f, slug: toSlug(f.titulo) }))}
                  title="Regenerar desde título"
                  style={{ padding: '9px 10px', background: 'transparent', border: 'none', cursor: 'pointer', borderLeft: '1px solid #e2e8f0', color: '#94a3b8' }}
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            <div>
              <label style={lbl}>Meta descripción (SEO)</label>
              <textarea
                style={{ ...inp, resize: 'vertical', minHeight: '76px', border: form.descripcionSeo.length > 160 ? '1px solid #fbbf24' : '1px solid #e2e8f0' }}
                value={form.descripcionSeo}
                placeholder="Resumen del artículo en 150–160 caracteres para aparecer en Google."
                onChange={(e) => setForm((f) => ({ ...f, descripcionSeo: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3px' }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: form.descripcionSeo.length > 160 ? '#f59e0b' : '#94a3b8', fontWeight: form.descripcionSeo.length > 160 ? 700 : 400 }}>
                  {form.descripcionSeo.length}/160
                </span>
              </div>
            </div>

            <div>
              <label style={lbl}>Keywords <span style={{ fontWeight: 400, color: '#94a3b8' }}>— la primera es la principal</span></label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  style={{ ...inp, flex: 1 }}
                  value={kwInput}
                  placeholder="contratos laborales Chile"
                  onChange={(e) => setKwInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                />
                <button onClick={addKeyword} style={{ padding: '9px 14px', border: 'none', borderRadius: '8px', background: '#1d4ed8', color: 'white', cursor: 'pointer', fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>
                  + Agregar
                </button>
              </div>
              {form.keywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                  {form.keywords.map((kw, i) => (
                    <span key={kw} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '99px', fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', fontWeight: i === 0 ? 700 : 400, background: i === 0 ? '#eff6ff' : '#f1f5f9', color: i === 0 ? '#1d4ed8' : '#475569', border: `1px solid ${i === 0 ? '#bfdbfe' : '#e2e8f0'}` }}>
                      {i === 0 && '★ '}{kw}
                      <button onClick={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 2px', lineHeight: 1, color: '#94a3b8', fontSize: '0.9rem' }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={lbl}>
                Contenido
                <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '6px', fontSize: '0.7rem' }}>
                  ## H2 · ### H3 · **negrita** · *cursiva* · `código`
                </span>
              </label>
              <textarea
                style={{ ...inp, resize: 'vertical', minHeight: '360px', fontFamily: "'JetBrains Mono',monospace", fontSize: '0.82rem', lineHeight: 1.65, background: '#0f172a', color: '#e2e8f0', borderColor: '#334155', borderRadius: '10px', padding: '14px' }}
                value={form.contenido}
                placeholder={'## Introducción\n\nEscribe aquí...\n\n## Primer punto\n\nDesarrolla con detalle.\n\n### Subtema\n\nMás detalle aquí.'}
                onChange={(e) => setForm((f) => ({ ...f, contenido: e.target.value }))}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', gap: '12px' }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: wc < 400 ? '#f59e0b' : '#16a34a', fontWeight: 600 }}>
                  {wc} palabras {wc < 400 ? '(mín. recomendado: 400)' : '✓'}
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={lbl}>URL imagen de portada (opcional)</label>
                <input style={inp} value={form.imagenPortada} placeholder="https://..." onChange={(e) => setForm((f) => ({ ...f, imagenPortada: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Autor</label>
                <input style={{ ...inp, width: '160px' }} value={form.autor} onChange={(e) => setForm((f) => ({ ...f, autor: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: form.publicado ? '#f0fdf4' : '#f8fafc', border: `1px solid ${form.publicado ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: '10px' }}>
              <div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.82rem', fontWeight: 700, color: form.publicado ? '#15803d' : '#374151', margin: 0 }}>
                  {form.publicado ? '● Publicado — visible en el blog' : '○ Borrador — solo visible para ti'}
                </p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.73rem', color: '#6b7280', margin: 0 }}>
                  {form.publicado ? 'Los visitantes pueden ver este artículo' : 'Activa para publicar cuando esté listo'}
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0' }}>
                <input type="checkbox" checked={form.publicado} onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked }))} style={{ display: 'none' }} />
                <div style={{
                  width: '40px', height: '22px', borderRadius: '99px',
                  background: form.publicado ? '#16a34a' : '#cbd5e1',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: form.publicado ? '21px' : '3px',
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
              </label>
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Globe size={14} color="#1d4ed8" />
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>Análisis SEO</span>
              </div>
              <button onClick={() => setSeoOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}>
                {seoOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            <div style={{ padding: '16px', background: `${scoreColor(seo.score)}11` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle cx="32" cy="32" r="26" fill="none" stroke={scoreColor(seo.score)} strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 26}`}
                      strokeDashoffset={`${2 * Math.PI * 26 * (1 - seo.score / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 32 32)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '1rem', fontWeight: 800, color: scoreColor(seo.score) }}>{seo.score}</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '1rem', fontWeight: 800, color: scoreColor(seo.score), margin: 0 }}>{scoreLabel(seo.score)}</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', color: '#64748b', margin: '2px 0 0' }}>de 100 puntos posibles</p>
                  <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} style={{ width: '16px', height: '4px', borderRadius: '2px', background: i < Math.round(seo.score / 10) ? scoreColor(seo.score) : '#e5e7eb' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {seoOpen && (
              <div style={{ padding: '12px 14px' }}>
                {seo.checks.map((c, i) => <CheckRow key={i} check={c} />)}
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.68rem', color: '#94a3b8', margin: '10px 0 0', lineHeight: 1.5 }}>
                  Actualiza en tiempo real mientras escribes.
                </p>
              </div>
            )}
          </div>

          <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.72rem', fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>Formato Markdown</p>
            {[['## Título sección', 'H2 — sección principal'],['### Subtítulo', 'H3 — subsección'],['**texto**', 'negrita'],['*texto*', 'cursiva'],['`código`', 'código inline']].map(([syn, desc]) => (
              <div key={syn} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#1d4ed8', background: '#eff6ff', padding: '1px 5px', borderRadius: '4px' }}>{syn}</code>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: '#64748b' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const published = articles.filter(a => a.publicado).length;

  return (
    <div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BookOpen size={18} color="#1d4ed8" />
            <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: '1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Blog / Artículos
            </h3>
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.78rem', color: '#6b7280', margin: 0 }}>
            {articles.length} artículo{articles.length !== 1 ? 's' : ''} en total
            {published > 0 && ` · ${published} publicado${published !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={openNew}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', border: 'none', borderRadius: '9px', background: '#1d4ed8', color: 'white', fontFamily: "'Inter',sans-serif", fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
        >
          <Plus size={15} /> Nuevo artículo
        </button>
      </div>

      {articles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
          {[
            { label: 'Total', value: articles.length, color: '#1d4ed8', bg: '#eff6ff' },
            { label: 'Publicados', value: published, color: '#15803d', bg: '#f0fdf4' },
            { label: 'Borradores', value: articles.length - published, color: '#6b7280', bg: '#f9fafb' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: '10px', padding: '12px 14px', border: `1px solid ${s.color}22` }}>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.7rem', color: s.color, fontWeight: 700, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '1.4rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {articles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', background: 'white', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <FileText size={26} color="#1d4ed8" />
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.95rem', fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>
            Sin artículos todavía
          </p>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '0.82rem', color: '#9ca3af', margin: '0 0 18px', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Crea tu primer artículo para posicionarte mejor en Google y atraer más Pymes.
          </p>
          <button
            onClick={openNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', border: 'none', borderRadius: '9px', background: '#1d4ed8', color: 'white', fontFamily: "'Inter',sans-serif", fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={14} /> Crear primer artículo
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {articles.map((a) => (
            <ArticleCard
              key={a.id}
              article={a}
              onEdit={() => openEdit(a)}
              onToggle={() => togglePublish(a)}
              onDelete={() => deleteArticle(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
