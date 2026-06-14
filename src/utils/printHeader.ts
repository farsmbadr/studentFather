export function printHeaderHtml(center?: { center_name?: string; address?: string; phone?: string; logo?: string }) {
  const name = center?.center_name || 'CenterMasr';
  const address = center?.address || '';
  const phone = center?.phone || '';
  const logo = center?.logo || '';
  return `
    <div class="print-header">
      <div class="print-header-content">
        ${logo ? `<img src="${logo}" alt="" class="print-logo" />` : ''}
        <strong>${name}</strong>
        ${address ? `<span>${address}</span>` : ''}
        ${phone ? `<span>ت: ${phone}</span>` : ''}
      </div>
    </div>`;
}

export function printFooterHtml() {
  return `<div class="print-footer">تمت الطباعة عن طريق CenterMasr لإدارة السناتر التعليمية</div>`;
}

export function printHeaderStyle() {
  return `
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Traditional Arabic','Arabic Typesetting',Arial,sans-serif;background:#fff;padding:0}
    .print-header{background:#1e3a5f;color:#fff;text-align:center;padding:3mm;font-size:12pt;border-radius:2mm;margin-bottom:4mm}
    .print-header-content{display:flex;align-items:center;justify-content:center;gap:4mm;flex-wrap:wrap}
    .print-logo{height:8mm;width:auto;object-fit:contain;border-radius:1mm}
    .print-footer{background:#1e3a5f;color:#fff;text-align:center;font-size:10pt;padding:2mm 3mm;border-radius:2mm;margin-top:4mm}`;
}
