import { useState, useEffect, useRef } from 'react';
import { Save, Database, Upload, X, Camera } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Config {
  id: string;
  center_name: string;
  academic_year: string;
  year_start: string;
  year_end: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
}

export default function BasicData() {
  const [config, setConfig] = useState<Partial<Config>>({
    center_name: 'CenterMasr',
    academic_year: '2025-2026',
    year_start: '2025-09-01',
    year_end: '2026-06-30',
    address: '',
    phone: '',
    email: '',
    logo: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('center_config').select('*').maybeSingle().then(({ data }) => {
      if (data) setConfig(data);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    const payload = { ...config };
    if (payload.id) {
      await supabase.from('center_config').update(payload).eq('id', payload.id);
    } else {
      const { data } = await supabase.from('center_config').insert(payload).select().single();
      if (data) setConfig(data);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (k: string, v: string) => setConfig(c => ({ ...c, [k]: v }));

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('logo', reader.result as string);
    reader.readAsDataURL(file);
  };

  const fields = [
    { label: 'اسم المركز', key: 'center_name' },
    { label: 'العام الدراسي', key: 'academic_year' },
    { label: 'بداية العام', key: 'year_start', type: 'date' },
    { label: 'نهاية العام', key: 'year_end', type: 'date' },
    { label: 'العنوان', key: 'address' },
    { label: 'رقم الهاتف', key: 'phone' },
    { label: 'البريد الإلكتروني', key: 'email', type: 'email' },
  ];

  return (
    <div className="fade-in space-y-4">
      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <Database size={24} />
          <span className="text-lg text-white/80">البيانات الأساسية للمركز</span>
        </div>
        <p className="text-sm text-white/50 mt-1">بيانات السنتر التى تظهر فى التقارير والفواتير المطبوعة</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Logo Section */}
          <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
            <label className="text-sm text-gray-600 font-semibold mb-4 self-start">شعار المركز</label>
            <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 mb-4">
              {config.logo ? (
                <img src={config.logo} alt="شعار" className="w-full h-full object-contain" />
              ) : (
                <Camera size={40} className="text-gray-300" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                <Upload size={14} /> اختيار صورة
              </button>
              {config.logo && (
                <button onClick={() => set('logo', '')} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-500 text-sm px-4 py-2 rounded-xl transition-colors">
                  <X size={14} /> حذف
                </button>
              )}
            </div>
          </div>

          {/* Fields Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {fields.map(f => (
                <div key={f.key} className={f.key === 'academic_year' ? 'sm:col-span-2' : ''}>
                  <label className="text-sm text-gray-600 font-semibold mb-1.5 block">{f.label}</label>
                  <input
                    type={f.type || 'text'}
                    value={f.type === 'date' ? ((config as any)[f.key] || '').slice(0, 10) : (config as any)[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition-shadow"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={save} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors">
          <Save size={16} />
          حفظ البيانات
        </button>
        {saved && <span className="text-green-600 text-sm font-semibold animate-pulse">تم الحفظ بنجاح!</span>}
      </div>
    </div>
  );
}
