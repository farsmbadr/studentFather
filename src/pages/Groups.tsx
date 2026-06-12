import { useState, useEffect } from 'react';
import { Plus, X, Users, Edit2, Trash2, BookOpen } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';

interface Group {
  id: string;
  name: string;
  grade: string;
  schedule: string;
  fee: number;
  capacity: number;
}

function Modal({ onClose, onSave, initial, allSubjects, allGrades, groupSubjects, onSubjectToggle }: { onClose: () => void; onSave: (d: Omit<Group, 'id'>) => void; initial?: Group; allSubjects: {id:string;name:string}[]; allGrades: {id:string;name:string}[]; groupSubjects: string[]; onSubjectToggle: (id: string) => void }) {
  const [form, setForm] = useState({ name: initial?.name || '', grade: initial?.grade || '', schedule: initial?.schedule || '', fee: +(initial?.fee ?? 0), capacity: +(initial?.capacity ?? 20) });
  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800">{initial ? 'تعديل مجموعة' : 'إضافة مجموعة جديدة'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اسم المجموعة <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الصف <span className="text-red-500">*</span></label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <option value="">اختر الصف</option>
              {allGrades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الجدول (مثل: السبت - الاثنين 4م)</label>
            <input value={form.schedule} onChange={e => set('schedule', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
          {[{ label: 'الرسوم الشهرية', key: 'fee' }, { label: 'السعة', key: 'capacity' }].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              <input type="number" value={(form as any)[f.key]} onChange={e => set(f.key, e.target.value === '' ? 0 : +e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">المواد</label>
            <div className="flex flex-wrap gap-1.5">
              {allSubjects.map(sub => {
                const active = groupSubjects.includes(sub.id);
                return (
                  <button key={sub.id} onClick={() => onSubjectToggle(sub.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'}`}>
                    {active ? '✓ ' : ''}{sub.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.name.trim()}
            className="px-5 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

export default function Groups() {
  const { show, confirm } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Group | undefined>();
  const [search, setSearch] = useState('');
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [allSubjects, setAllSubjects] = useState<{id:string;name:string}[]>([]);
  const [allGrades, setAllGrades] = useState<{id:string;name:string}[]>([]);
  const [groupSubjects, setGroupSubjects] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [grpRes, studentsRes, subRes, gsRes, grdRes] = await Promise.all([
      supabase.from('groups').select('*').order('created_at', { ascending: false }),
      supabase.from('students').select('group_name').eq('status', 'active'),
      supabase.from('subjects').select('*').order('name'),
      supabase.from('group_subjects').select('*'),
      supabase.from('grades').select('*').order('name', { ascending: true }),
    ]);
    const gsMap: Record<string, string[]> = {};
    for (const gs of gsRes.data || []) {
      if (!gsMap[gs.group_id]) gsMap[gs.group_id] = [];
      gsMap[gs.group_id].push(gs.subject_id);
    }
    setGroups((grpRes.data || []).map(g => ({ ...g, _subjects: gsMap[g.id] || [] })));
    setAllSubjects((subRes.data || []).map(s => ({ id: s.id, name: s.name })));
    setAllGrades((grdRes.data || []).map(g => ({ id: g.id, name: g.name })));
    const counts: Record<string, number> = {};
    for (const s of studentsRes.data || []) { if (s.group_name) counts[s.group_name] = (counts[s.group_name] || 0) + 1; }
    setStudentCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (form: Omit<Group, 'id'>) => {
    let groupId = editing?.id;
    const payload = { name: form.name, grade: form.grade, schedule: form.schedule, fee: Number(form.fee), capacity: Number(form.capacity) };
    if (editing) {
      const oldName = editing.name;
      const res = await supabase.from('groups').update(payload).eq('id', editing.id);
      if (res.data && Number(res.data.capacity) === 0 && Number(form.capacity) > 0) {
        await supabase.from('groups').update({ capacity: Number(form.capacity) }).eq('id', editing.id);
      }
      if (oldName !== form.name) {
        const { data: affected } = await supabase.from('students').select('*').eq('group_name', oldName);
        for (const st of affected || []) {
          await supabase.from('students').update({ group_name: form.name }).eq('id', st.id);
        }
        // Sync teacher group_names arrays
        const { data: tAffected } = await supabase.from('teachers').select('id, group_names');
        for (const t of (tAffected || [])) {
          if ((t.group_names || []).includes(oldName)) {
            await supabase.from('teachers').update({
              group_names: (t.group_names || []).map((g: string) => g === oldName ? form.name : g)
            }).eq('id', t.id);
          }
        }
      }
    } else {
      const res = await supabase.from('groups').insert(payload);
      groupId = res.data?.id;
    }
    // Sync group_subjects
    if (groupId) {
      const { data: existing } = await supabase.from('group_subjects').select('*');
      const currentIds = (existing || []).filter(gs => gs.group_id === groupId).map(gs => gs.subject_id);
      const toAdd = groupSubjects.filter(s => !currentIds.includes(s));
      const toRemove = currentIds.filter(s => !groupSubjects.includes(s));
      for (const sub of toAdd) await supabase.from('group_subjects').insert({ group_id: groupId, subject_id: sub });
      for (const gs of (existing || []).filter(x => x.group_id === groupId && toRemove.includes(x.subject_id))) {
        await supabase.from('group_subjects').delete().eq('id', gs.id);
      }
    }
    show(editing ? 'تم تعديل المجموعة' : 'تم إضافة المجموعة');
    setShowModal(false); setEditing(undefined); setGroupSubjects([]); load();
  };

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذه المجموعة؟');
    if (!ok) return;
    const group = groups.find(g => g.id === id);
    await supabase.from('groups').delete().eq('id', id);
    if (group) {
      // Clear group_name from students
      const { data: affected } = await supabase.from('students').select('id').eq('group_name', group.name);
      for (const st of affected || []) {
        await supabase.from('students').update({ group_name: '' }).eq('id', st.id);
      }
      // Remove from teacher group_names arrays
      const { data: tAffected } = await supabase.from('teachers').select('id, group_names');
      for (const t of (tAffected || [])) {
        if ((t.group_names || []).includes(group.name)) {
          await supabase.from('teachers').update({
            group_names: (t.group_names || []).filter((g: string) => g !== group.name)
          }).eq('id', t.id);
        }
      }
    }
    show('تم حذف المجموعة');
    load();
  };

  const filtered = groups.filter(g =>
    g.name.includes(search) || g.grade.includes(search) || g.schedule?.includes(search)
  );

  return (
    <div className="fade-in space-y-4">
      {showModal && (
        <Modal
          onClose={() => { setShowModal(false); setEditing(undefined); setGroupSubjects([]); }}
          onSave={save}
          initial={editing}
          allSubjects={allSubjects}
          allGrades={allGrades}
          groupSubjects={groupSubjects}
          onSubjectToggle={id => setGroupSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        />
      )}

      <ListTemplate
        title="المجموعات"
        data={filtered}
        keyExtractor={g => g.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث باسم المجموعة أو الصف..."
        loading={loading}
        emptyMessage="لا توجد مجموعات مضافة"
        emptyIcon={<Users size={40} className="mx-auto text-gray-300" />}
        onAdd={() => { setEditing(undefined); setShowModal(true); setGroupSubjects([]); }}
        onExport={() => {}}
        onPrint={() => window.print()}
        onRefresh={load}
        columns={[
          { key: 'name', label: 'اسم المجموعة', render: g => <span className="font-semibold text-gray-800">{g.name}</span> },
          { key: 'grade', label: 'الصف', render: g => <span className="text-gray-600">{g.grade}</span> },
          { key: 'subjects', label: 'المواد', render: g => {
            const subIds = (g as any)._subjects || [];
            const names = subIds.map((id: string) => allSubjects.find(s => s.id === id)?.name).filter(Boolean);
            return names.length > 0
              ? <div className="flex gap-1 flex-wrap">{names.slice(0, 2).map((n: string) => <span key={n} className="text-xs bg-cyan-50 text-cyan-700 rounded-full px-2 py-0.5 font-medium">{n}</span>)}{names.length > 2 && <span className="text-xs text-gray-400">+{names.length - 2}</span>}</div>
              : <span className="text-gray-300 text-xs">—</span>;
          } },
          { key: 'schedule', label: 'الجدول', render: g => <span className="text-gray-600">{g.schedule}</span> },
          { key: 'fee', label: 'الرسوم', render: g => <span className="font-semibold text-cyan-600">{g.fee} ج</span> },
          { key: 'capacity', label: 'السعة', render: g => {
            const cnt = studentCounts[g.name] || 0;
            const remain = Math.max(0, g.capacity - cnt);
            const pct = g.capacity > 0 ? Math.round((cnt / g.capacity) * 100) : 0;
            const barColor = remain > 3 ? 'bg-green-500' : remain > 0 ? 'bg-amber-500' : 'bg-red-500';
            return <div className="min-w-[100px]">
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-gray-500">{cnt} / {g.capacity}</span>
                <span className={`text-xs font-semibold ${remain === 0 ? 'text-red-600' : remain <= 3 ? 'text-amber-600' : 'text-green-600'}`}>{remain} متبقي</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor}`} style={{width:`${Math.min(pct,100)}%`}} />
              </div>
            </div>;
          } },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: g => (
              <div className="flex items-center gap-2">
                <button onClick={() => { setGroupSubjects((g as any)._subjects || []); setEditing(g); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50"><Edit2 size={14} /></button>
                <button onClick={() => remove(g.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            )
          },
        ]}
      />
    </div>
  );
}
