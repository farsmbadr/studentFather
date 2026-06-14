import { useState, useEffect, useRef } from 'react';
import { X, UserCog, Edit2, Trash2, Plus, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

interface TeacherItem {
  id: string;
  name: string;
  phone: string;
  subject: string;
  subjects: { name: string; stId: string }[];
  group_names: string[];
  salary: number;
  hire_date: string;
  status: string;
  notes: string;
}

function MultiSelect({ items, selected, onChange, placeholder }: { items: string[]; selected: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const toggle = (item: string) => {
    if (selected.includes(item)) onChange(selected.filter(s => s !== item));
    else onChange([...selected, item]);
  };
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(!open)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-1 flex-wrap min-h-[38px]">
        {selected.length > 0
          ? selected.map((s, i) => <span key={s + '-' + i} className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{s}</span>)
          : <span className="text-gray-400">{placeholder}</span>
        }
        <ChevronDown size={14} className="text-gray-400 mr-auto" />
      </div>
      {open && (
        <div className="absolute top-full mt-1 right-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-[300] max-h-48 overflow-y-auto">
          {items.length === 0 && <div className="px-3 py-4 text-xs text-gray-400 text-center">لا توجد خيارات</div>}
          {items.map((item, idx) => (
            <div key={item + '-' + idx} onClick={() => toggle(item)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(item) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                {selected.includes(item) && <Check size={10} className="text-white" />}
              </div>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: Omit<TeacherItem, 'id'>) => void; initial?: TeacherItem }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    phone: initial?.phone || '',
    subject: initial?.subject || '',
    subjects: (initial?.subjects || []).map((s: any) => typeof s === 'string' ? s : s.name) || [] as string[],
    group_names: initial?.group_names || [] as string[],
    salary: initial?.salary || 0,
    hire_date: initial?.hire_date || new Date().toISOString().split('T')[0],
    status: initial?.status || 'active',
    notes: initial?.notes || '',
  });
  const set = (k: string, v: string | number | string[]) => setForm(f => ({ ...f, [k]: v }));

  const [allSubjects, setAllSubjects] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<string[]>([]);
  const [groupCapacity, setGroupCapacity] = useState<Record<string,{capacity:number;studentCount:number;remaining:number}>>({});

  useEffect(() => {
    (async () => {
      const [subjRes, groupsRes, studentsRes] = await Promise.all([
        supabase.from('subjects').select('name, stage').order('name'),
        supabase.from('groups').select('name, capacity'),
        supabase.from('students').select('group_name').eq('status', 'active'),
      ]);
      setAllSubjects([...new Set((subjRes.data || []).map((s: any) => s.name))].sort((a, b) => a.localeCompare(b, 'ar')));
      const grpNames: string[] = [];
      const cap: Record<string,{capacity:number;studentCount:number;remaining:number}> = {};
      const counts: Record<string, number> = {};
      for (const s of studentsRes.data || []) { if (s.group_name) counts[s.group_name] = (counts[s.group_name] || 0) + 1; }
      for (const g of (groupsRes.data || []) as any[]) {
        grpNames.push(g.name);
        cap[g.name] = { capacity: g.capacity || 20, studentCount: counts[g.name] || 0, remaining: Math.max(0, (g.capacity || 20) - (counts[g.name] || 0)) };
      }
      setAllGroups([...new Set(grpNames)].sort((a, b) => a.localeCompare(b, 'ar')));
      setGroupCapacity(cap);
      // Normalize form.subjects and form.group_names to match available items, remove duplicates & invalid names
      setForm(f => ({
        ...f,
        subjects: [...new Set(f.subjects.filter(s => subjRes.data?.some((x: any) => x.name === s)))],
        group_names: [...new Set(f.group_names.filter(g => grpNames.includes(g)))],
      }));
    })();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-indigo-500" />
            <h3 className="font-bold text-gray-800">{initial ? 'تعديل معلم' : 'إضافة معلم جديد'}</h3>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الاسم <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">رقم الموبايل <span className="text-red-500">*</span></label>
            <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المواد (اختيار متعدد)</label>
            <MultiSelect items={allSubjects} selected={form.subjects} onChange={v => set('subjects', v)} placeholder="اختر المواد..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">المجموعات (اختيار متعدد)</label>
            <MultiSelect items={allGroups} selected={form.group_names} onChange={v => set('group_names', v)} placeholder="اختر المجموعات..." />
            {form.group_names.length > 0 && <div className="mt-1.5 space-y-1">
              {form.group_names.map(g => {
                const info = groupCapacity[g];
                if (!info) return null;
                const pct = info.capacity > 0 ? Math.round((info.studentCount / info.capacity) * 100) : 0;
                const barColor = info.remaining > 3 ? 'bg-green-500' : info.remaining > 0 ? 'bg-amber-500' : 'bg-red-500';
                return <div key={g} className="text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>{g}: {info.studentCount}/{info.capacity} طالب</span>
                    <span className={info.remaining === 0 ? 'text-red-600 font-bold' : ''}>{info.remaining} متبقي</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                    <div className={`h-full rounded-full ${barColor}`} style={{width:`${Math.min(pct,100)}%`}} />
                  </div>
                </div>;
              })}
            </div>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الراتب</label>
            <input type="number" value={form.salary} onChange={e => set('salary', +e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">تاريخ التعيين</label>
            <input type="date" value={(form.hire_date || '').slice(0, 10)} onChange={e => set('hire_date', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">الحالة</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="resigned">استقال</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ملاحظات</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 rounded-lg bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600">حفظ</button>
        </div>
      </div>
    </div>
  );
}

export default function Classes() {
  const { show, confirm } = useToast();
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TeacherItem | undefined>();
  const [search, setSearch] = useState('');
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  const load = async () => {
    setLoading(true);
    const [tRes, cfgRes, stRes, subRes] = await Promise.all([
      supabase.from('teachers').select('*').order('created_at', { ascending: false }),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
      supabase.from('subject_teachers').select('*'),
      supabase.from('subjects').select('*'),
    ]);
    const subjMap: Record<string, string> = {};
    const subjDisplay: Record<string, string> = {};
    for (const s of (subRes.data || [])) {
      subjMap[s.id] = s.name;
      subjDisplay[s.id] = s.name;
    }
    const stMap: Record<string, { name: string; stId: string }[]> = {};
    for (const st of (stRes.data || [])) {
      if (!stMap[st.teacher_id]) stMap[st.teacher_id] = [];
      const name = subjDisplay[st.subject_id];
      if (name && !stMap[st.teacher_id].find(x => x.name === name)) stMap[st.teacher_id].push({ name, stId: st.id });
    }
    const enriched = (tRes.data || []).map((t: any) => ({
      ...t,
      subjects: stMap[t.id] || [],
      group_names: JSON.parse(t.group_names || '[]'),
    }));
    setTeachers(enriched);
    if (cfgRes.data) { setCenterName((cfgRes.data as any).center_name || 'CenterMasr'); setCenterAddress((cfgRes.data as any).address || ''); setCenterPhone((cfgRes.data as any).phone || ''); setCenterLogo((cfgRes.data as any).logo || ''); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    const subjects = [...new Set(form.subjects || [])] as string[];
    const group_names = [...new Set(form.group_names || [])] as string[];
    const toSave: Record<string, any> = {
      name: form.name,
      phone: form.phone,
      salary: Number(form.salary) || 0,
      hire_date: form.hire_date,
      status: form.status,
      notes: form.notes,
    };
    if (group_names.length > 0 || !editing) toSave.group_names = group_names;
    let teacherId = editing?.id;
    if (editing) await supabase.from('teachers').update(toSave).eq('id', editing.id);
    else {
      const res = await supabase.from('teachers').insert(toSave);
      teacherId = res.data?.id;
    }
    // Sync subject_teachers (map subject names → IDs)
    if (teacherId) {
      const { data: allSubs } = await supabase.from('subjects').select('*');
      const subMap: Record<string, string> = {};
      for (const s of allSubs || []) {
        subMap[s.name] = s.id;
      }
      const selectedIds = [...new Set((subjects || []).map((name: string) => subMap[name]).filter(Boolean))];
      const { data: existingSt } = await supabase.from('subject_teachers').select('*');
      const currentIds = (existingSt || []).filter(st => st.teacher_id === teacherId).map(st => st.subject_id);
      const toAdd = selectedIds.filter((id: string) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id: string) => !selectedIds.includes(id));
      for (const subId of toAdd) await supabase.from('subject_teachers').insert({ teacher_id: teacherId, subject_id: subId });
      for (const st of (existingSt || []).filter(x => x.teacher_id === teacherId && toRemove.includes(x.subject_id))) {
        await supabase.from('subject_teachers').delete().eq('id', st.id);
      }
    }
    show(editing ? 'تم تعديل المعلم' : 'تم إضافة المعلم');
    setShowModal(false); setEditing(undefined); load();
  };

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا المعلم؟');
    if (!ok) return;
    await supabase.from('teachers').delete().eq('id', id);
    load();
  };

  const removeSubject = async (teacherId: string, subjectName: string, stId?: string) => {
    const ok = await confirm(`حذف "${subjectName}" من المعلم؟`);
    if (!ok) return;
    if (stId) await supabase.from('subject_teachers').delete().eq('id', stId);
    load();
  };

  const removeGroup = async (teacherId: string, groupName: string) => {
    const ok = await confirm(`حذف "${groupName}" من المعلم؟`);
    if (!ok) return;
    const t = teachers.find(t => t.id === teacherId);
    if (!t) return;
    await supabase.from('teachers').update({ group_names: (t.group_names || []).filter((g: string) => g !== groupName) }).eq('id', teacherId);
    load();
  };

  const filtered = teachers.filter(t =>
    t.name.includes(search) || t.phone.includes(search) || (t.subjects || []).some(s => s.includes(search))
  );

  return (
    <div className="fade-in space-y-4">
      {showModal && <Modal onClose={() => { setShowModal(false); setEditing(undefined); }} onSave={save} initial={editing} />}

      <ListTemplate
        title="المعلمين"
        data={filtered}
        keyExtractor={c => c.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الموبايل أو المادة..."
        loading={loading}
        emptyMessage="لا يوجد معلمون حتى الآن"
        emptyIcon={<UserCog size={40} className="mx-auto text-gray-300" />}
        onAdd={() => { setEditing(undefined); setShowModal(true); }}
        onExport={() => {}}
        onPrint={() => {
          const w = window.open('', '_blank');
          if (!w) return;
          const rows = filtered.map(t => `
            <tr>
              <td>${t.name}</td>
              <td style="direction:ltr;text-align:left">${t.phone || '—'}</td>
              <td>${(t.subjects || []).join('، ') || '—'}</td>
              <td>${(t.group_names || []).join('، ') || '—'}</td>
              <td>${Number(t.salary).toLocaleString()} ج</td>
              <td>${t.hire_date ? new Date(t.hire_date).toLocaleDateString('ar-EG') : '—'}</td>
              <td>${({ active: 'نشط', inactive: 'غير نشط', resigned: 'استقال' })[t.status] || t.status}</td>
            </tr>`).join('');
          w.document.write(`<!DOCTYPE html><html dir="rtl">
          <head><meta charset="UTF-8"><title>المعلمين</title>
          <style>
            @page { size: landscape; margin: 14mm 3mm 10mm; }
            * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
            body { margin: 0; padding: 0; }
            ${printHeaderStyle()}
            .content { padding: 8mm 3mm 6mm; }
            h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; }
            th { background: #1e3a5f; color: white; padding: 5px 4px; text-align: center; font-weight: bold; }
            td { padding: 3px 4px; border-bottom: 1px solid #ddd; text-align: center; }
            tr:nth-child(even) { background: #f8f9fa; }
            .count { text-align: center; font-size: 12pt; color: #666; margin-top: 6px; }
          </style></head><body>
          ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
          <div class="content">
          <h2>قائمة المعلمين</h2>
          <table>
            <thead><tr><th>الاسم</th><th>الموبايل</th><th>المواد</th><th>المجموعات</th><th>الراتب</th><th>التعيين</th><th>الحالة</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="count">إجمالي: ${filtered.length} معلمين</div>
          </div>
          ${printFooterHtml()}</body></html>`);
          w.document.close();
          setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
        }}
        onRefresh={load}
        columns={[
          { key: 'name', label: 'الاسم', render: t => <span className="font-semibold text-gray-800">{t.name}</span> },
          { key: 'phone', label: 'الموبايل', render: t => <span className="text-gray-600 dir-ltr">{t.phone || '—'}</span> },
          {
            key: 'subjects', label: 'المواد', render: t => (
              <div className="flex flex-col gap-1">
                {(t.subjects || []).length > 0
                  ? t.subjects.map(s => (
                    <div key={t.id + '-' + s.name} className="flex items-center gap-1 w-fit">
                      <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{s.name}</span>
                      <button onClick={() => removeSubject(t.id, s.name, s.stId)} className="text-red-300 hover:text-red-500"><X size={11} /></button>
                    </div>
                  ))
                  : <span className="text-gray-400">—</span>
                }
              </div>
            )
          },
          {
            key: 'group_names', label: 'المجموعات', render: t => (
              <div className="flex flex-col gap-1">
                {(t.group_names || []).length > 0
                  ? t.group_names.map(g => (
                    <div key={t.id + '-' + g} className="flex items-center gap-1 w-fit">
                      <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">{g}</span>
                      <button onClick={() => removeGroup(t.id, g)} className="text-red-300 hover:text-red-500"><X size={11} /></button>
                    </div>
                  ))
                  : <span className="text-gray-400">—</span>
                }
              </div>
            )
          },
          { key: 'salary', label: 'الراتب', render: t => <span className="text-green-700 font-semibold">{t.salary.toLocaleString()} ج</span> },
          {
            key: 'hire_date', label: 'التعيين', render: t => (
              <span className="text-gray-500 text-xs">{t.hire_date ? new Date(t.hire_date).toLocaleDateString('ar-EG') : '—'}</span>
            )
          },
          {
            key: 'status', label: 'الحالة', render: t => {
              const colors: Record<string, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-yellow-100 text-yellow-700', resigned: 'bg-red-100 text-red-700' };
              const labels: Record<string, string> = { active: 'نشط', inactive: 'غير نشط', resigned: 'استقال' };
              return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[t.status] || 'bg-gray-100 text-gray-600'}`}>{labels[t.status] || t.status}</span>;
            }
          },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: t => (
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditing(t); setShowModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={13} /></button>
                <button onClick={() => remove(t.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
              </div>
            )
          },
        ]}
      />
    </div>
  );
}
