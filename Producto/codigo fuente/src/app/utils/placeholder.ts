

export function imagePlaceholder(label: string, w = 400, h = 300): string {
  const safe = label.replace(/[<>&]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#e2e8f0"/>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6 6"/>
  <g fill="#94a3b8" font-family="Inter, Arial, sans-serif" text-anchor="middle">
    <text x="50%" y="44%" font-size="18" font-weight="700">Imagen</text>
    <text x="50%" y="58%" font-size="13">${safe}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
