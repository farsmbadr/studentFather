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
    </div>
    <div class="print-footer">تمت الطباعة عن طريق CenterMasr لإدارة السناتر التعليمية | 01008667306</div>`;
}

export function printHeaderStyle() {
  return `
    .print-header{position:fixed;top:0;left:0;right:0;background:#1e3a5f;color:#fff;text-align:center;padding:1.5mm 4mm;font-size:7.5pt;z-index:9999;border-bottom:1.5px solid #fff}
    .print-header-content{display:flex;align-items:center;justify-content:center;gap:4mm;flex-wrap:wrap}
    .print-logo{height:6mm;width:auto;object-fit:contain;border-radius:1mm}
    .print-footer{position:fixed;bottom:0;left:0;right:0;background:#1e3a5f;color:#fff;text-align:center;font-size:6.5pt;padding:1mm 4mm;z-index:9999;border-top:1.5px solid #fff}`;
}
