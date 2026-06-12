import { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Edit2, Truck, ShoppingCart, TrendingUp, Plus, Package, DollarSign, BarChart3, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';

interface Book {
  id: string;
  title: string;
  subject: string;
  grade: string;
  price: number;
  stock: number;
  purchase_price: number;
  selling_price: number;
  supplier_id: string;
  discount_value: number;
  discount_type: 'amount' | 'percent';
  paid_amount: number;
  is_general: boolean;
  quantity: number;
}

function Modal({ onClose, onSave, initial, subjects, suppliers, allGrades, allTxns }:
  { onClose: () => void; onSave: (d: any) => void; initial?: Book; subjects: string[]; suppliers: any[]; allGrades: string[]; allTxns: any[] }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    subject: initial?.subject || '',
    grade: initial?.grade || '',
    purchase_price: initial?.purchase_price || 0,
    selling_price: initial?.selling_price || initial?.price || 0,
    supplier_id: initial?.supplier_id || '',
    quantity: initial?.stock || initial?.quantity || 1,
    discount_value: initial?.discount_value || 0,
    discount_type: (initial?.discount_type || 'amount') as 'amount' | 'percent',
    paid_amount: initial?.paid_amount || 0,
    is_general: initial?.is_general || false,
  });
  const [customSubject, setCustomSubject] = useState(false);

  const total = form.quantity * form.purchase_price;
  const discountAmt = form.discount_type === 'percent' ? total * (form.discount_value / 100) : form.discount_value;
  const netTotal = Math.max(0, total - discountAmt);
  const remaining = Math.max(0, netTotal - form.paid_amount);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={18} className="text-teal-500" />
            {initial ? 'تعديل الكتاب' : 'إضافة كتاب جديد'}
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Truck size={12} /> المورد <span className="text-red-500">*</span></label>
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— اختر المورد —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {form.supplier_id && (() => {
              const sup = suppliers.find(s => s.id === form.supplier_id);
              if (!sup) return null;
              const supplierTxns = allTxns.filter((t: any) => t.supplier_id === sup.id);
              const purchases = supplierTxns.filter((t: any) => t.type === 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0);
              const payments = supplierTxns.filter((t: any) => t.type === 'payment').reduce((s: number, t: any) => s + Number(t.amount), 0);
              const discounts = supplierTxns.filter((t: any) => t.type === 'discount').reduce((s: number, t: any) => s + Number(t.amount), 0);
              const adjustments = supplierTxns.filter((t: any) => t.type === 'adjustment').reduce((s: number, t: any) => s + Number(t.amount), 0);
              const bal = Number(sup.opening_balance || 0) + purchases - payments - discounts + adjustments;
              return <div className={`mt-1.5 text-xs font-semibold px-2 py-1 rounded-md ${bal >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>رصيد الحساب: {bal >= 0 ? '+' : ''}{bal.toFixed(2)}</div>;
            })()}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اسم الكتاب <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المادة</label>
            {customSubject ? (
              <div className="flex gap-2">
                <input type="text" value={form.subject} onChange={e => set('subject', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <button onClick={() => { setCustomSubject(false); set('subject', ''); }}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border rounded-lg">قائمة</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select value={form.subject} onChange={e => { if (e.target.value === '__new__') setCustomSubject(true); else set('subject', e.target.value); }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">— اختر —</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__new__">+ إضافة مادة جديدة</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الصف</label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— اختر —</option>
              {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={form.is_general} onChange={e => set('is_general', e.target.checked)}
                className="rounded border-gray-300 text-teal-500 focus:ring-teal-400" />
              <span className="text-xs text-gray-500">كتاب عام لكل المراحل</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">سعر الشراء</label>
              <input type="number" value={form.purchase_price || ''} onChange={e => set('purchase_price', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">سعر البيع</label>
              <input type="number" value={form.selling_price || ''} onChange={e => set('selling_price', parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الكمية</label>
            <input type="number" value={form.quantity || ''} onChange={e => set('quantity', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">الإجمالي:</span>
              <span className="font-bold text-gray-800">{total.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الخصم</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input type="number" value={form.discount_value || ''} onChange={e => set('discount_value', parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <select value={form.discount_type} onChange={e => set('discount_type', e.target.value)}
                className="w-24 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                <option value="amount">مبلغ</option>
                <option value="percent">نسبة %</option>
              </select>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <span className="text-blue-600">الإجمالي بعد الخصم:</span>
              <span className="font-bold text-blue-700">{netTotal.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المدفوع</label>
            <input type="number" value={form.paid_amount || ''} onChange={e => set('paid_amount', parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          </div>
          <div className={`rounded-lg p-3 ${remaining > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <div className="flex justify-between text-sm">
              <span className={`${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>الباقي (يترحل لحساب المورد):</span>
              <span className={`font-bold ${remaining > 0 ? 'text-amber-700' : 'text-green-700'}`}>{remaining.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave({ ...form, stock: form.quantity, price: form.selling_price, quantity: form.quantity })} disabled={!form.title.trim() || !form.supplier_id}
            className="px-5 py-2 rounded-lg bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

export default function Books({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { show, confirm } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [allGrades, setAllGrades] = useState<string[]>([]);
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Book | undefined>();
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  const [stockModal, setStockModal] = useState<{ book: any; open: boolean }>({ book: null, open: false });
  const [stockQty, setStockQty] = useState(0);
  const [payModal, setPayModal] = useState<{ book: any; open: boolean }>({ book: null, open: false });
  const [payAmt, setPayAmt] = useState(0);
  const [payDesc, setPayDesc] = useState('');
  const payInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (payModal.open) setTimeout(() => payInputRef.current?.focus(), 100); }, [payModal.open]);

  const load = async () => {
    setLoading(true);
    const [bookRes, subRes, supRes, grdRes, txnRes] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('grades').select('name').order('name'),
      supabase.from('supplier_transactions').select('*'),
    ]);
    setBooks(bookRes.data || []);
    setAllSubjects((subRes.data || []).map((s: any) => s.name));
    setAllSuppliers(supRes.data || []);
    setAllTxns(txnRes.data || []);
    setAllGrades((grdRes.data || []).map((g: any) => g.name));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    try {
      const { quantity, ...bookData } = form;
      const netTotalVal = quantity * form.purchase_price;
      const discountAmtVal = form.discount_type === 'percent' ? netTotalVal * (form.discount_value / 100) : form.discount_value;
      const netVal = Math.max(0, netTotalVal - discountAmtVal);

      if (editing) {
        await supabase.from('books').update(bookData).eq('id', editing.id);
        show('تم تعديل الكتاب');
      } else {
        await supabase.from('books').insert(bookData);
        show('تم إضافة الكتاب');
        if (netVal > 0) {
          await supabase.from('supplier_transactions').insert({
            supplier_id: form.supplier_id, type: 'purchase', amount: netVal,
            description: `مشتريات كتاب: ${form.title}${form.subject ? ` (${form.subject})` : ''}`,
            date: new Date().toISOString().slice(0, 10),
          });
        }
        if (form.paid_amount > 0) {
          await supabase.from('supplier_transactions').insert({
            supplier_id: form.supplier_id, type: 'payment', amount: form.paid_amount,
            description: `دفعة عند شراء كتاب: ${form.title}${form.subject ? ` (${form.subject})` : ''}`,
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }
      setShowModal(false); setEditing(undefined); load();
    } catch { show('حدث خطأ', 'error'); }
  };

  const openStats = (book: any) => {
    localStorage.setItem('book-stats-id', book.id);
    onNavigate?.('book-stats');
  };

  const openStockModal = (book: any) => { setStockModal({ book, open: true }); setStockQty(0); };
  const saveStock = async () => {
    if (!stockQty || stockQty <= 0) return show('الكمية يجب أن تكون أكبر من 0', 'error');
    const book = stockModal.book;
    const cost = stockQty * Number(book.purchase_price || 0);
    const disc = book.discount_type === 'percent' ? cost * (Number(book.discount_value) / 100) : (Number(book.discount_value || 0));
    const netCost = Math.max(0, cost - disc);
    const newStock = (Number(book.stock) || 0) + stockQty;
    const res = await fetch(`/api/books/${book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: newStock }) });
    if (!res.ok) return show('فشل تحديث المخزون', 'error');
    if (book.supplier_id && netCost > 0) {
      await fetch('/api/supplier_transactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: crypto.randomUUID(), supplier_id: book.supplier_id, type: 'purchase', amount: netCost, description: `إضافة كمية ${stockQty} - ${book.title}`, date: new Date().toISOString().slice(0, 10) })
      });
    }
    show(`تم إضافة ${stockQty} نسخ للمخزون (${netCost.toFixed(2)})`);
    setStockModal({ book: null, open: false }); load();
  };

  const openPayModal = (book: any) => { setPayModal({ book, open: true }); setPayAmt(0); setPayDesc(''); };
  const savePay = async () => {
    if (!payAmt || payAmt <= 0) return show('المبلغ يجب أن يكون أكبر من 0', 'error');
    const book = payModal.book;
    if (!book || !book.supplier_id) return show('الكتاب ليس له مورد', 'error');
    const newPaid = (Number(book.paid_amount) || 0) + payAmt;
    try {
      const [upRes] = await Promise.all([
        fetch(`/api/books/${book.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid_amount: newPaid }) }),
        fetch(`/api/supplier_transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ supplier_id: book.supplier_id, type: 'payment', amount: payAmt, description: payDesc || `دفعة عن كتاب: ${book.title}`, book_id: book.id, date: new Date().toISOString().slice(0, 10) }) }),
      ]);
      if (!upRes.ok) return show('فشل تحديث المدفوع في الكتاب', 'error');
      show('تم تسجيل الدفعة');
      setPayModal({ book: null, open: false }); load();
    } catch (e) {
      show('فشل تسجيل الدفعة', 'error');
    }
  };

  const filtered = books.filter(b => {
    if (filterGrade && b.grade !== filterGrade) return false;
    if (filterSupplier && b.supplier_id !== filterSupplier) return false;
    if (filterPayment) {
      const rem = getSupplierBalance(b.supplier_id);
      if (filterPayment === 'paid' && rem > 0) return false;
      if (filterPayment === 'unpaid' && rem <= 0) return false;
    }
    return true;
  }).filter(b => b.title.includes(search) || b.subject.includes(search) || b.grade.includes(search));

  const getSupplierBalance = (supplierId: string) => {
    const sup = allSuppliers.find(s => s.id === supplierId);
    if (!sup) return 0;
    const supTxns = allTxns.filter((t: any) => t.supplier_id === sup.id);
    const purchases = supTxns.filter((t: any) => t.type === 'purchase').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const payments = supTxns.filter((t: any) => t.type === 'payment').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const discounts = supTxns.filter((t: any) => t.type === 'discount').reduce((s: number, t: any) => s + Number(t.amount), 0);
    const adjustments = supTxns.filter((t: any) => t.type === 'adjustment').reduce((s: number, t: any) => s + Number(t.amount), 0);
    return Number(sup.opening_balance || 0) + purchases - payments - discounts + adjustments;
  };

  const getSupplierName = (id: string) => allSuppliers.find(s => s.id === id)?.name || '—';

  const extraButtons = [
    {
      label: filterGrade || 'الكل', icon: <Filter size={15} />, color: 'bg-violet-500',
      dropdownItems: [{ label: 'كل الصفوف', onClick: () => setFilterGrade('') }, ...allGrades.map(g => ({ label: g, onClick: () => setFilterGrade(g) }))],
    },
    {
      label: filterSupplier ? getSupplierName(filterSupplier) : 'المورد', icon: <Truck size={15} />, color: 'bg-amber-500',
      dropdownItems: [{ label: 'كل الموردين', onClick: () => setFilterSupplier('') }, ...allSuppliers.map(s => ({ label: s.name, onClick: () => setFilterSupplier(s.id) }))],
    },
    {
      label: filterPayment === 'paid' ? 'مدفوع' : filterPayment === 'unpaid' ? 'غير مدفوع' : 'حالة الدفع', icon: <DollarSign size={15} />, color: 'bg-cyan-500',
      dropdownItems: [
        { label: 'الكل', onClick: () => setFilterPayment('') },
        { label: 'مدفوع بالكامل', onClick: () => setFilterPayment('paid') },
        { label: 'باقي مبلغ', onClick: () => setFilterPayment('unpaid') },
      ],
    },
  ];

  const computeTotal = (b: any) => ((b.quantity || b.stock || 0) * (b.purchase_price || 0)).toFixed(2);

  const lowStockBooks = books.filter(b => Number(b.stock) <= 5);

  return (
    <div className="fade-in space-y-4">
      {lowStockBooks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><ShoppingCart size={16} className="text-red-500" /></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-800">تنبيه: يوجد {lowStockBooks.length} كتاب {lowStockBooks.length === 1 ? 'منخفض المخزون' : 'منخفضة المخزون'}</p>
            <p className="text-xs text-red-600 mt-0.5">
              {lowStockBooks.slice(0, 3).map(b => b.title).join('، ')}
              {lowStockBooks.length > 3 ? ` و ${lowStockBooks.length - 3} كتب أخرى` : ''}
            </p>
          </div>
        </div>
      )}

      {showModal &&
        <Modal onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSave={save} initial={editing} subjects={allSubjects} suppliers={allSuppliers} allGrades={allGrades} allTxns={allTxns} />}

      <ListTemplate
        title="الكتب"
        data={filtered}
        keyExtractor={b => b.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو المادة أو الصف..."
        loading={loading}
        emptyMessage="لا توجد كتب مسجلة"
        emptyIcon={<BookOpen size={40} className="mx-auto text-gray-300" />}
        onAdd={() => { setEditing(undefined); setShowModal(true); }}
        onRefresh={load}
        extraButtons={extraButtons}
        columns={[
          { key: 'title', label: 'اسم الكتاب', render: (b: any) => <span className="font-semibold text-gray-800">{b.title}</span> },
          { key: 'supplier', label: 'المورد', render: (b: any) => <span className="text-gray-500 text-xs">{getSupplierName(b.supplier_id)}</span> },
          { key: 'subject', label: 'المادة', render: (b: any) => <span className="text-gray-600">{b.subject}</span> },
          { key: 'grade', label: 'الصف', render: (b: any) => <span className="text-gray-600">{b.is_general ? 'عام' : b.grade}</span> },
          { key: 'stock', label: 'المخزون', render: (b: any) => <span className={`font-bold ${b.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>{b.stock}</span> },
          { key: 'purchase_price', label: 'سعر الشراء', render: (b: any) => <span className="text-gray-600">{Number(b.purchase_price || 0).toFixed(2)}</span> },
          { key: 'total_cost', label: 'إجمالي الشراء', render: (b: any) => <span className="text-gray-700 font-semibold">{computeTotal(b)}</span> },
          { key: 'remaining', label: 'المتبقي', render: (b: any) => {
            const bal = getSupplierBalance(b.supplier_id);
            return <span className={`font-bold ${bal > 0 ? 'text-red-500' : 'text-green-600'}`}>{bal.toFixed(2)}</span>;
          } },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: (b: any) => (
              <div className="flex items-center gap-0.5">
                <button onClick={() => openStats(b)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded-lg" title="إحصائيات"><BarChart3 size={14} /></button>
                <button onClick={() => openStockModal(b)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="إضافة كمية"><Package size={14} /></button>
                <button onClick={() => openPayModal(b)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg" title="دفع"><DollarSign size={14} /></button>
                <button onClick={() => { setEditing(b); setShowModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit2 size={14} /></button>
              </div>
            )
          },
        ]}
      />

      {/* Stock modal */}
      {stockModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setStockModal({ book: null, open: false })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-amber-500" /> إضافة كمية</h3>
              <button onClick={() => setStockModal({ book: null, open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">الكتاب: <span className="font-semibold">{stockModal.book.title}</span></p>
              <p className="text-xs text-gray-400">المخزون الحالي: <span className="font-bold">{stockModal.book.stock || 0}</span></p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الكمية المضافة</label>
                <input type="number" value={stockQty || ''} onChange={e => setStockQty(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-amber-600">المخزون بعد الإضافة:</span>
                  <span className="font-bold text-amber-700">{(stockModal.book.stock || 0) + (stockQty > 0 ? stockQty : 0)}</span>
                </div>
                {stockModal.book.supplier_id && stockQty > 0 && (() => {
                  const cost = stockQty * Number(stockModal.book.purchase_price || 0);
                  const disc = stockModal.book.discount_type === 'percent' ? cost * (Number(stockModal.book.discount_value) / 100) : (Number(stockModal.book.discount_value || 0));
                  const netCost = Math.max(0, cost - disc);
                  return <div className="flex justify-between pt-1 border-t border-amber-200">
                    <span className="text-amber-600">تكلفة الإضافة:</span>
                    <span className="font-bold text-amber-700">{netCost.toFixed(2)}</span>
                  </div>;
                })()}
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setStockModal({ book: null, open: false })} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={saveStock} disabled={!stockQty || stockQty <= 0}
                className="px-5 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">إضافة</button>
            </div>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPayModal({ book: null, open: false })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><DollarSign size={18} className="text-green-500" /> دفع مبلغ للمورد</h3>
              <button onClick={() => setPayModal({ book: null, open: false })}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">الكتاب: <span className="font-semibold">{payModal.book.title}</span></p>
              <p className="text-xs text-gray-400">المورد: <span className="font-bold">{getSupplierName(payModal.book.supplier_id)}</span></p>
              {(() => {
                const bal = getSupplierBalance(payModal.book.supplier_id);
                return <p className="text-xs text-gray-400">رصيد المورد: <span className={`font-bold ${bal >= 0 ? 'text-green-500' : 'text-red-500'}`}>{bal >= 0 ? '+' : ''}{bal.toFixed(2)}</span></p>;
              })()}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المبلغ</label>
                <input ref={payInputRef} type="number" value={payAmt || ''} onChange={e => setPayAmt(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الوصف</label>
                <input value={payDesc} onChange={e => setPayDesc(e.target.value)} placeholder="دفعة"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setPayModal({ book: null, open: false })} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={savePay} disabled={!payAmt || payAmt <= 0}
                className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50">تسديد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
