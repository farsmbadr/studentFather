import { useState, useEffect } from 'react';
import { Archive, DollarSign, Lock, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';

const ADMIN_PASS = 'admin123';

export default function RevenueArchive() {
  const { show } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locked, setLocked] = useState(() => localStorage.getItem('revenue-archive-unlocked') === 'true');
  const [passInput, setPassInput] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!locked) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('payments').select('*').order('date', { ascending: false });
      setPayments((data || []).filter((p: any) => p.is_archived));
      setLoading(false);
    })();
  }, [locked]);

  const unarchive = async (id: string) => {
    await supabase.from('payments').update({ is_archived: false }).eq('id', id);
    show('تم إرجاع الإيراد');
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const unlock = () => {
    if (passInput === ADMIN_PASS) {
      localStorage.setItem('revenue-archive-unlocked', 'true');
      setLocked(true);
    } else {
      show('كلمة المرور غير صحيحة', 'error');
    }
  };

  const lock = () => {
    localStorage.removeItem('revenue-archive-unlocked');
    setLocked(false);
    setPassInput('');
  };

  const filtered = payments.filter(p => p.student_name?.includes(search) || String(p.amount).includes(search));
  const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);

  if (!locked) {
    return (
      <div className="fade-in max-w-sm mx-auto mt-16">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-purple-500" />
          </div>
          <h2 className="font-bold text-gray-800 text-lg mb-2">أرشيف الإيرادات</h2>
          <p className="text-sm text-gray-500 mb-6">هذه الصفحة للمديرين فقط. أدخل كلمة المرور للمتابعة.</p>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={passInput}
              onChange={e => setPassInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && unlock()}
              placeholder="كلمة المرور"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pl-10"
            />
            <button onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={unlock}
            className="mt-4 w-full py-3 bg-gradient-to-l from-purple-500 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-purple-600 hover:to-purple-700 transition-all shadow-md shadow-purple-200">
            فتح
          </button>
          <p className="text-xs text-gray-400 mt-4">كلمة المرور الافتراضية: admin123</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <Archive size={24} />
          <span className="text-lg text-white/80">أرشيف الإيرادات</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{payments.length} معاملة</span>
        </div>
        <p className="text-2xl font-bold mt-1">{totalAmount.toFixed(2)} ج</p>
      </div>

      {locked && (
        <div className="flex justify-end">
          <button onClick={lock} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors">
            <Lock size={12} /> قفل الصفحة
          </button>
        </div>
      )}

      <ListTemplate
        title="أرشيف الإيرادات"
        data={filtered}
        keyExtractor={p => p.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث..."
        loading={loading}
        emptyMessage="لا توجد إيرادات في الأرشيف"
        emptyIcon={<Archive size={40} className="mx-auto text-gray-300" />}
        onRefresh={() => {
          setLoading(true);
          supabase.from('payments').select('*').order('date', { ascending: false }).then(({ data }) => {
            setPayments((data || []).filter((p: any) => p.is_archived));
            setLoading(false);
          });
        }}
        columns={[
          { key: 'student_name', label: 'الطالب', render: p => <span className="font-semibold text-gray-800">{p.student_name || '—'}</span> },
          { key: 'amount', label: 'المبلغ', render: p => <span className="font-bold text-purple-600">{Number(p.amount).toFixed(2)} ج</span> },
          { key: 'date', label: 'التاريخ', render: p => <span className="text-gray-500 text-xs">{p.date?.slice(0, 10)}</span> },
          { key: 'received_by', label: 'المستلم', render: p => <span className="text-gray-500">{p.received_by || '—'}</span> },
          {
            key: 'actions', label: 'إجراءات', sortable: false, render: p => (
              <button onClick={() => unarchive(p.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="إرجاع"><RotateCcw size={14} /></button>
            )
          },
        ]}
      />
    </div>
  );
}
