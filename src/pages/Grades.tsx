import { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Hash } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';

interface Grade {
  id: string;
  name: string;
}

function GradeModal({ onClose, onSave, initial }: { onClose: () => void; onSave: (d: { name: string }) => void; initial?: Grade }) {
  const [name, setName] = useState(initial?.name || '');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800">{initial ? 'تعديل صف' : 'إضافة صف جديد'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">اسم الصف</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: الصف الأول الثانوي" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400" />
          </div>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">إلغاء</button>
          <button onClick={() => onSave({ name: name.trim() })} disabled={!name.trim()}
            className="px-5 py-2 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

export default function Grades() {
  const { show, confirm } = useToast();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Grade | undefined>();
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await supabase.from('grades').select('*').order('name', { ascending: true });
    setGrades(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (form: { name: string }) => {
    if (editing) {
      const { error } = await supabase.from('grades').update(form).eq('id', editing.id);
      if (error) { show('حدث خطأ', 'error'); return; }
    } else {
      const { error } = await supabase.from('grades').insert(form);
      if (error) { show(error.error?.message || 'حدث خطأ', 'error'); return; }
    }
    show(editing ? 'تم تعديل الصف' : 'تم إضافة الصف');
    setShowModal(false); setEditing(undefined); load();
  };

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا الصف؟');
    if (!ok) return;
    await supabase.from('grades').delete().eq('id', id);
    show('تم حذف الصف');
    load();
  };

  const filtered = grades.filter(g => g.name.includes(search));

  return (
    <div className="fade-in space-y-4">
      {showModal && (
        <GradeModal
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSave={save}
          initial={editing}
        />
      )}

      <ListTemplate
        title="الصفوف الدراسية"
        data={filtered}
        keyExtractor={g => g.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث باسم الصف..."
        loading={loading}
        emptyMessage="لا توجد صفوف مضافة"
        emptyIcon={<Hash size={40} className="mx-auto text-gray-300" />}
        onAdd={() => { setEditing(undefined); setShowModal(true); }}
        onRefresh={load}
        columns={[
          { key: 'name', label: 'اسم الصف', render: g => <span className="font-semibold text-gray-800">{g.name}</span> },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: g => (
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(g); setShowModal(true); }} className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50"><Edit2 size={14} /></button>
                <button onClick={() => remove(g.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            )
          },
        ]}
      />
    </div>
  );
}
