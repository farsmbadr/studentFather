import { useState, useRef, useEffect } from 'react';
import { X, CreditCard } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { getCurrentUser } from '../auth';
import { useToast } from './Toast';

export default function PaymentModal({ student, onClose, onDone, alreadyPaid = 0 }: { student: { id: string; name: string; monthly_fee: number }; onClose: () => void; onDone: () => void; alreadyPaid?: number }) {
  const { show } = useToast();
  const user = getCurrentUser();
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear();
  const totalBalance = alreadyPaid; // alreadyPaid = total outstanding

  const [amount, setAmount] = useState(String(totalBalance > 0 ? totalBalance : (student.monthly_fee || 0)));
  const [receivedBy] = useState(user.name);
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(String(currentYear));

  const amountRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const entered = Number(amount) || 0;
  const remaining = Math.max(0, totalBalance - entered);

  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit(); };

  const submit = async () => {
    const val = Number(amount);
    if (!val || val <= 0) return show('الرجاء إدخال مبلغ صحيح', 'error');
    if (val > totalBalance) return show('المبلغ المدفوع أكبر من إجمالي المتأخر على الطالب', 'error');
    try {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      const { data: pay } = await supabase.from('payments').insert({
        student_id: student.id,
        student_name: student.name,
        amount: val,
        date: dateStr,
        received_by: receivedBy,
      }).select('id').single();
      await supabase.from('notifications').insert({ title: 'تسديد مصروفات', message: `تم دفع ${val} ج.م من ${student.name}`, target: 'all', is_read: false });

      show('تم تسجيل الدفع');
      await onDone();
      onClose();

      // Receipt — open in new tab (manual print via Ctrl+P, no auto-print)
      setTimeout(async () => {
        const { data: config } = await supabase.from('center_config').select('*').maybeSingle();
        const cName = config?.center_name || 'CenterMasr';
        const cAddr = config?.address || '';
        const cPhone = config?.phone || '';
        const receiptNum = pay?.id ? pay.id.slice(0, 8) : String(Date.now()).slice(-8);
        const m = ['يناير','فبراير','مارس','إبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][now.getMonth()];
        const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ايصال دفع - ${student.name}</title>
          <style>
            @page { margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
            .print-btn { background: #1e3a5f; color: white; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; cursor: pointer; margin-bottom: 20px; }
            .print-btn:hover { background: #2a5080; }
            .receipt { max-width: 340px; background: white; border-radius: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.15); overflow: hidden; }
            .rh { background: #1e3a5f; color: white; text-align: center; padding: 18px 20px; }
            .rh h2 { margin: 0; font-size: 18px; }
            .rh p { margin: 4px 0 0; font-size: 11px; opacity: 0.8; }
            .rbody { padding: 20px; }
            .rtitle { text-align: center; font-size: 14px; font-weight: bold; color: #1e3a5f; border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px; }
            .rrow { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; font-size: 13px; }
            .rrow .lbl { color: #888; }
            .rrow .val { font-weight: bold; color: #333; }
            .ramount { text-align: center; margin: 15px 0; padding: 12px; background: #e8f5e9; border-radius: 12px; font-size: 24px; font-weight: bold; color: #2e7d32; }
            .rf { text-align: center; padding: 12px; font-size: 10px; color: #aaa; border-top: 1px solid #eee; }
            .rnum { text-align: center; font-size: 10px; color: #bbb; margin-top: 8px; }
            @media print { body { background: white; padding: 0; } .print-btn { display: none; } .receipt { box-shadow: none; border: 1px solid #ddd; } }
          </style></head><body>
          <button class="print-btn" onclick="window.print()">🖨️ طباعة الإيصال</button>
          <div class="receipt">
            <div class="rh">
              <h2>${cName}</h2>
              <p>${cAddr}${cPhone ? ' | ت: ' + cPhone : ''}</p>
            </div>
            <div class="rbody">
              <div class="rtitle">إيصال دفع مصروفات</div>
              <div class="rrow"><span class="lbl">رقم الإيصال</span><span class="val">#${receiptNum}</span></div>
              <div class="rrow"><span class="lbl">اسم الطالب</span><span class="val">${student.name}</span></div>
              <div class="rrow"><span class="lbl">تاريخ الدفع</span><span class="val">${now.getDate()} ${m} ${now.getFullYear()}</span></div>
              <div class="rrow"><span class="lbl">المستلم</span><span class="val">${receivedBy}</span></div>
              <div class="ramount">${val.toLocaleString()} ج.م</div>
              <div style="text-align:center;font-size:11px;color:#666;padding:8px 0">فئة السداد: مصروفات شهرية</div>
            </div>
            <div class="rf">تمت الطباعة عن طريق CenterMasr لإدارة السناتر | 01008667306</div>
            <div class="rnum">${new Date().toLocaleString('ar-EG')}</div>
          </div>
        </body></html>`;

        const w = window.open('', '_blank');
        if (w) {
          w.document.write(html);
          w.document.close();
        }
      }, 300);
    } catch (e) {
      show('حدث خطأ أثناء تسجيل الدفع', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-pink-500" />
            <h3 className="font-bold text-gray-800">تسديد مصروفات</h3>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اسم الطالب</label>
            <input type="text" value={student.name} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">المبلغ</label>
            <div className="flex items-center gap-2">
              <input ref={amountRef} type="text" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))} onKeyDown={onKeyDown}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              <span className="text-gray-400 text-xs">ج.م</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">الباقي</label>
            <div className={`px-3 py-2 rounded-lg text-sm font-bold ${remaining > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {remaining > 0 ? `${remaining} ج.م` : 'مدفوع بالكامل ✓'}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">المستلم</label>
            <input type="text" value={receivedBy} disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">الشهر</label>
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">السنة</label>
              <input type="text" inputMode="numeric" value={year} onChange={e => setYear(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            </div>
          </div>

          <button onClick={submit}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl py-3 text-sm font-bold transition-colors">
            تأكيد الدفع
          </button>
        </div>
      </div>
    </div>
  );
}
