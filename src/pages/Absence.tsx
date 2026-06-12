import { useState, useEffect, useRef } from 'react';
import { UserX, Search, Calendar, X, Check, Eye, FileText, Lock, MessageSquare, Users, RefreshCw, ChevronDown, CheckSquare } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import PaymentModal from '../components/PaymentModal';

export default function Absence({ onViewStudent }: { onViewStudent?: (id: string) => void }) {
  const { show, confirm } = useToast();
  const codeRef = useRef<HTMLInputElement>(null);
  const today = new Date().toLocaleDateString('en-CA');
  const toDMY = (d: string) => d ? d.split('-').reverse().join('/') : '';
  const fromDMY = (s: string) => {
    const p = s.split('/');
    return p.length === 3 ? `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}` : today;
  };
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [todayAbsences, setTodayAbsences] = useState<Map<string, any>>(new Map());
  const [prevAbsences, setPrevAbsences] = useState<Set<string>>(new Set());
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [totalDebtByStudent, setTotalDebtByStudent] = useState<Record<string, number>>({});
  const [codeFilter, setCodeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [dateFromText, setDateFromText] = useState(toDMY(today));
  const [dateToText, setDateToText] = useState(toDMY(today));
  const [nameSearch, setNameSearch] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [noteModal, setNoteModal] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [sort, setSort] = useState<{ col: string; asc: boolean }>({ col: '', asc: true });
  const [payModal, setPayModal] = useState<any>(null);
  const [bookDebtByStudent, setBookDebtByStudent] = useState<Record<string, number>>({});
  const [bookDeliveries, setBookDeliveries] = useState<any[]>([]);
  const [bookPayModal, setBookPayModal] = useState<any>(null);
  const [bkPayAmt, setBkPayAmt] = useState(0);
  const [bkPaySaving, setBkPaySaving] = useState(false);
  const [lastSessionAbsences, setLastSessionAbsences] = useState<Set<string> | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setShowGroupDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async (from?: string, to?: string) => {
    const f = from || dateFrom;
    const t = to || dateTo;
    setLoading(true);
    setLastSessionAbsences(null);
    try {
      const { data: grpRows } = await supabase.from('groups').select('name').order('name');
      const dedup = new Set<string>();
      setAllGroups((grpRows || []).filter(g => { if (dedup.has(g.name)) return false; dedup.add(g.name); return true; }).map((g: any) => g.name));

      const { data: stds } = await supabase.from('students').select('*').eq('status', 'active').order('name');
      setStudents(stds || []);

      const { data: allRows } = await supabase.from('absence_records').select('*').order('date', { ascending: false });
      const norm = (d: string) => d ? new Date(d).toLocaleDateString('en-CA') : '';
      const inRange = (allRows || []).filter((r: any) => {
        const d = norm(r.date);
        return d >= f && d <= t;
      });
      const absMap = new Map();
      for (const a of inRange) absMap.set(a.student_code, a);
      setTodayAbsences(absMap);

      const allAbs = (allRows || []).filter((r: any) => norm(r.date) < today);
      const prevSet = new Set<string>();
      const seen = new Set<string>();
      for (const a of allAbs || []) {
        if (!seen.has(a.student_code)) { prevSet.add(a.student_code); seen.add(a.student_code); }
      }
      setPrevAbsences(prevSet);

      const { data: notes } = await supabase.from('attendance_notes').select('*').order('date', { ascending: false });
      const noteMap: Record<string, string> = {};
      const noteSeen = new Set<string>();
      for (const n of notes || []) {
        if (!noteSeen.has(n.student_id)) { noteMap[n.student_id] = n.note; noteSeen.add(n.student_id); }
      }
      setStudentNotes(noteMap);

      const { data: bdRows } = await supabase.from('book_deliveries').select('*');
      setBookDeliveries(bdRows || []);
      const bookDebt: Record<string, number> = {};
      for (const bd of bdRows || []) {
        const rem = Number(bd.remaining || (Number(bd.total_price || 0) - Number(bd.paid_amount || 0)));
        if (rem > 0) bookDebt[bd.student_id] = (bookDebt[bd.student_id] || 0) + rem;
      }
      setBookDebtByStudent(bookDebt);

      const { data: payRows } = await supabase.from('payments').select('*');

      // Total outstanding: process payments chronologically, pay oldest debt first
      const now = new Date();
      const sortedPayments = (payRows || []).filter(p => p.date).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const totalDebt: Record<string, number> = {};
      for (const s of stds || []) {
        if (!s.join_date || !s.monthly_fee) continue;
        const jd = new Date(s.join_date);
        // Build month list from join_date to now
        const months: { key: string; remaining: number }[] = [];
        let yy = jd.getFullYear(), mm = jd.getMonth();
        while (yy < now.getFullYear() || (yy === now.getFullYear() && mm <= now.getMonth())) {
          months.push({ key: `${yy}-${String(mm + 1).padStart(2, '0')}`, remaining: Number(s.monthly_fee) });
          mm++; if (mm > 11) { mm = 0; yy++; }
        }
        // Apply each payment to oldest remaining debt first
        for (const p of sortedPayments) {
          if (p.student_id !== s.id) continue;
          let amt = Number(p.amount);
          for (const mo of months) {
            if (amt <= 0) break;
            if (mo.remaining > 0) {
              const payNow = Math.min(amt, mo.remaining);
              mo.remaining -= payNow;
              amt -= payNow;
            }
          }
        }
        totalDebt[s.id] = months.reduce((sum, mo) => sum + mo.remaining, 0);
      }
      setTotalDebtByStudent(totalDebt);
    } catch (e: any) { console.error('Absence load error:', e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { codeRef.current?.focus(); }, []);

  const filtered = students.filter(s => {
    if (selectedGroups.length && !selectedGroups.includes(s.group_name)) return false;
    if (codeFilter && !s.code.includes(codeFilter)) return false;
    return true;
  });

  const absentCount = lastSessionAbsences ? lastSessionAbsences.size : filtered.filter(s => !todayAbsences.has(s.code)).length;
  const presentCount = filtered.length - absentCount;
  const notArrived = absentCount;

  const getSortVal = (s: any, col: string): number | string => {
    if (col === 'feeStatus') return totalDebtByStudent[s.id] || 0;
    if (col === 'bookStatus') return bookDebtByStudent[s.id] || 0;
    return (s as any)[col] || '';
  };

  const handleSort = (col: string) => {
    setSort(s => ({ col, asc: s.col === col ? !s.asc : true }));
  };

  const sortArrow = (col: string) => sort.col === col ? (sort.asc ? ' ↑' : ' ↓') : '';

  const sorted = [...filtered].filter(s => lastSessionAbsences ? !lastSessionAbsences.has(s.code) : todayAbsences.has(s.code)).sort((a, b) => {
    if (!sort.col) return 0;
    const va = getSortVal(a, sort.col);
    const vb = getSortVal(b, sort.col);
    const c = typeof va === 'number' ? va - (typeof vb === 'number' ? vb : 0) : String(va).localeCompare(String(vb));
    return sort.asc ? c : -c;
  });

  const toggleAbsence = async (student: any) => {
    const hasRecord = todayAbsences.has(student.code);
    if (hasRecord) {
      const rec = todayAbsences.get(student.code);
      await supabase.from('absence_records').delete().eq('id', rec.id);
      todayAbsences.delete(student.code);
      setTodayAbsences(new Map(todayAbsences));
      if (lastSessionAbsences) {
        const c = new Set(lastSessionAbsences);
        c.delete(student.code);
        setLastSessionAbsences(c);
      }
    } else {
      const { data } = await supabase.from('absence_records').insert({
        student_id: student.id, student_name: student.name, student_code: student.code,
        group_name: student.group_name || '', grade: student.grade, date: today, reason: '',
      }).select().single();
      if (data) {
        todayAbsences.set(student.code, data);
        setTodayAbsences(new Map(todayAbsences));
        if (lastSessionAbsences) {
          const c = new Set(lastSessionAbsences);
          c.add(student.code);
          setLastSessionAbsences(c);
        }
      }
    }
    if (codeFilter) { setCodeFilter(''); codeRef.current?.focus(); }
  };

  const handleCodeScan = async (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !codeFilter.trim()) return;
    const s = students.find(st => st.code === codeFilter.trim());
    if (!s) { show('لم يتم العثور على طالب بهذا الكود', 'error'); setCodeFilter(''); codeRef.current?.focus(); return; }
    if (selectedGroups.length && !selectedGroups.includes(s.group_name)) {
      setSelectedGroups([]);
      show(`هذا الطالب من "${s.group_name}" — تم إلغاء تصفية المجموعات`);
    }
    const rec = todayAbsences.get(s.code);
    if (rec) {
      show(`${s.name} مسجل كحاضر بالفعل`);
    } else {
      const { data } = await supabase.from('absence_records').insert({
        student_id: s.id, student_name: s.name, student_code: s.code,
        group_name: s.group_name || '', grade: s.grade, date: today, reason: '',
      }).select().single();
      if (data) {
        todayAbsences.set(s.code, data);
        setTodayAbsences(new Map(todayAbsences));
      }
      show(`تم تسجيل حضور ${s.name}`);
    }
    setCodeFilter('');
    codeRef.current?.focus();
  };

  const markPresentByName = async (student: any) => {
    if (selectedGroups.length && !selectedGroups.includes(student.group_name)) {
      setSelectedGroups([]);
      show(`هذا الطالب من "${student.group_name}" — تم إلغاء تصفية المجموعات`);
    }
    if (!todayAbsences.has(student.code)) {
      const { data } = await supabase.from('absence_records').insert({
        student_id: student.id, student_name: student.name, student_code: student.code,
        group_name: student.group_name || '', grade: student.grade, date: today, reason: '',
      }).select().single();
      if (data) {
        todayAbsences.set(student.code, data);
        setTodayAbsences(new Map(todayAbsences));
      }
    }
    setNameSearch('');
    show(`تم تسجيل حضور ${student.name}`);
  };

  const saveNote = async () => {
    if (!noteModal || !noteText.trim()) return;
    await supabase.from('attendance_notes').insert({
      student_id: noteModal.id,
      student_name: noteModal.name,
      note: noteText,
      date: today,
    });
    setStudentNotes(prev => ({ ...prev, [noteModal.id]: noteText }));
    show('تم إضافة الملحوظة');
    setNoteModal(null);
    setNoteText('');
  };

  const clearNote = async (studentId: string) => {
    await supabase.from('attendance_notes').delete().eq('student_id', studentId);
    setStudentNotes(prev => { const c = { ...prev }; delete c[studentId]; return c; });
  };

  const openPayModal = (student: any) => {
    setPayModal(student);
  };

  const [sessionCloseModal, setSessionCloseModal] = useState(false);
  const [selectedAbsent, setSelectedAbsent] = useState<Set<string>>(new Set());
  const [examModal, setExamModal] = useState(false);
  const [examMode, setExamMode] = useState<'view' | 'enter'>('view');
  const [examsList, setExamsList] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [examResults, setExamResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [scoreGroup, setScoreGroup] = useState('');
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [savingScores, setSavingScores] = useState(false);

  const closeSession = async () => {
    openSessionClose();
  };

  const doCloseSession = async (mode: 'keepOnly' | 'fullSync') => {
    const toRecord = sessionStudents.filter(s => selectedAbsent.has(s.code) && !todayAbsences.has(s.code));
    for (const s of toRecord) {
      const { data: ins } = await supabase.from('absence_records').insert({
        student_id: s.id, student_name: s.name, student_code: s.code,
        group_name: s.group_name || '', grade: s.grade, date: today, reason: '',
      }).select('id').single();
      if (ins && mode === 'fullSync') todayAbsences.set(s.code, ins);
    }
    if (mode === 'fullSync') {
      const toClear = sessionStudents.filter(s => !selectedAbsent.has(s.code) && todayAbsences.has(s.code));
      for (const s of toClear) {
        const rec = todayAbsences.get(s.code);
        if (rec?.id) await supabase.from('absence_records').delete().eq('id', rec.id);
        todayAbsences.delete(s.code);
      }
      setTodayAbsences(new Map(todayAbsences));
      setLastSessionAbsences(new Set(sessionStudents.filter(s => selectedAbsent.has(s.code)).map(s => s.code)));
      const absentTotal = sessionStudents.filter(s => selectedAbsent.has(s.code)).length;
      show(`تم إغلاق الحصة - ${absentTotal} غياب / ${sessionStudents.length - absentTotal} حضور من أصل ${sessionStudents.length} طالب`);
    }
    setSessionCloseModal(false);
    setSelectedAbsent(new Set());
  };

  const nameMatches = !nameSearch.trim() ? [] : students.filter(s =>
    s.name.includes(nameSearch) && (selectedGroups.length === 0 || selectedGroups.includes(s.group_name))
  ).slice(0, 8);

  const sessionStudents = selectedGroups.length > 0
    ? students.filter(s => selectedGroups.includes(s.group_name))
    : students;
  const absentStudents = sessionStudents.filter(s => todayAbsences.has(s.code));

  const openSessionClose = () => {
    setSelectedAbsent(new Set());
    setSessionCloseModal(true);
  };

  return (
    <div className="fade-in space-y-4">
      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setNoteModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">ملحوظة للطالب {noteModal.name}</h3>
              <button onClick={() => setNoteModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="اكتب الملحوظة..." />
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setNoteModal(null)} className="px-4 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button onClick={saveNote} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600">حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && <PaymentModal key={payModal.id} student={payModal} onClose={() => setPayModal(null)} onDone={() => load()} alreadyPaid={totalDebtByStudent[payModal.id] || 0} />}

      {/* Book Payment Modal */}
      {bookPayModal && (() => {
        const bds = bookDeliveries.filter(d => d.student_id === bookPayModal.id && Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0))) > 0);
        const totalBookRem = bds.reduce((s, d) => s + Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0))), 0);
        return <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { if (!bkPaySaving) setBookPayModal(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-800">تسديد كتب — {bookPayModal.name}</h3>
              <button onClick={() => setBookPayModal(null)} disabled={bkPaySaving}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {bds.map(d => <div key={d.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-600">{d.book_title}</span>
                <span className="font-bold text-red-500">{Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)))} ج</span>
              </div>)}
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span className="text-gray-700">الإجمالي:</span>
                <span className="text-red-600">{totalBookRem} ج</span>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">المبلغ</label>
                <input type="number" value={bkPayAmt || ''} onChange={e => setBkPayAmt(+e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <div className="flex gap-3 justify-end p-5 border-t">
              <button onClick={() => setBookPayModal(null)} disabled={bkPaySaving} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
              <button disabled={!bkPayAmt || bkPayAmt <= 0 || bkPaySaving} onClick={async () => {
                setBkPaySaving(true);
                try {
                  let remainingAmt = bkPayAmt;
                  for (const d of bds) {
                    if (remainingAmt <= 0) break;
                    const dRem = Number(d.remaining || (Number(d.total_price || 0) - Number(d.paid_amount || 0)));
                    const payNow = Math.min(remainingAmt, dRem);
                    const newPaid = Number(d.paid_amount || 0) + payNow;
                    const newRemaining = Math.max(0, Number(d.total_price || 0) - newPaid);
                    await supabase.from('book_deliveries').update({ paid_amount: newPaid, remaining: newRemaining }).eq('id', d.id);
                    await supabase.from('book_delivery_payments').insert({
                      delivery_id: d.id, student_id: bookPayModal.id, amount: payNow,
                      date: new Date().toISOString().slice(0, 10), notes: `دفعة عن ${d.book_title}`,
                    });
                    remainingAmt -= payNow;
                  }
                  show(`تم دفع ${bkPayAmt} ج عن الكتب`);
                  setBookPayModal(null); load();
                } catch { show('حدث خطأ', 'error'); }
                setBkPaySaving(false);
              }} className="px-5 py-2 rounded-lg bg-green-500 text-white text-sm font-semibold hover:bg-green-600 disabled:opacity-50">
                {bkPaySaving ? 'جاري...' : 'تسديد'}
              </button>
            </div>
          </div>
        </div>;
      })()}

      {/* Exam Scores Modal */}
      {examModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setExamModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800">درجات الاختبار</h3>
              <button onClick={() => setExamModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            {/* Mode toggle */}
            <div className="flex border-b">
              <button onClick={() => setExamMode('view')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${examMode === 'view' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>عرض النتائج</button>
              <button onClick={() => { setExamMode('enter'); setScoreGroup(''); setScoreInputs({}); }}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${examMode === 'enter' ? 'text-orange-600 border-b-2 border-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>إدخال الدرجات</button>
            </div>

            {/* Exam selector (common) */}
            <div className="p-4 border-b flex items-center gap-3">
              <select value={selectedExamId} onChange={e => { setSelectedExamId(e.target.value); setExamResults([]); setScoreInputs({}); }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">اختر الاختبار</option>
                {examsList.map(ex => <option key={ex.id} value={ex.id}>{ex.title} — {ex.subject}</option>)}
              </select>
              <button onClick={() => {
                if (!selectedExamId) return;
                setLoadingResults(true);
                const exam = examsList.find(ex => ex.id === selectedExamId);
                supabase.from('exam_results').select('*').eq('exam_title', exam?.title || '').then(({ data }) => {
                  setExamResults(data || []);
                  setLoadingResults(false);
                }).catch(() => setLoadingResults(false));
              }} disabled={!selectedExamId}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 whitespace-nowrap">تحميل</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!selectedExamId && <div className="text-center text-gray-300 py-12">اختر الاختبار أولاً</div>}

              {selectedExamId && examMode === 'view' && (
                <>
                  {loadingResults && <div className="text-center text-gray-400 py-12">جاري التحميل...</div>}
                  {!loadingResults && !examResults.length && (
                    <div className="text-center text-gray-400 py-12">لا توجد نتائج لهذا الاختبار</div>
                  )}
                  {!loadingResults && examResults.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                          <th className="text-right py-2 px-2">#</th>
                          <th className="text-right py-2 px-2">الطالب</th>
                          <th className="text-center py-2 px-2">الدرجة</th>
                          <th className="text-center py-2 px-2">الدرجة الكلية</th>
                          <th className="text-center py-2 px-2">النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => {
                          const r = examResults.find(er => er.student_id === s.id);
                          const pct = r && r.max_score > 0 ? Math.round((Number(r.score) / Number(r.max_score)) * 100) : 0;
                          return (
                            <tr key={s.id} className="border-b border-gray-50">
                              <td className="text-right py-2 px-2 text-gray-400">{i + 1}</td>
                              <td className="py-2 px-2 font-semibold text-gray-800">{s.name}</td>
                              <td className="text-center py-2 px-2">{r ? r.score : '—'}</td>
                              <td className="text-center py-2 px-2">{r ? r.max_score : '—'}</td>
                              <td className="text-center py-2 px-2">
                                {r ? (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 75 ? 'text-green-600 bg-green-50' : pct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'}`}>
                                    {pct}%
                                  </span>
                                ) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {selectedExamId && examMode === 'enter' && (
                <div className="space-y-3">
                  {/* Group selector */}
                  <div className="flex items-center gap-3">
                    <select value={scoreGroup} onChange={e => { setScoreGroup(e.target.value); setScoreInputs({}); }}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <option value="">كل المجموعات</option>
                      {allGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <span className="text-xs text-gray-400">
                      {(() => {
                        const filtered = students.filter(s => !scoreGroup || s.group_name === scoreGroup);
                        return `عرض ${filtered.length} طالب`;
                      })()}
                    </span>
                  </div>

                  {/* Students table with inputs */}
                  <div className="max-h-80 overflow-y-auto border rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="text-gray-500 text-xs border-b">
                          <th className="text-right py-2 px-2">#</th>
                          <th className="text-right py-2 px-2">الطالب</th>
                          <th className="text-right py-2 px-2">المجموعة</th>
                          <th className="text-center py-2 px-2 w-28">الدرجة (من {(() => { const ex = examsList.find(e => e.id === selectedExamId); return ex ? ex.max_score : '…'; })()})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.filter(s => !scoreGroup || s.group_name === scoreGroup).map((s, i) => {
                          const existing = examResults.find(er => er.student_id === s.id);
                          const val = scoreInputs[s.id] ?? (existing ? String(existing.score) : '');
                          return (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="text-right py-2 px-2 text-gray-400">{i + 1}</td>
                              <td className="py-2 px-2 font-semibold text-gray-800">{s.name}</td>
                              <td className="py-2 px-2 text-gray-500 text-xs">{s.group_name}</td>
                              <td className="text-center py-2 px-2">
                                <input type="text" inputMode="numeric" value={val} onChange={e => setScoreInputs(prev => ({ ...prev, [s.id]: e.target.value.replace(/[^0-9.]/g, '') }))}
                                  placeholder="—"
                                  className="w-20 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save */}
                  <div className="flex justify-end">
                    <button onClick={async () => {
                      const exam = examsList.find(e => e.id === selectedExamId);
                      if (!exam) return;
                      setSavingScores(true);
                      const entries = Object.entries(scoreInputs).filter(([_, v]) => v.trim() !== '');
                      const now = new Date().toISOString();
                      try {
                        for (const [studentId, scoreStr] of entries) {
                          const student = students.find(s => s.id === studentId);
                          const existing = examResults.find(er => er.student_id === studentId);
                          const row = { student_id: studentId, student_name: student?.name || '', exam_title: exam.title, subject: exam.subject, date: exam.date, score: Number(scoreStr), max_score: exam.max_score };
                          if (existing) {
                            await supabase.from('exam_results').update(row).eq('id', existing.id);
                          } else {
                            await supabase.from('exam_results').insert(row);
                          }
                        }
                        show('تم حفظ الدرجات بنجاح', 'success');
                        // Reload results
                        const { data } = await supabase.from('exam_results').select('*').eq('exam_title', exam.title);
                        setExamResults(data || []);
                        setScoreInputs({});
                      } catch { show('حدث خطأ أثناء الحفظ', 'error'); }
                      setSavingScores(false);
                    }} disabled={savingScores || !Object.values(scoreInputs).some(v => v.trim())}
                      className="px-6 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50">
                      {savingScores ? 'جاري الحفظ...' : 'حفظ الدرجات'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Close Modal */}
      {sessionCloseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSessionCloseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800">إغلاق الحصة</h3>
              <button onClick={() => setSessionCloseModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 cursor-pointer text-sm font-semibold text-gray-700">
                <input type="checkbox" checked={selectedAbsent.size === sessionStudents.length} onChange={() => {
                  setSelectedAbsent(prev => prev.size === sessionStudents.length ? new Set() : new Set(sessionStudents.map(s => s.code)));
                }} className="w-4 h-4 accent-orange-500" />
                <CheckSquare size={15} className="text-gray-400" />
                تحديد الكل ({sessionStudents.length})
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[...sessionStudents].sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(s => {
                  const isAbsent = selectedAbsent.has(s.code);
                  return (
                      <label key={s.code} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm ${isAbsent ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={isAbsent} onChange={() => {
                          setSelectedAbsent(prev => {
                            const c = new Set(prev);
                            c.has(s.code) ? c.delete(s.code) : c.add(s.code);
                            return c;
                          });
                        }} className="w-3.5 h-3.5 accent-orange-500 shrink-0" />
                      <span className={`truncate ${isAbsent ? 'text-red-700 font-semibold' : 'text-gray-800'}`}>{s.name}</span>
                    </label>
                  );
                })}
              </div>
              {!sessionStudents.length && <p className="text-center text-gray-400 text-sm py-8">لا يوجد طلاب في هذه المجموعة</p>}
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button onClick={() => setSessionCloseModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">رجوع</button>
              <button onClick={() => doCloseSession('keepOnly')}
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors">تغييب المحدد</button>
              <button onClick={() => doCloseSession('fullSync')}
                className="flex-1 px-4 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">تغييب المحدد وتحضير الباقى</button>
            </div>
          </div>
        </div>
      )}

      {/* Ribbon */}
      <div className="bg-gradient-to-l from-orange-500 to-amber-500 rounded-2xl px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-bold">
            <UserX size={20} />
            <span>غائب: {absentCount}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 font-semibold">
            <Check size={18} />
            <span>حاضر: {presentCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/90 text-sm">
          <Users size={18} />
          <span>{filtered.length} طالب{filtered.length !== 1 ? '' : ''} {selectedGroups.length ? `في ${selectedGroups.length} مجموعة` : ''}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex items-center flex-wrap gap-3">
          {/* Code input */}
          <div className="relative">
            <Search size={14} className="absolute right-2.5 top-2.5 text-gray-400" />
            <input ref={codeRef} type="text" inputMode="numeric" value={codeFilter} onChange={e => setCodeFilter(e.target.value.replace(/\D/g, '').slice(0, 4))} onKeyDown={handleCodeScan}
              placeholder="كود الطالب (باركود)"
              className="w-40 border border-gray-200 rounded-lg pr-8 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono" />
          </div>

          {/* Group multi-select */}
          <div className="relative" ref={groupRef}>
            <button onClick={() => setShowGroupDropdown(o => !o)}
              className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-orange-300 transition-colors whitespace-nowrap">
              <Users size={15} />
              <span>{selectedGroups.length ? `${selectedGroups.length} مجموعة` : 'كل المجموعات'}</span>
              <ChevronDown size={14} />
            </button>
            {showGroupDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-48 max-h-60 overflow-y-auto">
                <label className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 border-b cursor-pointer">
                  <input type="checkbox" checked={selectedGroups.length === 0} onChange={() => setSelectedGroups([])}
                    className="accent-orange-500" />
                  الكل
                </label>
                {allGroups.map((g, idx) => (
                  <label key={g + idx} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedGroups.includes(g)} onChange={() => setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                      className="accent-orange-500" />
                    {g}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date from */}
          <div className="flex items-center gap-1">
            <Calendar size={14} className="text-gray-400" />
            <input type="text" value={dateFromText} onChange={e => setDateFromText(e.target.value.replace(/[^0-9/]/g, '').slice(0, 10))} onBlur={() => setDateFrom(fromDMY(dateFromText))}
              placeholder="يوم/شهر/سنة"
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-32 text-center" />
          </div>

          {/* Date to */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">إلى</span>
            <input type="text" value={dateToText} onChange={e => setDateToText(e.target.value.replace(/[^0-9/]/g, '').slice(0, 10))} onBlur={() => setDateTo(fromDMY(dateToText))}
              placeholder="يوم/شهر/سنة"
              className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-32 text-center" />
          </div>

          {/* Name attendance */}
          <div className="relative flex-1 min-w-[120px]">
            <input type="text" value={nameSearch} onChange={e => { setNameSearch(e.target.value); }} placeholder="حضور بالاسم..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            {nameMatches.length > 0 && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-48 max-h-48 overflow-y-auto">
                {nameMatches.map(s => (
                  <button key={s.id} onClick={() => markPresentByName(s)}
                    className="flex items-center gap-2 w-full text-right px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors">
                    <Check size={14} className="text-green-500" /> {s.name} ({s.code})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Close session */}
          <button onClick={closeSession}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap">
            <Lock size={15} /> اغلاق الحصة
          </button>

          {/* View scores */}
          <button onClick={() => {
            setExamModal(true);
            setExamMode('view');
            setSelectedExamId('');
            setExamResults([]);
            setScoreInputs({});
            supabase.from('exams').select('*').order('date', { ascending: false }).then(({ data }) => setExamsList(data || [])).catch(() => {});
          }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 text-sm transition-colors whitespace-nowrap">
            <Eye size={15} /> عرض درجات الاختبار
          </button>

          <button onClick={() => load()} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <div className="text-center text-gray-400 py-20">جاري التحميل...</div> : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs border-b">
                  <th className="text-center py-3 px-2 w-10">#</th>
                  <th className="text-right py-3 px-2 cursor-pointer hover:text-orange-600 select-none" onClick={() => handleSort('name')}>اسم الطالب{sortArrow('name')}</th>
                  <th className="text-right py-3 px-2 cursor-pointer hover:text-orange-600 select-none" onClick={() => handleSort('grade')}>المرحلة{sortArrow('grade')}</th>
                  <th className="text-right py-3 px-2 cursor-pointer hover:text-orange-600 select-none" onClick={() => handleSort('group_name')}>المجموعة{sortArrow('group_name')}</th>
                  <th className="text-right py-3 px-2 max-w-32">الملاحظة الأخيرة</th>
                  <th className="text-center py-3 px-2">الحصة السابقة</th>
                  <th className="text-center py-3 px-2 cursor-pointer hover:text-orange-600 select-none" onClick={() => handleSort('feeStatus')}>المصروفات{sortArrow('feeStatus')}</th>
                  <th className="text-center py-3 px-2 cursor-pointer hover:text-orange-600 select-none" onClick={() => handleSort('bookStatus')}>الكتب{sortArrow('bookStatus')}</th>
                  <th className="text-center py-3 px-2">خيارات</th>
                </tr>
              </thead>
               <tbody>
                {sorted.map((s, i) => {
                  const fee = s.monthly_fee || 0;
                  const note = studentNotes[s.id];
                  return (
                    <tr key={s.id} className={`border-b border-gray-50 transition-colors ${todayAbsences.has(s.code) ? 'bg-green-50' : 'bg-red-50/40'}`}>
                      <td className="text-center py-3 px-2 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-700">{s.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">{s.grade}</td>
                      <td className="py-3 px-2 text-gray-600">{s.group_name || '—'}</td>
                      <td className="py-3 px-2 max-w-32">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 truncate flex-1" title={note || ''}>
                            {note || '—'}
                          </span>
                          {note && <button onClick={() => clearNote(s.id)}
                            className="shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition-colors"
                            title="تمت القراءة — مسح الملحوظة"><Check size={13} /></button>}
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        {prevAbsences.has(s.code)
                          ? <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">غائب سابق</span>
                          : <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">اليوم</span>
                        }
                      </td>
                      {(() => {
                        const feeRem = totalDebtByStudent[s.id] || 0;
                        const bookRem = bookDebtByStudent[s.id] || 0;
                        return <>
                        <td className={`text-center py-3 px-2 ${feeRem > 0 ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => { if (feeRem > 0) openPayModal(s); }}>
                          {fee <= 0
                            ? <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full font-semibold">—</span>
                            : feeRem <= 0
                            ? <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">تم ✓</span>
                            : <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">باقي {feeRem} ج</span>
                          }
                        </td>
                        <td className={`text-center py-3 px-2 ${bookRem > 0 ? 'cursor-pointer hover:opacity-80' : ''}`} onClick={() => { if (bookRem > 0) { setBookPayModal(s); setBkPayAmt(0); setBkPaySaving(false); } }}>
                          {bookRem > 0
                            ? <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">باقي {bookRem} ج</span>
                            : <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">تم ✓</span>
                          }
                        </td>
                        </>;
                      })()}
                      <td className="text-center py-3 px-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => { setNoteModal(s); setNoteText(''); }}
                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="إضافة ملحوظة">
                            <MessageSquare size={14} />
                          </button>
                          <button onClick={() => onViewStudent?.(s.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="عرض ملف الطالب">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => toggleAbsence(s)}
                            className="w-6 h-6 rounded-md flex items-center justify-center bg-green-500 text-white hover:bg-green-600 transition-colors" title="إلغاء الحضور">
                            <Check size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr><td colSpan={10} className="py-12 text-center text-gray-300 text-sm">
                    <UserX size={32} className="mx-auto mb-2" />
                    لا يوجد طلاب للعرض
                  </td></tr>)}
                {filtered.length > 0 && !lastSessionAbsences && todayAbsences.size === 0 && (
                  <tr><td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                    <span className="block text-lg mb-1">?</span>
                    لم يتم تسجيل أي طالب بعد — امسح كود طالب أو اختر بالاسم
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
