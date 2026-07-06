

export interface ReportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

function cell<T>(col: ReportColumn<T>, row: T): string {
  const v = col.accessor(row);
  return v === null || v === undefined ? '' : String(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const XLSX_NAVY = '091F34';
const XLSX_WHITE = 'FFFFFF';
const XLSX_SUBTLE = 'AEC0D2';
const XLSX_ZEBRA = 'F1F5F9';
const XLSX_BORDER = 'E2E8F0';
const XLSX_TEXT = '1A1A2E';

export async function exportToXLSX<T>(
  rows: T[],
  columns: ReportColumn<T>[],
  filename: string,
  sheetName = 'Reporte',
  title = sheetName
): Promise<void> {
  const XLSX = await import('xlsx-js-style');

  const fecha = new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    hour12: false,
  });
  const headers = columns.map((c) => c.header);

  const dataMatrix: (string | number)[][] = rows.map((r) =>
    columns.map((c) => {
      const v = c.accessor(r);
      return v === null || v === undefined ? '' : (v as string | number);
    })
  );

  const aoa: (string | number)[][] = [
    ['SotLoy Conecta'],
    [title],
    [`Generado: ${fecha}  ·  ${rows.length} registro(s)`],
    [],
    headers,
    ...dataMatrix,
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const ncols = columns.length;
  const HEADER_ROWS = 5;

  const thin = { style: 'thin', color: { rgb: XLSX_BORDER } };
  const allBorders = { top: thin, bottom: thin, left: thin, right: thin };

  const setStyle = (r: number, c: number, style: Record<string, unknown>) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    (ws[ref] as Record<string, unknown>).s = style;
  };

  for (let c = 0; c < ncols; c++) {
    setStyle(0, c, {
      fill: { fgColor: { rgb: XLSX_NAVY } },
      font: { bold: true, color: { rgb: XLSX_WHITE }, sz: 16 },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    setStyle(1, c, {
      fill: { fgColor: { rgb: XLSX_NAVY } },
      font: { bold: true, color: { rgb: XLSX_WHITE }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
    setStyle(2, c, {
      fill: { fgColor: { rgb: XLSX_NAVY } },
      font: { italic: true, color: { rgb: XLSX_SUBTLE }, sz: 9 },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
  }

  for (let c = 0; c < ncols; c++) {
    setStyle(HEADER_ROWS - 1, c, {
      fill: { fgColor: { rgb: XLSX_NAVY } },
      font: { bold: true, color: { rgb: XLSX_WHITE }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: allBorders,
    });
  }

  for (let ri = 0; ri < dataMatrix.length; ri++) {
    const r = HEADER_ROWS + ri;
    const zebra = ri % 2 === 1;
    for (let c = 0; c < ncols; c++) {
      const isNum = typeof dataMatrix[ri][c] === 'number';
      setStyle(r, c, {
        font: { sz: 10, color: { rgb: XLSX_TEXT } },
        ...(zebra ? { fill: { fgColor: { rgb: XLSX_ZEBRA } } } : {}),
        alignment: {
          vertical: 'center',
          horizontal: isNum ? 'center' : 'left',
        },
        border: allBorders,
      });
    }
  }

  if (ncols > 1) {
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: ncols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: ncols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: ncols - 1 } },
    ];
  }

  ws['!rows'] = [
    { hpt: 24 },
    { hpt: 18 },
    { hpt: 15 },
    { hpt: 6 },
    { hpt: 22 },
  ];

  ws['!cols'] = columns.map((c, i) => {
    let maxLen = c.header.length;
    for (const row of dataMatrix) {
      const len = String(row[i] ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
  });

  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: HEADER_ROWS - 1, c: 0 },
      e: { r: HEADER_ROWS - 1 + rows.length, c: ncols - 1 },
    }),
  };

  ws['!freeze'] = {
    xSplit: 0,
    ySplit: HEADER_ROWS,
    topLeftCell: `A${HEADER_ROWS + 1}`,
    activePane: 'bottomLeft',
    state: 'frozen',
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export async function exportToPDF<T>(
  title: string,
  columns: ReportColumn<T>[],
  rows: T[],
  filename = title
): Promise<void> {
  const fecha = new Date().toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    hour12: false,
  });

  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const landscape = columns.length > 6;
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const navy: [number, number, number] = [9, 31, 52];

  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 54, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('SotLoy Conecta', 40, 25);
  doc.setFontSize(11);
  doc.text(title, 40, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(174, 192, 210);
  doc.text(
    `Generado: ${fecha}  ·  ${rows.length} registro(s)`,
    pageWidth - 40,
    43,
    { align: 'right' }
  );

  autoTable(doc, {
    startY: 70,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => cell(c, r))),
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      textColor: [26, 26, 46],
    },
    headStyles: {
      fillColor: navy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${data.pageNumber} de ${page}`,
        pageWidth - 40,
        doc.internal.pageSize.getHeight() - 18,
        { align: 'right' }
      );
    },
  });

  const dataUri = doc.output('datauristring');
  const b64 = dataUri.substring(dataUri.indexOf(',') + 1);
  const downloadName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  const win = window.open('', '_blank');
  if (!win) {

    const a = document.createElement('a');
    a.href = dataUri;
    a.download = downloadName;
    a.click();
    return;
  }

  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const bodyHtml = rows
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${escapeHtml(cell(c, r))}</td>`)
          .join('')}</tr>`
    )
    .join('');

  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  * { font-family: 'Inter', Arial, sans-serif; }
  body { padding: 24px 32px 40px; color: #1a1a2e; }
  .toolbar { display:flex; gap:10px; margin-bottom:18px; flex-wrap:wrap; }
  .toolbar button { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600; border:1px solid transparent; }
  .btn-primary { background:#091f34; color:#fff; }
  .btn-primary:hover { background:#0d2b48; }
  .btn-outline { background:#fff; color:#091f34; border-color:#cbd5e1; }
  .btn-outline:hover { background:#f1f5f9; }
  .head { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #091f34; padding-bottom:12px; margin-bottom:18px; }
  .head h1 { font-size:18px; margin:0; color:#091f34; }
  .head p { font-size:12px; color:#6b7280; margin:2px 0 0; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  th, td { border:1px solid #e5e7eb; padding:7px 9px; text-align:left; }
  th { background:#091f34; color:#fff; }
  tr:nth-child(even) td { background:#f1f5f9; }
  .count { font-size:12px; color:#6b7280; margin-bottom:10px; }
  @media print { .toolbar { display:none; } body { padding:0; } }
</style></head><body>
  <div class="toolbar">
    <button class="btn-primary" id="btnDownload">⬇ Descargar PDF</button>
    <button class="btn-outline" id="btnPrint">🖨 Imprimir</button>
    <button class="btn-outline" id="btnBack">← Volver</button>
  </div>
  <div class="head">
    <h1>${escapeHtml(title)}</h1>
    <p>SotLoy Conecta · ${escapeHtml(fecha)}</p>
  </div>
  <p class="count">${rows.length} registro(s)</p>
  <table><thead><tr>${head}</tr></thead><tbody>${bodyHtml}</tbody></table>
  <script>
    (function () {
      var b64 = "${b64}";
      var filename = ${JSON.stringify(downloadName)};
      document.getElementById('btnPrint').addEventListener('click', function () { window.print(); });
      document.getElementById('btnBack').addEventListener('click', function () { window.close(); });
      document.getElementById('btnDownload').addEventListener('click', function () {
        var bin = atob(b64);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      });
    })();
  </script>
</body></html>`);
  win.document.close();
}
