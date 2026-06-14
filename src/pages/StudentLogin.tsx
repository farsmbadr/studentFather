import { useState } from 'react';
import { User, Phone, AlertCircle, GraduationCap, ArrowLeft } from 'lucide-react';

interface StudentLoginProps {
  onLogin: (token: string, student: any) => void;
}

export default function StudentLogin({ onLogin }: StudentLoginProps) {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !phone) return setError('يرجى إدخال كود الطالب ورقم الهاتف');
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, phone }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'بيانات الدخول غير صحيحة');
      onLogin(d.access_token, d.student);
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <User size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">بوابة الطالب</h1>
            <p className="text-sm text-white/50">متابعة درجاتك وكتبك وحضورك</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">كود الطالب</label>
              <div className="relative">
                <GraduationCap size={16} className="absolute right-3 top-3 text-white/40" />
                <input type="text" value={code} onChange={e => setCode(e.target.value)}
                  placeholder="مثال: ST001"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all" autoFocus />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">رقم الهاتف الشخصي</label>
              <div className="relative">
                <Phone size={16} className="absolute right-3 top-3 text-white/40" />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="مثال: 01000000000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all pl-10" />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-300">{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20">
              {loading ? 'جاري تسجيل الدخول...' : 'دخول'}
            </button>
          </form>
          <div className="text-center mt-4">
            <a href="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
              <ArrowLeft size={14} />
              العودة للوحة التحكم
            </a>
          </div>
        </div>
        <p className="text-center text-white/20 text-xs mt-6">مركز بدر التعليمي</p>
      </div>
    </div>
  );
}
