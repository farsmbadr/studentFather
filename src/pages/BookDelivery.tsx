import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, CheckCircle, BookOpen, Edit2, Trash2, Printer, FileDown, RefreshCw, Search, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import ListTemplate from '../components/ListTemplate';

export default function BookDelivery() {
  const { show } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [groupFilter, setGroupFilter] = useState('');
  const [studentId, setStudentId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [deliveryType, setDeliveryType] = useState('بيع');
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().slice(0, 10));
  const [barcodeInput, setBarcodeInput] = useState('');
  const studentRef = useRef<HTMLSelectElement>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const [payDelivery, setPayDelivery] = useState<any>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [paySaving, setPaySaving] = useState(false);

  const [filterGrade, setFilterGrade] = useState('');
  const [filterBook, setFilterBook] = useState('');
  const [filterPay, setFilterPay] = useState('');
  const [allGrades, setAllGrades] = useState<string[]>([]);

  useEffect(() => { if (showForm) setTimeout(() => barcodeRef.current?.focus(), 100); }, [showForm]);

  const load = async () => {
    setLoading(true);
    const [sRes, bRes, dRes, gRes] = await Promise.all([
      supabase.from('students').select('id,name,group_name,grade,balance,code').eq('status', 'active').order('name'),
      supabase.from('books').select('title,price,selling_price,stock').order('title'),
      supabase.from('book_deliveries').select('*').order('delivery_date', { ascending: false }),
      supabase.from('grades').select('name').order('name'),
    ]);
    const studentsData = sRes.data || [];
    setStudents(studentsData);
    setAllGrades((gRes.data || []).map((g: any) => g.name));
    setBooks(bRes.data || []);
    const enriched = (dRes.data || []).map(d => {
      const st = studentsData.find(s => s.id === d.student_id);
      return { ...d, student_name: st?.name || d.student_name || '', group_name: st?.group_name || '', grade: st?.grade || '' };
    });
    setDeliveries(enriched);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const allGroups = [...new Set(students.map(s => s.group_name).filter(Boolean))].sort();
  const filteredStudents = groupFilter ? students.filter(s => s.group_name === groupFilter) : students;

  const getStudent = (studentId: string) => students.find(s => s.id === studentId);

  const resetForm = () => {
    setGroupFilter(''); setStudentId(''); setBookTitle(''); setDeliveryType('بيع');
    setPricePerUnit(0); setPaidAmount(0); setNotes('');
    setDeliveryDate(new Date().toISOString().slice(0, 10));
    setBarcodeInput('');
    setEditingDelivery(null);
    setShowForm(false);
  };

  const handleBarcodeScan = (value: string) => {
    setBarcodeInput(value);
    const student = students.find(s => s.code === value.trim());
    if (student) {
      setStudentId(student.id);
      setGroupFilter(student.group_name || '');
      show(`تم التعرف على ${student.name}`);
      setTimeout(() => {
        const bookSelect = document.querySelector<HTMLSelectElement>('#book-select-delivery');
        bookSelect?.focus();
      }, 100);
    }
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (d: any) => {
    setEditingDelivery(d);
    setStudentId(d.student_id);
    setBookTitle(d.book_title);
    setDeliveryType(d.delivery_type || 'بيع');
    setPricePerUnit(Number(d.price_per_unit));
    setPaidAmount(Number(d.paid_amount || 0));
    setNotes(d.notes || '');
    setDeliveryDate(d.delivery_date?.slice(0, 10) || new Date().toISOString().slice(0, 10));
    const st = getStudent(d.student_id);
    setBarcodeInput(st?.code || '');
    setGroupFilter(st?.group_name || '');
    setShowForm(true);
  };

  const handleBookSelect = (title: string) => {
    setBookTitle(title);
    const book = books.find(b => b.title === title);
    if (book) setPricePerUnit(Number(book.selling_price || book.price || 0));
  };

  const remaining = Math.max(0, pricePerUnit - paidAmount);

  const payBook = async () => {
    if (!payDelivery || !payAmount || payAmount <= 0) return show('الرجاء إدخال المبلغ', 'error');
    setPaySaving(true);
    try {
      const d = payDelivery;
      const newPaid = Number(d.paid_amount || 0) + payAmount;
      const newRemaining = Math.max(0, Number(d.total_price || 0) - newPaid);
      await supabase.from('book_deliveries').update({ paid_amount: newPaid, remaining: newRemaining }).eq('id', d.id);
      const student = getStudent(d.student_id);
      const newBalance = Math.max(0, (Number(student?.balance) || 0) - payAmount);
      await supabase.from('students').update({ balance: newBalance }).eq('id', d.student_id);
      await supabase.from('book_delivery_payments').insert({
        delivery_id: d.id, student_id: d.student_id, amount: payAmount,
        date: new Date().toISOString().slice(0, 10),
        notes: `دفعة عن ${d.book_title}`,
      });
      show(`تم دفع ${payAmount} ج عن ${d.book_title}`);
      setPayDelivery(null); setPayAmount(0); load();
    } catch { show('حدث خطأ', 'error'); }
    setPaySaving(false);
  };

  const save = async () => {
    if (!studentId || !bookTitle) return show('الرجاء اختيار الطالب والكتاب', 'error');
    setSaving(true);
    const student = getStudent(studentId);
    const book = books.find(b => b.title === bookTitle);
    try {
      if (editingDelivery) {
        await supabase.from('book_deliveries').update({
          student_id: studentId, student_name: student?.name || '', book_title: bookTitle,
          price_per_unit: pricePerUnit, total_price: pricePerUnit,
          paid_amount: paidAmount, remaining: remaining,
          delivery_type: deliveryType, delivery_date: deliveryDate, notes,
        }).eq('id', editingDelivery.id);
        show('تم تعديل التسليم');
      } else {
        await supabase.from('book_deliveries').insert({
          student_id: studentId, student_name: student?.name || '', book_title: bookTitle,
          book_subject: '', quantity: 1,
          price_per_unit: pricePerUnit, total_price: pricePerUnit,
          paid_amount: paidAmount, remaining: remaining,
          delivery_type: deliveryType, delivery_date: deliveryDate, notes,
          status: 'مسلم',
        });
        if (remaining > 0) {
          const newBalance = (Number(student?.balance) || 0) + remaining;
          await supabase.from('students').update({ balance: newBalance }).eq('id', studentId);
        }
        if (book && Number(book.stock) > 0) {
          const newStock = Number(book.stock) - 1;
          await supabase.from('books').update({ stock: newStock }).eq('id', book.id);
          if (newStock <= 5) {
            await supabase.from('notifications').insert({
              title: 'تنبيه المخزون',
              message: newStock <= 0 ? `الكتاب "${bookTitle}" نفد من المخزون` : `الكتاب "${bookTitle}" متبقي منه ${newStock} نسخ فقط`,
              target: 'all', is_read: false,
            });
          }
        }
        show(`تم تسليم ${bookTitle} للطالب ${student?.name}`);
      }
      if (editingDelivery) {
        setShowForm(false);
        setEditingDelivery(null);
      } else {
        setGroupFilter('');
        setStudentId('');
        setBarcodeInput('');
        setNotes('');
        setDeliveryDate(new Date().toISOString().slice(0, 10));
        setTimeout(() => barcodeRef.current?.focus(), 50);
      }
      load();
    } catch { show('حدث خطأ', 'error'); }
    setSaving(false);
  };

  const removeDelivery = async (d: any) => {
    if (!confirm('حذف هذا التسليم؟')) return;
    await supabase.from('book_deliveries').delete().eq('id', d.id);
    show('تم الحذف');
    load();
  };

  const formatTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const allBookTitles = [...new Set(deliveries.map(d => d.book_title).filter(Boolean))].sort();
  const payStatuses: { value: string; label: string }[] = [
    { value: 'paid', label: 'مدفوع' },
    { value: 'remaining', label: 'عليه متبقي' },
    { value: 'free', label: 'مجانى' },
  ];

  const filtered = deliveries.filter(d => {
    if (search) {
      const s = search.toLowerCase();
      const name = (d.student_name || '').toLowerCase();
      const title = (d.book_title || '').toLowerCase();
      if (!name.includes(s) && !title.includes(s)) return false;
    }
    if (filterGrade) {
      const st = getStudent(d.student_id);
      if (st?.grade !== filterGrade) return false;
    }
    if (filterBook && d.book_title !== filterBook) return false;
    if (filterPay) {
      const rem = Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)));
      if (filterPay === 'paid' && (rem > 0 || d.delivery_type === 'مجانى')) return false;
      if (filterPay === 'remaining' && rem <= 0) return false;
      if (filterPay === 'free' && d.delivery_type !== 'مجانى') return false;
    }
    return true;
  });

  const getExportData = useCallback(() => {
    return filtered.map((d, i) => {
      const st = getStudent(d.student_id);
      const rem = Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)));
      return {
        '#': i + 1,
        'الطالب': d.student_name,
        'المجموعة': st?.group_name || '—',
        'الصف': st?.grade || '—',
        'الكتاب': d.book_title,
        'النوع': d.delivery_type || 'بيع',
        'السعر': Number(d.price_per_unit).toFixed(2),
        'المدفوع': Number(d.paid_amount || 0).toFixed(2),
        'المتبقي': rem > 0 ? rem.toFixed(2) : (d.delivery_type === 'مجانى' ? 'مجانى' : 'تم'),
        'التاريخ': d.delivery_date?.slice(0, 10) || '',
      };
    });
  }, [filtered, students]);

  const handleExport = useCallback(() => {
    try {
      import('xlsx').then(XLSX => {
        const ws = XLSX.utils.json_to_sheet(getExportData());
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, 'قائمة_التسليمات.xlsx');
      });
    } catch {}
  }, [getExportData]);

  const handlePrint = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = getExportData();
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>قائمة التسليمات</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:Tahoma,Arial,sans-serif;}
        body{padding:20px;color:#333;font-size:12px;}
        h2{text-align:center;margin-bottom:15px;color:#c0392b;}
        table{width:100%;border-collapse:collapse;}
        th{background:#c0392b;color:#fff;padding:7px 5px;font-size:11px;text-align:center;}
        td{padding:5px;text-align:center;border-bottom:1px solid #eee;font-size:11px;}
        tr:nth-child(even){background:#f9f9f9;}
        .footer{text-align:center;margin-top:15px;padding-top:10px;border-top:1px solid #ddd;color:#999;font-size:10px;}
      </style></head><body>
      <h2>قائمة التسليمات</h2>
      <table><thead><tr>${Object.keys(rows[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => `<tr>${Object.values(r).map(v => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}
      </tbody></table>
      <div class="footer">تمت الطباعة عن طريق CenterMasr | 01008667306</div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); setTimeout(() => { w.close(); window.focus(); }, 100); }, 200);
  }, [getExportData]);

  const columns = [
    {
      key: 'index', label: '#', sortable: false,
      render: (_: any, i: number) => <span className="text-gray-400">{i + 1}</span>,
    },
    { key: 'student_name', label: 'الطالب', render: (d: any) => <span className="font-semibold text-gray-800">{d.student_name}</span> },
    {
      key: 'group_name', label: 'المجموعة', sortable: true,
      render: (d: any) => <span className="text-gray-600">{getStudent(d.student_id)?.group_name || '—'}</span>,
    },
    {
      key: 'grade', label: 'الصف', sortable: true,
      render: (d: any) => <span className="text-gray-600">{getStudent(d.student_id)?.grade || '—'}</span>,
    },
    { key: 'book_title', label: 'الكتاب', render: (d: any) => <span className="text-gray-600">{d.book_title}</span> },
    {
      key: 'delivery_type', label: 'النوع', sortable: true,
      render: (d: any) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.delivery_type === 'مجانى' ? 'bg-green-100 text-green-700' : d.delivery_type === 'حجز' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{d.delivery_type || 'بيع'}</span>
      ),
    },
    {
      key: 'price_per_unit', label: 'السعر', sortable: true,
      render: (d: any) => <span>{Number(d.price_per_unit).toLocaleString()} ج</span>,
    },
    {
      key: 'paid_amount', label: 'المدفوع', sortable: true,
      render: (d: any) => <span className="text-green-600 font-semibold">{Number(d.paid_amount || 0).toLocaleString()} ج</span>,
    },
    {
      key: 'remaining', label: 'المتبقي', sortable: false,
      render: (d: any) => {
        const rem = Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)));
        if (rem > 0) return <button onClick={() => { setPayDelivery(d); setPayAmount(0); }} className="text-red-500 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full transition-colors cursor-pointer font-semibold">باقي {rem.toLocaleString()} ج</button>;
        if (d.delivery_type === 'مجانى') return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">مجانى</span>;
        return <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">تم الدفع بالكامل ✓</span>;
      },
    },
    {
      key: 'delivery_date', label: 'التاريخ', sortable: true,
      render: (d: any) => <span className="text-gray-500 text-xs">{d.delivery_date?.slice(0, 10) || ''} {formatTime()}</span>,
    },
    {
      key: 'actions', label: 'خيارات', sortable: false,
      render: (d: any) => (
        <div className="flex items-center gap-1 justify-center">
          <button onClick={() => openEditForm(d)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="تعديل"><Edit2 size={14} /></button>
          <button onClick={() => removeDelivery(d)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="حذف"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <BookOpen size={20} className="text-teal-500" /> تسليم كتاب
        </h2>
      </div>

      <ListTemplate
        title=""
        data={filtered}
        columns={columns}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالطالب أو الكتاب..."
        loading={loading}
        emptyMessage="لا توجد تسليمات"
        emptyIcon={<BookOpen size={40} className="mx-auto text-gray-300" />}
        keyExtractor={(d: any) => d.id}
        onAdd={openAddForm}
        onExport={handleExport}
        onPrint={handlePrint}
        onRefresh={load}
        extraButtons={[
          {
            label: filterGrade || 'عرض الصف',
            icon: <Filter size={16} />,
            color: filterGrade ? 'bg-purple-500' : 'bg-purple-400',
            hoverColor: 'hover:bg-purple-600',
            dropdownItems: [
              { label: 'الكل', onClick: () => setFilterGrade('') },
              ...allGrades.map(g => ({ label: g, onClick: () => setFilterGrade(g) })),
            ],
          },
          {
            label: filterBook || 'عرض الكتاب',
            icon: <BookOpen size={16} />,
            color: filterBook ? 'bg-orange-500' : 'bg-orange-400',
            hoverColor: 'hover:bg-orange-600',
            dropdownItems: [
              { label: 'الكل', onClick: () => setFilterBook('') },
              ...allBookTitles.map(b => ({ label: b, onClick: () => setFilterBook(b) })),
            ],
          },
          {
            label: filterPay || 'حالة الدفع',
            icon: <CheckCircle size={16} />,
            color: filterPay ? 'bg-teal-500' : 'bg-teal-400',
            hoverColor: 'hover:bg-teal-600',
            dropdownItems: [
              { label: 'الكل', onClick: () => setFilterPay('') },
              ...payStatuses.map(p => ({ label: p.label, onClick: () => setFilterPay(p.value) })),
            ],
          },
        ]}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!saving) resetForm(); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">{editingDelivery ? 'تعديل تسليم' : 'تسليم كتاب'}</h3>
              <button onClick={resetForm} disabled={saving}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">مسح الباركود</label>
                <input ref={barcodeRef} value={barcodeInput} onChange={e => handleBarcodeScan(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && studentId && bookTitle) { e.preventDefault(); save(); } else if (e.key === 'Enter' && studentId) { document.querySelector<HTMLSelectElement>('#book-select-delivery')?.focus(); } }}
                  placeholder="امسح باركود الطالب..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 direction-ltr text-left font-mono" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المجموعة</label>
                <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setStudentId(''); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">كل المجموعات</option>
                  {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الطالب</label>
                <select ref={studentRef} value={studentId} onChange={e => setStudentId(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && studentId && bookTitle) { e.preventDefault(); save(); } }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">اختر الطالب</option>
                  {filteredStudents.map(s => <option key={s.id} value={s.id}>{s.name} — {s.group_name}{Number(s.balance) > 0 ? ` (مديون: ${Number(s.balance).toFixed(2)})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">الكتاب</label>
                <div className="flex gap-2 items-start">
                  <select id="book-select-delivery" value={bookTitle} onChange={e => handleBookSelect(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && studentId && bookTitle) { e.preventDefault(); save(); } }}
                    onBlur={() => { if (studentId && bookTitle) { const paidField = document.querySelector<HTMLInputElement>('#paid-amount-delivery'); paidField?.focus(); } }}


                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                    <option value="">اختر الكتاب</option>
                    {books.map(b => <option key={b.title} value={b.title}>{b.title} — {Number(b.selling_price || b.price || 0).toLocaleString()} ج</option>)}
                  </select>
                  {bookTitle && (() => {
                    const b = books.find(x => x.title === bookTitle);
                    return b ? <span className="shrink-0 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold whitespace-nowrap">المتوفر: {Number(b.stock || 0)}</span> : null;
                  })()}
                </div>
                {bookTitle && (() => {
                  const b = books.find(x => x.title === bookTitle);
                  if (!b || Number(b.stock) <= 0) return <p className="text-xs text-red-500 mt-1">غير متوفر في المخزون</p>;
                  return null;
                })()}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">نوع التسليم</label>
                <div className="grid grid-cols-3 gap-2">
                  {['بيع', 'حجز', 'مجانى'].map(t => (
                    <button key={t} onClick={() => { setDeliveryType(t); if (t === 'مجانى') { setPricePerUnit(0); setPaidAmount(0); } }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${deliveryType === t ? (t === 'بيع' ? 'bg-blue-500 text-white border-blue-500' : t === 'حجز' ? 'bg-amber-500 text-white border-amber-500' : 'bg-green-500 text-white border-green-500') : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">سعر البيع</label>
                  <input type="number" value={pricePerUnit || ''} onChange={e => setPricePerUnit(+e.target.value)}
                    disabled={deliveryType === 'مجانى'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">المدفوع</label>
                  <input id="paid-amount-delivery" type="number" value={paidAmount || ''} onChange={e => setPaidAmount(Math.min(+e.target.value, pricePerUnit))}
                    disabled={deliveryType === 'مجانى'}
                    onKeyDown={e => { if (e.key === 'Enter' && studentId && bookTitle) { e.preventDefault(); save(); } }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100" />
                </div>
              </div>
              <div className="bg-teal-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-teal-600">الإجمالي:</span>
                  <span className="font-bold text-teal-700">{pricePerUnit.toLocaleString()} ج</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-600">المدفوع:</span>
                  <span className="font-bold text-green-600">{paidAmount.toLocaleString()} ج</span>
                </div>
                {remaining > 0 && <div className="flex justify-between pt-1 border-t border-teal-200">
                  <span className="text-red-600">المتبقي (يترحل على الطالب):</span>
                  <span className="font-bold text-red-600">{remaining.toLocaleString()} ج</span>
                </div>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">التاريخ</label>
                <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ملحوظات</label>
                <input value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={resetForm} disabled={saving} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 rounded-lg bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50 flex items-center gap-2">
                {saving ? 'جاري...' : <><CheckCircle size={16} /> {editingDelivery ? 'حفظ' : 'تسليم'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {payDelivery && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!paySaving) setPayDelivery(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">دفع عن كتاب</h3>
              <button onClick={() => setPayDelivery(null)} disabled={paySaving}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600">الطالب: <span className="font-semibold">{payDelivery.student_name}</span></p>
              <p className="text-sm text-gray-600">الكتاب: <span className="font-semibold">{payDelivery.book_title}</span></p>
              <p className="text-xs text-gray-400">المتبقي: <span className="font-bold text-red-500">{payDelivery.remaining || (Number(payDelivery.total_price || 0) - Number(payDelivery.paid_amount || 0))} ج</span></p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المبلغ</label>
                <input type="number" value={payAmount || ''} onChange={e => setPayAmount(+e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setPayDelivery(null)} disabled={paySaving} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={payBook} disabled={!payAmount || payAmount <= 0 || paySaving}
                className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50">تسديد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
