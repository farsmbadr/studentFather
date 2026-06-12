import { useState, useEffect } from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';

export default function ExpenseArchive() {
  const { show, confirm } = useToast();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    setExpenses((data || []).filter((e: any) => e.is_archived));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const unarchive = async (id: string) => {
    await supabase.from('expenses').update({ is_archived: false }).eq('id', id);
    show('تم إلغاء الأرشفة');
    load();
  };

  const remove = async (id: string) => {
    const ok = await confirm('حذف هذا المصروف نهائياً؟');
    if (!ok) return;
    await supabase.from('expenses').delete().eq('id', id);
    show('تم الحذف');
    load();
  };

  const filtered = expenses.filter(e => e.title?.includes(search) || e.category?.includes(search));

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const fmt = (n: number | string) => Math.round(Number(n));

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <Archive size={24} />
          <span className="text-lg text-white/80">أرشيف المصروفات</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{expenses.length} معاملة</span>
        </div>
        <p className="text-2xl font-bold mt-1">{fmt(total)} ج</p>
      </div>

      <ListTemplate
        title="أرشيف المصروفات"
        data={filtered}
        keyExtractor={e => e.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث..."
        loading={loading}
        emptyMessage="لا توجد مصروفات مؤرشفة"
        emptyIcon={<Archive size={40} className="mx-auto text-gray-300" />}
        onRefresh={load}
        columns={[
          { key: 'title', label: 'البيان', render: e => <span className="font-semibold text-gray-800">{e.title}</span> },
          { key: 'amount', label: 'المبلغ', render: e => <span className="font-bold text-gray-600">{fmt(e.amount)} ج</span> },
          { key: 'category', label: 'التصنيف', render: e => <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">{e.category}</span> },
          { key: 'date', label: 'التاريخ', render: e => <span className="text-gray-500 text-xs">{e.date?.slice(0, 10)}</span> },
          { key: 'created_by', label: 'المستخدم', render: e => <span className="text-gray-500 text-xs">{e.created_by || '—'}</span> },
          { key: 'notes', label: 'ملاحظات', render: e => <span className="text-gray-500 text-xs max-w-[150px] truncate block">{e.notes || '—'}</span> },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: e => (
              <div className="flex items-center gap-1">
                <button onClick={() => unarchive(e.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="إلغاء الأرشفة"><RotateCcw size={14} /></button>
                <button onClick={() => remove(e.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="حذف نهائي"><Trash2 size={14} /></button>
              </div>
            )
          },
        ]}
      />
    </div>
  );
}
