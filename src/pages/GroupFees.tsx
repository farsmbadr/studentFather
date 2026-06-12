import { useState, useEffect } from 'react';
import { DollarSign, Save, CheckCircle, RefreshCw, Users, AlertTriangle, Info, Plus, FileDown, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

export default function GroupFees() {
  const { show, confirm } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState<Record<string, boolean>>({});
  const [studentInfo, setStudentInfo] = useState<Record<string, { count: number; currentFees: number[] }>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('groups').select('*').order('name');
    setGroups(data || []);
    const { data: students } = await supabase.from('students').select('group_name, monthly_fee').eq('status', 'active');
    const info: Record<string, { count: number; currentFees: number[] }> = {};
    for (const s of students || []) {
      if (s.group_name) {
        if (!info[s.group_name]) info[s.group_name] = { count: 0, currentFees: [] };
        info[s.group_name].count++;
        if (Number(s.monthly_fee) > 0) info[s.group_name].currentFees.push(Number(s.monthly_fee));
      }
    }
    setStudentInfo(info);
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = groups.map(g => ({
        'المجموعة': g.name,
        'عدد الطلاب': studentInfo[g.name]?.count || 0,
        'المصروفات الجديدة': g.fee || 0,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, 'المصروفات.xlsx');
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const setFee = (id: string, val: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, fee: val ? parseFloat(val) : null } : g));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(groups.map(g =>
        supabase.from('groups').update({ fee: g.fee || null }).eq('id', g.id)
      ));
      show('تم حفظ المصروفات الشهرية');
    } catch { show('حدث خطأ', 'error'); }
    setSaving(false);
  };

  const applyToExisting = async (g: any) => {
    if (!g.fee) return show('حدد قيمة للمصروفات أولاً', 'error');
    const ok = await confirm(`تطبيق المصروفات (${g.fee} ج) على كل طلاب المجموعة "${g.name}"؟`);
    if (!ok) return;
    setApplying(prev => ({ ...prev, [g.id]: true }));
    try {
      const { data: students } = await supabase.from('students').select('id, group_name').eq('status', 'active');
      const groupStudents = (students || []).filter((s: any) => s.group_name === g.name);
      if (groupStudents.length > 0) {
        await Promise.all(groupStudents.map((s: any) =>
          supabase.from('students').update({ monthly_fee: Number(g.fee) }).eq('id', s.id)
        ));
        show(`تم تحديث ${groupStudents.length} طالب في مجموعة "${g.name}"`);
      } else {
        show('لا يوجد طلاب في هذه المجموعة');
      }
    } catch { show('حدث خطأ أثناء التحديث', 'error'); }
    setApplying(prev => ({ ...prev, [g.id]: false }));
  };

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <DollarSign size={24} />
          <span className="text-lg text-white/80">تحديد المصروفات الشهرية</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{groups.length} مجموعة</span>
        </div>
        <p className="text-sm text-white/70 mt-2">حدد قيمة المصروفات الشهرية لكل مجموعة — عند إضافة طالب جديد ستتعبأ تلقائياً</p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 justify-end no-print">
        <button onClick={handleExport} className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <FileDown size={16} /> تصدير إكسيل
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <Printer size={16} /> طباعة
        </button>
        <button onClick={load} className="flex items-center gap-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm px-4 py-2.5 rounded-xl font-semibold transition-colors">
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-right p-4 font-semibold text-gray-600">#</th>
                    <th className="text-right p-4 font-semibold text-gray-600">اسم المجموعة</th>
                    <th className="text-center p-4 font-semibold text-gray-600">عدد الطلاب</th>
                    <th className="text-center p-4 font-semibold text-gray-600">المصروفات الحالية للطلاب</th>
                    <th className="text-right p-4 font-semibold text-gray-600">المصروفات الجديدة (ج)</th>
                    <th className="text-center p-4 font-semibold text-gray-600">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => {
                    const info = studentInfo[g.name];
                    const current = info?.currentFees || [];
                    const minFee = current.length > 0 ? Math.min(...current) : null;
                    const maxFee = current.length > 0 ? Math.max(...current) : null;
                    const avgFee = current.length > 0 ? Math.round(current.reduce((s, v) => s + v, 0) / current.length) : null;
                    const noFeeSet = !g.fee;
                    return (
                    <tr key={g.id} className={`border-b last:border-0 hover:bg-gray-50 ${noFeeSet ? 'bg-red-50/40' : ''}`}>
                      <td className="p-4 text-gray-400 font-mono">{i + 1}</td>
                      <td className="p-4 font-semibold text-gray-800">{g.name}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <Users size={14} /> {info?.count || 0}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {current.length > 0 ? (
                          <span className="text-xs text-gray-500" title={`الأقل: ${minFee} ج - الأعلى: ${maxFee} ج`}>
                            <Info size={12} className="inline ml-1 text-gray-400" />
                            {avgFee} ج معدل
                            {minFee !== maxFee ? ` (${minFee}-${maxFee})` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={g.fee || ''}
                            onChange={e => setFee(g.id, e.target.value)}
                            placeholder={avgFee ? String(avgFee) : 'أدخل القيمة'}
                            className={`w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                              noFeeSet
                                ? 'border-red-300 focus:ring-red-400 bg-red-50'
                                : 'border-gray-200 focus:ring-emerald-400'
                            }`}
                          />
                          {noFeeSet && <AlertTriangle size={16} className="text-red-400 shrink-0" title="لم تحدد قيمة بعد" />}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => applyToExisting(g)}
                          disabled={applying[g.id] || !g.fee}
                          className={`inline-flex items-center gap-1.5 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            g.fee ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 cursor-not-allowed'
                          }`}
                          title={!g.fee ? 'حدد القيمة أولاً' : 'تطبيق على الطلاب القدام'}
                        >
                          {applying[g.id] ? <RefreshCw size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                          تطبيق على القدام
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center p-4 border-t">
              <span className="text-xs text-gray-400">* زر "تطبيق على القدام" يحدث المصروفات للطلاب الموجودين فعلاً في المجموعة</span>
              <button
                onClick={saveAll}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                {saving ? <CheckCircle size={16} className="animate-spin" /> : <Save size={16} />}
                حفظ الكل
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}