import { useState, useEffect } from 'react';
import { LogIn, Monitor, CheckCircle, XCircle, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LogEntry {
  id: string;
  username: string;
  action: string;
  ip_address: string;
  created_at: string;
  success: boolean;
}

export default function LoginLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      supabase.from('login_logs').select('*').order('created_at', { ascending: false }).limit(100).then(({ data }) => setLogs(data || [])),
      supabase.from('app_users').select('name,username').then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((u: any) => { map[u.username] = u.name; });
        setUserNames(map);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => !search || l.username.includes(search) || l.ip_address.includes(search) || (userNames[l.username] || '').includes(search));

  const successCount = logs.filter(l => l.success).length;
  const failCount = logs.filter(l => !l.success).length;

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2 mb-1">
          <LogIn size={22} />
          <span className="text-lg text-white/80">سجل الدخول</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">{logs.length} عملية</span>
        </div>
        <p className="text-sm text-white/50">آخر 100 عملية تسجيل دخول ومحاولات الوصول</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><LogIn size={18} className="text-blue-600" /></div>
          <div><p className="text-xs text-gray-500">إجمالي المحاولات</p><p className="text-lg font-bold text-gray-800">{logs.length}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0"><CheckCircle size={18} className="text-green-600" /></div>
          <div><p className="text-xs text-gray-500">ناجحة</p><p className="text-lg font-bold text-green-700">{successCount}</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><XCircle size={18} className="text-red-600" /></div>
          <div><p className="text-xs text-gray-500">فاشلة</p><p className="text-lg font-bold text-red-700">{failCount}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم المستخدم أو IP..."
              className="w-full border border-gray-200 rounded-lg pr-9 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Monitor size={48} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">{search ? 'لا توجد نتائج للبحث' : 'لا توجد سجلات دخول'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  {['الاسم', 'المستخدم', 'الإجراء', 'عنوان IP', 'التاريخ والوقت', 'الحالة'].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{userNames[l.username] || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{l.username}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.action}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded border border-gray-100 text-gray-500">{l.ip_address}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString('ar-EG')}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${l.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {l.success ? <CheckCircle size={11} /> : <XCircle size={11} />}
                        {l.success ? 'نجاح' : 'فشل'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
