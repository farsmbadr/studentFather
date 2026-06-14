import { useState, useEffect } from 'react';
import { Printer, Users } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AbsenceSheet() {
  const [groups, setGroups] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [sheetMode, setSheetMode] = useState<'days' | 'full' | 'blank'>('days');

  useEffect(() => {
    supabase.from('groups').select('name').order('name').then(({ data }) => {
      const seen = new Set<string>();
      setGroups((data || []).map((g: any) => g.name).filter(g => { if (seen.has(g)) return false; seen.add(g); return true; }));
    });
  }, []);

  // Load data for full mode
  useEffect(() => {
    if (!selectedGroup || !month) return;
    setLoading(true);
    const [y, m] = month.split('-');
    const start = `${y}-${m}-01`;
    const endDate = new Date(Number(y), Number(m), 0);
    const end = endDate.toLocaleDateString('en-CA');

    Promise.all([
      supabase.from('students').select('id,name,code,group_name').eq('status', 'active').eq('group_name', selectedGroup).order('name'),
      supabase.from('absence_records').select('*'),
    ]).then(([std, abs]) => {
      const allAbs = (abs.data || []).filter((r: any) =>
        r.group_name === selectedGroup && (r.date || '') >= start && (r.date || '') <= end
      );
      setStudents(std.data || []);
      setAbsences(allAbs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedGroup, month]);

  // Compute month days
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthDays = Array.from({ length: lastDay }, (_, i) => i + 1);

  // Days that have absence records (for 'days' mode and session-day detection)
  const sessionDays = [...new Set(absences.filter(a => a.date).map(a => a.date.slice(0, 10)))].sort();
  const sessionDayNumbers = new Set(sessionDays.map(d => Number(d.slice(8, 10))));

  const isAbsent = (code: string, day: number) => {
    const dateStr = `${month}-${String(day).padStart(2, '0')}`;
    return absences.some(a => a.student_code === code && (a.date || '').slice(0, 10) === dateStr);
  };

  const isAbsentOnDate = (code: string | undefined, day: string) => {
    if (!code) return false;
    return absences.some(a => a.student_code === code && (a.date || '').slice(0, 10) === day);
  };

  const handlePrint = () => window.print();

  const monthName = (() => {
    const d = new Date(month + '-01');
    return isNaN(d.getTime()) ? month : d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  })();

  const EMPTY_ROWS = 25;

  return (
    <div className="fade-in space-y-4">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 3mm; font-size: 10pt; }
          @page { size: landscape; }
          table { font-size: 11pt !important; }
          th, td { padding: 1px 1px !important; }
          th, td { white-space: nowrap; }
        }
      `}</style>

      {/* Controls */}
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Printer size={20} className="text-orange-500" /> كشف غياب شهري
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={sheetMode} onChange={e => setSheetMode(e.target.value as 'days' | 'full' | 'blank')}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="days">كشف أيام التسجيل</option>
            <option value="full">كشف غياب ممتلئ</option>
            <option value="blank">كشف غياب فارغ</option>
          </select>
          <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            <option value="">اختر المجموعة</option>
            {groups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={handlePrint} disabled={!selectedGroup}
            className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2">
            <Printer size={16} /> طباعة
          </button>
        </div>
      </div>

      {!selectedGroup && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-300 text-sm">
          اختر المجموعة والشهر لعرض الكشف
        </div>
      )}

      {selectedGroup && (
        <>
          {loading && <div className="text-center text-gray-400 py-12">جاري التحميل...</div>}

          {!loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <div className="p-3" id="print-area">
                {(() => {
                  if (sheetMode === 'days') {
                    const cols = sessionDays.filter(Boolean);
                    return (
                      <table className="w-full text-xs border-collapse" dir="rtl">
                        <thead>
                          <tr className="bg-gray-100">
                             <th className="border border-gray-300 px-1 py-1.5 text-center font-bold text-gray-800 w-[28px]">#</th>
                            <th className="border border-gray-300 px-1.5 py-1.5 text-right font-bold text-gray-800 min-w-[130px]">اسم الطالب</th>
                            {cols.map(d => {
                              const dt = new Date(d);
                              const label = isNaN(dt.getTime()) ? d : dt.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' });
                              return <th key={d} className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-800">{label}</th>;
                            })}
                            <th className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-800">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s, i) => {
                            const absentDays = cols.filter(d => isAbsentOnDate(s.code, d));
                            return (
                              <tr key={s.id} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">{i + 1}</td>
                                <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold text-gray-800">{s.name}</td>
                                {cols.map(d => (
                                  <td key={d} className={`border border-gray-300 px-1.5 py-1 text-center text-sm ${isAbsentOnDate(s.code, d) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {isAbsentOnDate(s.code, d) ? '✗' : '✓'}
                                  </td>
                                ))}
                                <td className="border border-gray-300 px-1.5 py-1 text-center font-bold text-gray-700">{absentDays.length}/{cols.length}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  }

                  if (sheetMode === 'full') {
                    return (
                      <>
                        <table className="w-full text-xs border-collapse" dir="rtl">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-300 px-1 py-1.5 text-center font-bold text-gray-800 w-[28px]">#</th>
                              <th className="border border-gray-300 px-1.5 py-1.5 text-right font-bold text-gray-800 w-[90px]">اسم الطالب</th>
                              {monthDays.map(d => (
                                <th key={d} className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-800">{d}</th>
                              ))}
                              <th className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-800">الغياب</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((s, i) => {
                              const absentCount = monthDays.filter(d => sessionDayNumbers.has(d) && isAbsent(s.code, d)).length;
                              return (
                                <tr key={s.id} className="hover:bg-gray-50">
                                  <td className="border border-gray-300 px-1 py-1 text-center text-gray-500">{i + 1}</td>
                                  <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold text-gray-800">{s.name}</td>
                                  {monthDays.map(d => {
                                    if (!sessionDayNumbers.has(d)) return <td key={d} className="border border-gray-300 px-1.5 py-1 text-center">—</td>;
                                    return (
                                      <td key={d} className={`border border-gray-300 px-1.5 py-1 text-center ${isAbsent(s.code, d) ? 'bg-red-100 text-red-600 font-bold' : 'text-green-600'}`}>
                                        {isAbsent(s.code, d) ? '✗' : '✓'}
                                      </td>
                                    );
                                  })}
                                  <td className="border border-gray-300 px-1.5 py-1 text-center font-bold text-gray-700">{absentCount}</td>
                                </tr>
                              );
                            })}
                            {!students.length && (
                              <tr><td colSpan={monthDays.length + 3} className="py-12 text-center text-gray-300 text-sm">لا يوجد طلاب في هذه المجموعة</td></tr>
                            )}
                          </tbody>
                        </table>
                      </>
                    );
                  }

                  // blank mode
                  return (
                    <table className="w-full text-xs border-collapse" dir="rtl">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-1 py-1.5 text-center font-bold text-gray-800 w-[28px]">#</th>
                          <th className="border border-gray-300 px-1.5 py-1.5 text-right font-bold text-gray-800 w-[90px]">اسم الطالب</th>
                          {monthDays.map(d => (
                            <th key={d} className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-800">{d}</th>
                          ))}
                          <th className="border border-gray-300 px-1.5 py-1.5 text-center font-bold text-gray-800">الغياب</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: EMPTY_ROWS }).map((_, i) => (
                          <tr key={i}>
                            <td className="border border-gray-300 px-1 py-1 text-center text-gray-300">{i + 1}</td>
                            <td className="border border-gray-300 px-1.5 py-1 text-right">&nbsp;</td>
                            {monthDays.map(d => (
                              <td key={d} className="border border-gray-300 px-1.5 py-1 text-center">&nbsp;</td>
                            ))}
                            <td className="border border-gray-300 px-1.5 py-1 text-center">&nbsp;</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              <div className="px-4 pb-3 flex items-center justify-between text-[10px] text-gray-400 no-print">
                <span>المجموعة: {selectedGroup}</span>
                <span>{monthName}</span>
                <span>{sheetMode === 'blank' ? 'نموذج فارغ' : `${students.length} طالب`}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
