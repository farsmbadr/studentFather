import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Edit2, Trash2, Truck, DollarSign, ShoppingCart, CreditCard, Percent, History, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

export default function Suppliers() {
  const { show, confirm } = useToast();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '', opening_balance: 0 });
  const [txnModal, setTxnModal] = useState<{ supplier: any; open: boolean }>({ supplier: null, open: false });
  const [showTxnForm, setShowTxnForm] = useState(false);
  const [txnForm, setTxnForm] = useState({ type: 'purchase', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) });
  const [txnSaving, setTxnSaving] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState({ amount: 0, description: '', date: new Date().toISOString().slice(0, 10) });
  const [paySaving, setPaySaving] = useState(false);
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  const load = async () => {
    setLoading(true);
    const [sRes, tRes, cfgRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('supplier_transactions').select('*'),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
    ]);
    setSuppliers(sRes.data || []);
    setTxns(tRes.data || []);
    if (cfgRes.data) { setCenterName((cfgRes.data as any).center_name || 'CenterMasr'); setCenterAddress((cfgRes.data as any).address || ''); setCenterPhone((cfgRes.data as any).phone || ''); setCenterLogo((cfgRes.data as any).logo || ''); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadTxns = async (supplierId: string) => {
    const { data } = await supabase.from('supplier_transactions').select('*');
    setTxns(data || []);
  };

  const calcBalance = (s: any) => {
    const supplierTxns = txns.filter(t => t.supplier_id === s.id);
    const purchases = supplierTxns.filter(t => t.type === 'purchase').reduce((sum, t) => sum + Number(t.amount), 0);
    const payments = supplierTxns.filter(t => t.type === 'payment').reduce((sum, t) => sum + Number(t.amount), 0);
    const discounts = supplierTxns.filter(t => t.type === 'discount').reduce((sum, t) => sum + Number(t.amount), 0);
    const adjustments = supplierTxns.filter(t => t.type === 'adjustment').reduce((sum, t) => sum + Number(t.amount), 0);
    return Number(s.opening_balance || 0) + purchases - payments - discounts + adjustments;
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', address: '', notes: '', opening_balance: 0 });
    setEditing(null); setShowForm(false);
  };

  const save = async () => {
    if (!form.name.trim()) return show('اسم المورد مطلوب', 'error');
    setSaving(true);
    try {
      if (editing) await supabase.from('suppliers').update(form).eq('id', editing.id);
      else await supabase.from('suppliers').insert(form);
      show(editing ? 'تم تعديل المورد' : 'تم إضافة المورد', 'success');
      resetForm(); load();
    } catch { show('حدث خطأ', 'error'); }
    setSaving(false);
  };

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا المورد؟');
    if (!ok) return;
    await supabase.from('suppliers').delete().eq('id', id);
    show('تم حذف المورد');
    load();
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '', notes: s.notes || '', opening_balance: Number(s.opening_balance || 0) });
    setShowForm(true);
  };

  const openTxnModal = async (s: any) => {
    setTxnModal({ supplier: s, open: true });
    await loadTxns(s.id);
  };

  const saveTxn = async () => {
    if (!txnForm.amount || txnForm.amount <= 0) return show('المبلغ يجب أن يكون أكبر من 0', 'error');
    setTxnSaving(true);
    try {
      await supabase.from('supplier_transactions').insert({
        supplier_id: txnModal.supplier.id,
        type: txnForm.type,
        amount: txnForm.amount,
        description: txnForm.description,
        date: txnForm.date,
      });
      show('تم إضافة المعاملة', 'success');
      setShowTxnForm(false);
      setTxnForm({ type: 'purchase', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) });
      await loadTxns(txnModal.supplier.id);
    } catch { show('حدث خطأ', 'error'); }
    setTxnSaving(false);
  };

  const openPayModal = (s: any) => {
    setPayTarget(s);
    setPayForm({ amount: 0, description: '', date: new Date().toISOString().slice(0, 10) });
    setShowPayModal(true);
  };

  const savePayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return show('المبلغ يجب أن يكون أكبر من 0', 'error');
    setPaySaving(true);
    try {
      await supabase.from('supplier_transactions').insert({
        supplier_id: payTarget.id,
        type: 'payment',
        amount: payForm.amount,
        description: payForm.description || 'دفعة',
        date: payForm.date,
      });
      show('تم تسجيل الدفعة', 'success');
      setShowPayModal(false);
      await loadTxns(payTarget.id);
      load();
    } catch { show('حدث خطأ', 'error'); }
    setPaySaving(false);
  };

  const txnTypeLabel: Record<string, string> = { purchase: 'مشتريات', payment: 'مدفوعات', discount: 'خصم', adjustment: 'تسوية' };
  const txnTypeColor: Record<string, string> = { purchase: 'text-blue-600 bg-blue-50', payment: 'text-green-600 bg-green-50', discount: 'text-orange-600 bg-orange-50', adjustment: 'text-purple-600 bg-purple-50' };
  const txnTypeIcon: Record<string, any> = { purchase: <ShoppingCart size={14} />, payment: <CreditCard size={14} />, discount: <Percent size={14} />, adjustment: <DollarSign size={14} /> };

  const handlePrint = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"/><title>الموردين</title>
      <style>
        ${printHeaderStyle()}
        body{font-family:sans-serif;padding:20px}
        .new-header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #333}
        .new-header img{height:60px;width:auto;vertical-align:middle;margin-left:10px}
        .new-header h1{display:inline;font-size:24pt;margin:0;vertical-align:middle}
        .new-header p{font-size:14pt;color:#666;margin:5px 0 0}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ccc;padding:8px;text-align:right}
        th{background:#f5f5f5}td{font-size:16pt}
        .footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ccc;font-size:14pt;color:#999}
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <h2 style="text-align:center;margin-bottom:15px">قائمة الموردين</h2>
      <table><thead><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>الرصيد</th><th>ملحوظات</th></tr></thead><tbody>`);
    suppliers.forEach((s, i) => {
      const balance = calcBalance(s);
      w.document.write(`<tr><td>${i + 1}</td><td>${s.name}</td><td>${s.phone || '—'}</td><td>${s.address || '—'}</td><td>${balance.toFixed(2)}</td><td>${s.notes || '—'}</td></tr>`);
    });
    w.document.write(`</tbody></table>${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); setTimeout(() => { w.close(); window.focus(); }, 100); }, 200);
  }, [suppliers, txns, centerName, centerAddress, centerPhone, centerLogo]);

  const handleAdd = useCallback(() => { resetForm(); setShowForm(true); }, []);

  const printTxnStatement = (s: any) => {
    const supTxns = txns.filter(t => t.supplier_id === s.id);
    const sorted = [...supTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>كشف حساب - ${s.name}</title>
      <style>
        ${printHeaderStyle()}
        *{margin:0;padding:0;box-sizing:border-box;font-family:Tahoma,Arial,sans-serif;}
        body{padding:20px;color:#333;font-size:14pt;}
        .info{display:flex;justify-content:space-between;margin-bottom:15px;padding:10px;background:#f8f8f8;border-radius:6px;font-size:14pt;}
        .info span{color:#555;}
        table{width:100%;border-collapse:collapse;margin-bottom:10px;}
        th{background:#c0392b;color:#fff;padding:8px 6px;font-size:14pt;text-align:center;}
        td{padding:6px;text-align:center;border-bottom:1px solid #eee;font-size:14pt;}
        tr:nth-child(even){background:#f9f9f9;}
        .bal{font-weight:bold;color:#c0392b;}
        .positive{color:#27ae60;}
        .negative{color:#c0392b;}
        .total{background:#fef9e7;font-size:16pt;padding:8px;text-align:center;border:1px solid #f9e79f;border-radius:6px;margin-top:10px;}
        .footer{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #ddd;color:#999;font-size:12pt;}
      </style></head><body>
      ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
      <div class="info"><span>المورد: <b>${s.name}</b></span><span>الهاتف: ${s.phone || '—'}</span><span>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</span></div>
      <table><thead><tr><th>#</th><th>التاريخ</th><th>البيان</th><th>مدين</th><th>دائن</th></tr></thead><tbody>`);
    let running = Number(s.opening_balance || 0);
    w.document.write(`<tr><td>—</td><td>—</td><td>رصيد افتتاحي</td><td>—</td><td class="positive">${running.toFixed(2)}</td></tr>`);
    sorted.forEach((t, i) => {
      running += t.type === 'payment' || t.type === 'discount' ? -Number(t.amount) : Number(t.amount);
      const debit = (t.type === 'payment' || t.type === 'discount') ? Number(t.amount).toFixed(2) : '—';
      const credit = (t.type !== 'payment' && t.type !== 'discount') ? Number(t.amount).toFixed(2) : '—';
      w.document.write(`<tr><td>${i + 1}</td><td>${t.date?.slice(0, 10) || '—'}</td><td>${t.description || t.type}</td><td class="negative">${debit}</td><td class="positive">${credit}</td></tr>`);
    });
    w.document.write(`</tbody></table><div class="total">الرصيد الحالي: <b class="${running >= 0 ? 'positive' : 'negative'}">${running >= 0 ? '+' : ''}${running.toFixed(2)}</b></div>`);
    w.document.write(`${printFooterHtml()}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); setTimeout(() => { w.close(); window.focus(); }, 100); }, 200);
  };

  const columns = [
    { key: 'index', label: '#', sortable: false, render: (_: any, i: number) => <span className="text-gray-400">{i + 1}</span> },
    { key: 'name', label: 'الاسم', render: (s: any) => <span className="font-semibold text-gray-800">{s.name}</span> },
    { key: 'phone', label: 'الهاتف', render: (s: any) => <span className="text-gray-600">{s.phone || '—'}</span> },
    { key: 'address', label: 'العنوان', render: (s: any) => <span className="text-gray-600">{s.address || '—'}</span> },
    {
      key: 'balance', label: 'الرصيد', sortable: false,
      render: (s: any) => {
        const balance = calcBalance(s);
        return (
          <button onClick={() => openTxnModal(s)}
            className={`font-bold text-sm px-2 py-1 rounded-lg cursor-pointer transition-colors ${balance >= 0 ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}>
            {balance >= 0 ? '+' : ''}{balance.toFixed(2)}
          </button>
        );
      },
    },
    { key: 'notes', label: 'ملحوظات', render: (s: any) => <span className="text-gray-400 text-xs">{s.notes || '—'}</span> },
    {
      key: 'actions', label: 'إجراءات', sortable: false,
      render: (s: any) => (
        <div className="flex items-center gap-1">
          <button onClick={() => printTxnStatement(s)} className="p-1.5 text-gray-500 hover:bg-gray-50 rounded-lg" title="طباعة كشف حساب"><Printer size={14} /></button>
          <button onClick={() => openTxnModal(s)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg" title="كشف حساب"><History size={14} /></button>
          <button onClick={() => openPayModal(s)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="دفع"><CreditCard size={14} /></button>
          <button onClick={() => openEdit(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit2 size={14} /></button>
          <button onClick={() => remove(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="fade-in space-y-4">
      <ListTemplate
        title="قائمة الموردين"
        data={suppliers}
        columns={columns}
        searchValue={search}
        onSearchChange={setSearch}
        loading={loading}
        emptyMessage="لا يوجد موردون"
        emptyIcon={<Truck size={40} className="text-gray-300 mx-auto" />}
        keyExtractor={(s: any) => s.id}
        onAdd={handleAdd}
        onPrint={handlePrint}
        onRefresh={load}
      />

      {/* Add/Edit Supplier Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!saving) resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">{editing ? 'تعديل مورد' : 'إضافة مورد'}</h3>
              <button onClick={resetForm} disabled={saving}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الاسم <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الهاتف</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">العنوان</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الرصيد الافتتاحي</label>
                <input type="number" value={form.opening_balance} onChange={e => setForm(f => ({ ...f, opening_balance: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ملحوظات</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={resetForm} disabled={saving} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                {saving ? 'جاري...' : editing ? 'حفظ التعديلات' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {txnModal.open && txnModal.supplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setTxnModal({ supplier: null, open: false })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Truck size={18} className="text-orange-500" />
                {txnModal.supplier.name}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${calcBalance(txnModal.supplier) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  الرصيد: {calcBalance(txnModal.supplier) >= 0 ? '+' : ''}{calcBalance(txnModal.supplier).toFixed(2)}
                </span>
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => setTxnModal({ supplier: null, open: false })}><X size={20} className="text-gray-400" /></button>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-2 p-4 border-b shrink-0">
              <button onClick={() => { setShowTxnForm(true); setTxnForm({ type: 'purchase', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition-colors">
                <ShoppingCart size={14} /> مشتريات
              </button>
              <button onClick={() => { setShowTxnForm(true); setTxnForm({ type: 'payment', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-semibold hover:bg-green-600 transition-colors">
                <CreditCard size={14} /> مدفوعات
              </button>
              <button onClick={() => { setShowTxnForm(true); setTxnForm({ type: 'discount', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition-colors">
                <Percent size={14} /> خصم
              </button>
              <button onClick={() => { setShowTxnForm(true); setTxnForm({ type: 'adjustment', amount: 0, description: '', date: new Date().toISOString().slice(0, 10) }); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500 text-white rounded-xl text-xs font-semibold hover:bg-purple-600 transition-colors">
                <DollarSign size={14} /> تسوية
              </button>
            </div>

            {/* Add transaction form inline */}
            {showTxnForm && (
              <div className="p-4 border-b bg-gray-50 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">المبلغ</label>
                    <input type="number" value={txnForm.amount || ''} onChange={e => setTxnForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div className="flex-1 min-w-32">
                    <label className="text-[10px] text-gray-400 block mb-0.5">الوصف</label>
                    <input value={txnForm.description} onChange={e => setTxnForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">التاريخ</label>
                    <input type="date" value={txnForm.date} onChange={e => setTxnForm(f => ({ ...f, date: e.target.value }))}
                      className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div className="flex gap-1.5 items-end pb-0.5">
                    <button onClick={saveTxn} disabled={txnSaving}
                      className="px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-semibold hover:bg-violet-600 disabled:opacity-50">
                      {txnSaving ? '...' : 'حفظ'}
                    </button>
                    <button onClick={() => setShowTxnForm(false)}
                      className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50">
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction list */}
            <div className="overflow-y-auto p-4 flex-1">
              {txns.filter(t => t.supplier_id === txnModal.supplier.id).length === 0 ? (
                <div className="text-center py-12 text-gray-300 text-sm">لا توجد معاملات</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b">
                      <th className="text-right py-2 px-2">التاريخ</th>
                      <th className="text-right py-2 px-2">النوع</th>
                      <th className="text-right py-2 px-2">الوصف</th>
                      <th className="text-left py-2 px-2">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.filter(t => t.supplier_id === txnModal.supplier.id).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                      <tr key={t.id} className="border-b border-gray-50">
                        <td className="py-2.5 px-2 text-gray-500 text-xs">{new Date(t.date).toLocaleDateString('ar-EG')}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${txnTypeColor[t.type] || 'text-gray-600 bg-gray-50'}`}>
                            {txnTypeIcon[t.type]} {txnTypeLabel[t.type] || t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-gray-600">{t.description || '—'}</td>
                        <td className={`py-2.5 px-2 text-left font-bold ${t.type === 'payment' || t.type === 'discount' ? 'text-red-500' : 'text-green-600'}`}>
                          {t.type === 'payment' || t.type === 'discount' ? '-' : '+'}{Number(t.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && payTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CreditCard size={18} className="text-green-500" />
                دفعة لـ {payTarget.name}
              </h3>
              <button onClick={() => setShowPayModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المبلغ</label>
                <input type="number" value={payForm.amount || ''} onChange={e => setPayForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الوصف</label>
                <input value={payForm.description} onChange={e => setPayForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" placeholder="دفعة" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">التاريخ</label>
                <input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setShowPayModal(false)} disabled={paySaving} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={savePayment} disabled={paySaving}
                className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50">
                {paySaving ? 'جاري...' : 'تسجيل الدفعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
