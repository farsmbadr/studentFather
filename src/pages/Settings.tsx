import { useState, useEffect, useRef } from 'react';
import { Download, Upload, Trash2, AlertTriangle, Shield, Server, Phone, User, Calendar, Clock, CheckCircle, XCircle, Info, Settings as SettingsIcon, Cloud, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { show, confirm } = useToast();
  const [machineId, setMachineId] = useState('جاري التحميل...');
  const [license, setLicense] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [showWipePassword, setShowWipePassword] = useState(false);
  const [wipePassword, setWipePassword] = useState('');
  const [licenseInput, setLicenseInput] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [activateMsg, setActivateMsg] = useState('');
  const [activateError, setActivateError] = useState(false);
  const licenseTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    fetch('/api/machine-id').then(r => r.json()).then(d => setMachineId(d.machineId)).catch(() => setMachineId('غير معروف'));
    checkLicense();
    loadSupabaseConfig();
  }, []);

  const loadSupabaseConfig = async () => {
    try {
      const r = await fetch('/api/sync-config');
      if (r.ok) {
        const d = await r.json();
        if (d.configured) {
          setSupabaseUrl(d.url || '');
          setSupabaseAnonKey(d.anonKey || '');
          setSupabaseConfigured(true);
        }
      }
    } catch {}
  };

  const saveSupabaseConfig = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) return show('الرجاء إدخال الرابط والمفتاح', 'error');
    try {
      const r = await fetch('/api/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: supabaseUrl.trim(), anonKey: supabaseAnonKey.trim() }),
      });
      if (!r.ok) throw new Error();
      setSupabaseConfigured(true);
      show('تم حفظ إعدادات Supabase');
    } catch { show('فشل حفظ الإعدادات', 'error'); }
  };

  const handleSyncToCloud = async () => {
    if (!supabaseConfigured) return show('قم بإعداد Supabase أولاً', 'error');
    const ok = await confirm('سيتم رفع جميع بيانات البوابات إلى السحابة. هل أنت متأكد؟');
    if (!ok) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch('/api/sync-to-supabase', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSyncResult(d);
      show('تمت المزامنة بنجاح');
    } catch (e: any) { show('فشلت المزامنة: ' + e.message, 'error'); }
    setSyncing(false);
  };

  const checkLicense = async () => {
    try {
      const r = await fetch('/api/check-license');
      const d = await r.json();
      setLicense(d);
    } catch { setLicense(null); }
  };

  const handleActivateLicense = async () => {
    if (!licenseInput.trim()) return;
    setActivatingLicense(true);
    setActivateMsg('');
    setActivateError(false);
    try {
      const data = JSON.parse(licenseInput);
      const r = await fetch('/api/activate-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'فشل التفعيل');
      setActivateMsg('تم التفعيل بنجاح ✅');
      setActivateError(false);
      setLicenseInput('');
      checkLicense();
    } catch (err: any) {
      setActivateMsg(err.message || 'خطأ في التفعيل');
      setActivateError(true);
    }
    setActivatingLicense(false);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await fetch('/api/backup');
      show('تم حفظ النسخة الاحتياطية في المجلدات المحددة');
    } catch { show('فشل النسخ الاحتياطي', 'error'); }
    setBackingUp(false);
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const ok = await confirm('استعادة النسخة الاحتياطية ستحذف جميع البيانات الحالية أولاً. هل أنت متأكد؟');
      if (!ok) return;
      setRestoring(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const r = await fetch('/api/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, confirm: true }) });
        if (!r.ok) { const e = await r.json(); throw new Error(e.error || e.message || 'خطأ غير معروف'); }
        show('تم استعادة البيانات بنجاح');
      } catch (e: any) { show('فشل الاستعادة: ' + (e.message || 'تأكد من صحة الملف'), 'error'); }
      setRestoring(false);
    };
    input.click();
  };

  const handleWipe = async () => {
    const ok = await confirm('سيتم حذف جميع البيانات نهائياً! هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟');
    if (!ok) return;
    const ok2 = await confirm('تأكيد نهائي: أنت متأكد من حذف كل شيء؟');
    if (!ok2) return;
    setShowWipePassword(true);
  };

  const confirmWipe = async () => {
    if (!wipePassword) return show('الرجاء إدخال كلمة المرور', 'error');
    setShowWipePassword(false);
    setWiping(true);
    try {
      const r = await fetch('/api/wipe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true, password: wipePassword }) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      show('تم حذف جميع البيانات');
    } catch (e: any) { show(e.message || 'فشل عملية الحذف', 'error'); }
    setWipePassword('');
    setWiping(false);
  };

  const set = (k: string, v: string | boolean | number) => setSettings(s => ({ ...s, [k]: v }));

  const daysRemaining = license ? Math.max(0, Math.ceil((new Date(license.expires_at).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="fade-in space-y-4">

      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <SettingsIcon size={24} />
          <span className="text-lg text-white/80">الإعدادات</span>
        </div>
        <p className="text-sm text-white/50 mt-1">النسخ الاحتياطي، الترخيص، ومعلومات النظام</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Backup & Restore ── */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-5">
            <Server size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-800">النسخ الاحتياطي والاستعادة</h3>
          </div>
          <div className="space-y-3">
            <button onClick={handleBackup} disabled={backingUp}
              className="flex items-center gap-2 w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors">
              <Download size={16} /> {backingUp ? 'جاري التصدير...' : 'نسخ احتياطي'}
            </button>
            <button onClick={handleRestore} disabled={restoring}
              className="flex items-center gap-2 w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors">
              <Upload size={16} /> {restoring ? 'جاري الاستعادة...' : 'استعادة نسخة'}
            </button>
            <button onClick={handleWipe} disabled={wiping}
              className="flex items-center gap-2 w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-3 rounded-xl transition-colors">
              <Trash2 size={16} /> {wiping ? 'جاري الحذف...' : 'حذف كل البيانات'}
            </button>
            <p className="text-xs text-gray-400 mt-2">⚠️ حذف كل البيانات لا يمكن التراجع عنه — يستخدم للتجربة فقط</p>
          </div>
        </div>

        {/* ── License & Activation ── */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-purple-500" />
            <h3 className="font-bold text-gray-800">الترخيص والتفعيل</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Machine ID</label>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 border border-gray-100">
                <Server size={13} className="text-gray-400 shrink-0" />
                <span className="truncate">{machineId}</span>
              </div>
            </div>
            {license ? (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 p-3 rounded-xl ${license.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  {license.valid ? <CheckCircle size={18} className="text-green-600 shrink-0" /> : <XCircle size={18} className="text-red-600 shrink-0" />}
                  <div>
                    <p className={`text-sm font-bold ${license.valid ? 'text-green-700' : 'text-red-700'}`}>
                      {license.valid ? 'الترخيص ساري' : 'الترخيص منتهي'}
                    </p>
                    <p className="text-xs text-gray-500">آخر تفعيل: {new Date(license.activated_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>الأيام المتبقية</span>
                    <span className="font-bold text-gray-700">{daysRemaining} / 14</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${daysRemaining && daysRemaining > 7 ? 'bg-green-500' : daysRemaining && daysRemaining > 3 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${daysRemaining ? (daysRemaining / 14) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm text-gray-500">لم يتم التحقق من الترخيص</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Activate License ── */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className="text-purple-500" />
            <h3 className="font-bold text-gray-800">تفعيل الترخيص</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">الصق محتوى ملف license.json الذي استلمته واضغط تفعيل</p>
          <textarea
            ref={licenseTextareaRef}
            className="w-full h-28 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder='{"machine_id":"...","activated_at":"...","expires_at":"..."}'
            value={licenseInput}
            onChange={e => setLicenseInput(e.target.value)}
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleActivateLicense}
              disabled={activatingLicense || !licenseInput.trim()}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              <Shield size={16} /> {activatingLicense ? 'جاري التفعيل...' : 'تفعيل الترخيص'}
            </button>
            {activateMsg && <span className={`text-sm font-semibold ${activateError ? 'text-red-600' : 'text-green-600'}`}>{activateMsg}</span>}
          </div>
        </div>

        {/* ── About ── */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-5">
            <Info size={18} className="text-pink-500" />
            <h3 className="font-bold text-gray-800">عن المبرمج والتواصل</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-pink-50 border border-pink-100">
              <User size={16} className="text-pink-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-800">م/ محمد بدر</p>
                <p className="text-xs text-gray-500">مطور تطبيق CenterMasr</p>
              </div>
            </div>
            <a href="https://wa.me/201008667306" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-green-50 border border-green-100 hover:bg-green-100 transition-colors">
              <Phone size={16} className="text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">01008667306</p>
                <p className="text-xs text-gray-500">تواصل عبر واتساب</p>
              </div>
            </a>
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span>CenterMasr v1.0.0</span>
              <span>|</span>
              <span>جميع الحقوق محفوظة &copy; 2026</span>
            </div>
          </div>
        </div>

        {/* ── Portal URLs ── */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-5">
            <Info size={18} className="text-blue-500" />
            <h3 className="font-bold text-gray-800">روابط البوابات الإلكترونية</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1.5">بوابة ولي الأمر — يدخل ولي الأمر بكود الطالب + هاتف ولي الأمر</p>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={window.location.origin + '/parent'} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-mono focus:outline-none ltr text-left" />
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/parent'); show('تم نسخ رابط ولي الأمر', 'success'); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-4 py-2 rounded-xl transition-colors shrink-0">
                  نسخ
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">بوابة الطالب — يدخل الطالب بكود الطالب + رقم هاتفه الشخصي</p>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={window.location.origin + '/student'} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-mono focus:outline-none ltr text-left" />
                <button onClick={() => { navigator.clipboard.writeText(window.location.origin + '/student'); show('تم نسخ رابط الطالب', 'success'); }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl transition-colors shrink-0">
                  نسخ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sync to Cloud (Supabase) ── */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center gap-2 mb-5">
            <Cloud size={18} className="text-sky-500" />
            <h3 className="font-bold text-gray-800">المزامنة مع السحابة (Supabase)</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">ارفع بيانات الطلاب والمدفوعات والامتحانات إلى Supabase لتشغيل بوابات أولياء الأمور والطلاب على موقع منفصل</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Supabase Project URL</label>
              <input type="url" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 ltr text-left focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Supabase Anon Key</label>
              <input type="text" value={supabaseAnonKey} onChange={e => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIs..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 font-mono ltr text-left focus:outline-none focus:ring-2 focus:ring-sky-400" />
            </div>
            <button onClick={saveSupabaseConfig}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Globe size={16} /> حفظ الإعدادات
            </button>
            {supabaseConfigured && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-xl">
                <CheckCircle size={14} /> تم إعداد الاتصال
              </div>
            )}
            <button onClick={handleSyncToCloud} disabled={syncing || !supabaseConfigured}
              className="flex items-center gap-2 w-full bg-gradient-to-l from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-md shadow-emerald-200">
              <Cloud size={18} /> {syncing ? 'جاري المزامنة...' : '🔵 مزامنة البيانات إلى السحابة الآن'}
            </button>
            {syncResult && (
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 font-mono max-h-40 overflow-y-auto">
                {Object.entries(syncResult.results || {}).map(([table, info]: [string, any]) => (
                  <div key={table} className="flex items-center gap-2 py-0.5">
                    {info.status === 'ok' ? <span className="text-green-500">✓</span> : <span className="text-red-500">✗</span>}
                    <span>{table}: {info.count} سجلات</span>
                    {info.error && <span className="text-red-500">({info.error})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Wipe Password Modal ── */}
      {showWipePassword && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setShowWipePassword(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-red-500" />
            <h3 className="font-bold text-gray-800">تأكيد المشرف العام</h3>
          </div>
          <p className="text-sm text-gray-500 mb-4">الرجاء إدخال كلمة مرور المشرف العام لتأكيد حذف جميع البيانات</p>
          <input type="password" value={wipePassword} onChange={e => setWipePassword(e.target.value)}
            placeholder="كلمة مرور المشرف العام"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            onKeyDown={e => { if (e.key === 'Enter') confirmWipe(); }}
            autoFocus />
          <div className="flex gap-3">
            <button onClick={() => { setShowWipePassword(false); setWipePassword(''); }}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              إلغاء
            </button>
            <button onClick={confirmWipe}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
              تأكيد الحذف
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}