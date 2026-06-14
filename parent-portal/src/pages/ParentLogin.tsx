import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { User, Phone, AlertCircle, GraduationCap } from 'lucide-react';

export default function ParentLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !parentPhone) return setError('يرجى إدخال كود الطالب ورقم الهاتف');
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('students')
        .select('id, name, code, grade, group_name, parent_name, parent_phone, status')
        .eq('code', code.trim())
        .eq('parent_phone', parentPhone.trim())
        .maybeSingle();
      if (err) throw err;
      if (!data) return setError('بيانات الدخول غير صحيحة');
      if (data.status !== 'active') return setError('الطالب غير نشط');
      sessionStorage.setItem('portal_parent', JSON.stringify(data));
      sessionStorage.setItem('portal_type', 'parent');
      navigate('/parent/dashboard');
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <GraduationCap size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">بوابة ولي الأمر</h1>
            <p className="text-sm text-white/50">متابعة أداء الطالب أولاً بأول</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">كود الطالب</label>
              <div className="relative">
                <User size={16} className="absolute right-3 top-3 text-white/40" />
                <input type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="مثال: ST001"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all" autoFocus />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">رقم هاتف ولي الأمر</label>
              <div className="relative">
                <Phone size={16} className="absolute right-3 top-3 text-white/40" />
                <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)}
                  placeholder="مثال: 01123456789"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all pl-10" />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-300">{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20">
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </form>
          <div className="flex justify-center gap-4 mt-4">
            <Link to="/student" className="text-white/30 hover:text-white/60 text-xs transition-colors">دخول الطالب</Link>
          </div>
        </div>
        <p className="text-center text-white/20 text-xs mt-6">مركز بدر التعليمي — v1.0.0</p>
      </div>
    </div>
  );
}
