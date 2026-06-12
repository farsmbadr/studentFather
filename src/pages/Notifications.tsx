import { useState, useEffect } from 'react';
import { Plus, X, Bell, Trash2, Check, Send, MessageCircle, CheckCheck, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  target: string;
  created_at: string;
  is_read: boolean;
}

function Modal({ onClose, onSave }: { onClose: () => void; onSave: (d: { title: string; message: string; target: string; sendWhatsApp: boolean }) => void }) {
  const [form, setForm] = useState({ title: '', message: '', target: 'all', sendWhatsApp: false });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Send size={18} className="text-amber-500" /> إرسال إشعار جديد</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">عنوان الإشعار</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">نص الرسالة</label>
            <textarea rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none transition-shadow" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">الموجه إلى</label>
            <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-shadow">
              <option value="all">جميع الطلاب</option>
              <option value="primary">المرحلة الابتدائية</option>
              <option value="prep">المرحلة الإعدادية</option>
              <option value="secondary">المرحلة الثانوية</option>
            </select>
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer pt-3 border-t">
            <div className="relative">
              <input type="checkbox" checked={form.sendWhatsApp} onChange={e => setForm(f => ({ ...f, sendWhatsApp: e.target.checked }))} className="sr-only" />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.sendWhatsApp ? 'bg-green-400' : 'bg-gray-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${form.sendWhatsApp ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <span className="flex items-center gap-1.5"><MessageCircle size={14} className="text-green-500" /> إرسال عبر واتساب للمستهدفين</span>
          </label>
        </div>
        <div className="flex gap-3 justify-end p-5 border-t">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border text-gray-600 text-sm hover:bg-gray-50 transition-colors">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.title || !form.message} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors">
            <Send size={14} /> إرسال
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const { show, confirm } = useToast();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    setNotifs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async (form: { title: string; message: string; target: string; sendWhatsApp: boolean }) => {
    await supabase.from('notifications').insert({ title: form.title, message: form.message, target: form.target, is_read: false });
    setShowModal(false);
    if (form.sendWhatsApp) {
      const gradeFilter = form.target === 'all' ? '' : form.target === 'primary' ? 'الابتدائي' : form.target === 'prep' ? 'الإعدادي' : 'الثانوي';
      let query = supabase.from('students').select('name, phone, parent_phone').eq('status', 'active');
      if (gradeFilter) query = query.like('grade', `%${gradeFilter}%`);
      const { data } = await query;
      const phones = new Set<string>();
      for (const s of data || []) {
        if (s.parent_phone) phones.add(s.parent_phone);
        if (s.phone) phones.add(s.phone);
      }
      const phoneList = [...phones].map(p => `20${p.replace(/^0/, '')}`).join(',');
      const msg = `*${form.title}*\n\n${form.message}`;
      const encoded = encodeURIComponent(msg);
      navigator.clipboard.writeText(phoneList).catch(() => {});
      const confirmed = await confirm(`تم تجهيز ${phones.size} رقم هاتف.\n\nانسخ الأرقام والصقها في قائمة البث في واتساب.\n\nهل تريد فتح واتساب الآن؟`);
      if (confirmed) window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    load();
  };

  const markAllRead = async () => {
    try {
      const { data, error: selErr } = await supabase.from('notifications').select('id').eq('is_read', false);
      if (selErr) return show(selErr.message, 'error');
      const ids = (data || []).map(n => n.id);
      if (ids.length === 0) return show('لا توجد إشعارات غير مقروءة');
      await Promise.all(ids.map(id => supabase.from('notifications').update({ is_read: true }).eq('id', id)));
      show('تم تحديد الكل كمقروء');
    } catch (e: any) { show(e.message, 'error'); }
    load();
  };

  const deleteAll = async () => {
    const ok = await confirm('حذف جميع الإشعارات نهائياً؟');
    if (!ok) return;
    try {
      const { data, error: selErr } = await supabase.from('notifications').select('id');
      if (selErr) return show(selErr.message, 'error');
      const ids = (data || []).map(n => n.id);
      if (ids.length === 0) return show('لا توجد إشعارات للحذف');
      await Promise.all(ids.map(id => supabase.from('notifications').delete().eq('id', id)));
      show('تم حذف جميع الإشعارات');
    } catch (e: any) { show(e.message, 'error'); }
    load();
  };

  const toggleRead = async (n: Notification) => {
    await supabase.from('notifications').update({ is_read: !n.is_read }).eq('id', n.id);
    load();
  };

  const targetLabel: Record<string, string> = { all: 'الجميع', primary: 'ابتدائي', prep: 'إعدادي', secondary: 'ثانوي' };
  const targetColor: Record<string, string> = { all: 'bg-blue-100 text-blue-700', primary: 'bg-green-100 text-green-700', prep: 'bg-purple-100 text-purple-700', secondary: 'bg-amber-100 text-amber-700' };

  return (
    <div className="fade-in space-y-4">
      {showModal && <Modal onClose={() => setShowModal(false)} onSave={save} />}

      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 shadow-lg text-white">
        <div className="flex items-center gap-2">
          <Bell size={24} />
          <span className="text-lg text-white/80">الإشعارات</span>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-bold mr-auto">
            {notifs.length} {notifs.length === 1 ? 'إشعار' : 'إشعارات'}
            {notifs.filter(n => !n.is_read).length > 0 && (
              <span className="mr-2 text-yellow-300">{notifs.filter(n => !n.is_read).length} غير مقروء</span>
            )}
          </span>
        </div>
        <p className="text-sm text-white/70 mt-1">إدارة وإرسال الإشعارات للطلاب وأولياء الأمور</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {notifs.length > 0 && <>
            <button onClick={markAllRead} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">
              <CheckCheck size={14} /> تحديد الكل مقروء
            </button>
            <button onClick={deleteAll} className="flex items-center gap-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-500 text-xs px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm">
              <Trash2 size={14} /> حذف الكل
            </button>
          </>}
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
          <Plus size={16} /> إشعار جديد
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center">
          <Bell size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 text-sm">لا توجد إشعارات</p>
          <p className="text-gray-300 text-xs mt-1">أضف إشعاراً جديداً من الزر بالأعلى</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notifs.map(n => (
            <div key={n.id}
              className={`rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${n.is_read ? 'bg-white border-gray-100' : 'bg-amber-50 border-amber-200'}`}>
              {/* Top bar */}
              <div className={`h-1.5 rounded-t-2xl ${n.is_read ? 'bg-gray-200' : 'bg-amber-400'}`} />
              {/* Body */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.is_read ? 'bg-gray-100' : 'bg-amber-100'}`}>
                    {n.is_read ? <EyeOff size={16} className="text-gray-400" /> : <Bell size={16} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${n.is_read ? 'text-gray-600' : 'font-bold text-gray-800'}`}>{n.title}</p>
                    <p className={`text-xs mt-1 line-clamp-2 ${n.is_read ? 'text-gray-400' : 'text-gray-600'}`}>{n.message}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); remove(n.id); }} className="text-red-300 hover:text-red-500 p-1 shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-gray-100">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${targetColor[n.target] || 'bg-gray-100 text-gray-600'}`}>
                    {targetLabel[n.target] || n.target}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString('ar-EG')}</span>
                    <button onClick={e => { e.stopPropagation(); toggleRead(n); }} className={`p-1 rounded-lg transition-colors ${n.is_read ? 'text-gray-300 hover:text-amber-500 hover:bg-amber-50' : 'text-amber-500 hover:text-gray-400 hover:bg-gray-100'}`} title={n.is_read ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}>
                      {n.is_read ? <Eye size={13} /> : <Check size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}