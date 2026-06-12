import { useState } from 'react';
import { LogIn, Eye, EyeOff, User, Lock, AlertCircle, KeyRound } from 'lucide-react';

interface LoginProps {
  onLogin: (user: { id: string; name: string; username: string; role: string; permissions: string[]; is_super_admin?: boolean }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [userId, setUserId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return setError('يرجى إدخال اسم المستخدم وكلمة المرور');
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error === 'Invalid credentials' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : d.error || 'فشل تسجيل الدخول');
      const meta = d.user?.user_metadata;
      if (meta?.must_change_password) {
        setUserId(d.user.id);
        setMustChange(true);
        setLoading(false);
        return;
      }
      onLogin({ id: d.user?.id || '', name: meta?.name || '', username, role: meta?.role || '', permissions: meta?.permissions || [], is_super_admin: meta?.is_super_admin || false });
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) return setError('كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل');
    if (newPassword !== confirmPassword) return setError('كلمة المرور غير متطابقة');
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword: password, newPassword }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d.error || 'فشل تغيير كلمة المرور');
      // Login again to get fresh data
      const r2 = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: newPassword }),
      });
      const d2 = await r2.json();
      if (!r2.ok) return setError('فشل تسجيل الدخول بعد تغيير كلمة المرور');
      const meta = d2.user?.user_metadata;
      onLogin({ id: d2.user?.id || '', name: meta?.name || '', username, role: meta?.role || '', permissions: meta?.permissions || [], is_super_admin: meta?.is_super_admin || false });
    } catch {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  if (mustChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <KeyRound size={28} className="text-white" />
              </div>
              <h1 className="text-xl font-bold text-white mb-1">تغيير كلمة المرور</h1>
              <p className="text-sm text-white/50">يجب تغيير كلمة المرور لأول مرة</p>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock size={16} className="absolute right-3 top-3 text-white/40" />
                  <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all pl-10" />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute left-3 top-2.5 text-white/40 hover:text-white/70 transition-colors">
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">تأكيد كلمة المرور</label>
                <div className="relative">
                  <Lock size={16} className="absolute right-3 top-3 text-white/40" />
                  <input type={showNewPass ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="تأكيد كلمة المرور"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all pl-10" />
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-xs text-red-300">{error}</span>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-l from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 shadow-lg shadow-amber-600/20">
                {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <LogIn size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">CenterMasr</h1>
            <p className="text-sm text-white/50">نظام إدارة السناتر التعليمية</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">اسم المستخدم</label>
              <div className="relative">
                <User size={16} className="absolute right-3 top-3 text-white/40" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all" autoFocus />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1.5 block">كلمة المرور</label>
              <div className="relative">
                <Lock size={16} className="absolute right-3 top-3 text-white/40" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all pl-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-2.5 text-white/40 hover:text-white/70 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-300">{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-l from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20">
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>
        <p className="text-center text-white/20 text-xs mt-6">v1.0.0 &copy; 2026 — مطور بدر</p>
      </div>
    </div>
  );
}
