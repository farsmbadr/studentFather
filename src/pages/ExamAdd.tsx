import { useState, useEffect } from 'react';
import { ArrowRight, FileText } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../components/Toast';
import { Page } from '../types';

export default function ExamAdd({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const { show } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', exam_type: 'ورقة', subject: '', grade: '', teacher: '', duration: 0, max_score: 100, date: new Date().toISOString().slice(0, 16) });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('subjects').select('name').order('name').then(({ data }) => setSubjects((data || []).map((s: any) => s.name)));
    supabase.from('teachers').select('id, name').order('name').then(({ data }) => setTeachers(data || []));
    supabase.from('grades').select('name').order('name').then(({ data }) => setGrades((data || []).map((g: any) => g.name)));

    const stored = localStorage.getItem('exam-edit');
    if (stored) {
      try {
        const exam = JSON.parse(stored);
        setForm({
          title: exam.title,
          exam_type: exam.exam_type || 'ورقة',
          subject: exam.subject || '',
          grade: exam.grade || '',
          teacher: exam.teacher || '',
          duration: exam.duration || 0,
          max_score: exam.max_score || 100,
          date: exam.date ? exam.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
        });
        setEditingId(exam.id);
      } catch {}
      localStorage.removeItem('exam-edit');
    }
  }, []);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return show('عنوان الاختبار مطلوب', 'error');
    if (!form.subject.trim()) return show('المادة مطلوبة', 'error');
    setSaving(true);
    const payload = { ...form, date: form.date ? new Date(form.date).toISOString() : new Date().toISOString() };
    try {
      let examId = editingId;
      if (editingId) await supabase.from('exams').update(payload).eq('id', editingId);
      else {
        const res = await supabase.from('exams').insert(payload);
        examId = res.data?.id;
      }
      await supabase.from('notifications').insert({ title: editingId ? 'تعديل اختبار' : 'إضافة اختبار', message: form.title, target: 'all', is_read: false });
      show(editingId ? 'تم تعديل الاختبار' : 'تم إضافة الاختبار', 'success');
      if (!editingId) setForm({ title: '', exam_type: 'ورقة', subject: '', grade: '', teacher: '', duration: 0, max_score: 100, date: new Date().toISOString().slice(0, 16) });
      if (form.exam_type === 'إلكتروني' && examId) {
        localStorage.setItem('exam-setup-id', examId);
        setTimeout(() => onNavigate?.('exam-setup'), 300);
      }
    } catch { show('حدث خطأ', 'error'); }
    setSaving(false);
  };

  const isEdit = !!editingId;

  return (
    <div className="fade-in max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-l from-blue-500 to-blue-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate?.('exams')} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"><ArrowRight size={20} /></button>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">{isEdit ? 'تعديل الاختبار' : 'إضافة اختبار جديد'}</h2>
              <p className="text-blue-100 text-xs">{isEdit ? 'عدّل بيانات الاختبار' : 'أدخل بيانات الاختبار'}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">نوع الاختبار</label>
            <div className="flex gap-4">
              {['ورقة', 'إلكتروني'].map(t => (
                <label key={t} className={`flex-1 flex items-center justify-center gap-2 border-2 rounded-xl px-4 py-3 cursor-pointer transition-all text-sm font-semibold ${form.exam_type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <input type="radio" name="exam_type" value={t} checked={form.exam_type === t} onChange={e => set('exam_type', e.target.value)} className="sr-only" />
                  {t === 'ورقة' ? '📝' : '💻'} {t}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">عنوان الاختبار <span className="text-red-500">*</span></label>
            <input type="text" value={form.title} placeholder="مثال: اختبار منتصف الفصل"
              onChange={e => set('title', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">المادة <span className="text-red-500">*</span></label>
            <select value={form.subject} onChange={e => set('subject', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">اختر المادة</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">المعلم</label>
            <select value={form.teacher} onChange={e => set('teacher', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">اختر المعلم</option>
              {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1.5 block font-semibold">الصف الدراسي</label>
            <select value={form.grade} onChange={e => set('grade', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">اختر الصف</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-semibold">المدة (بالدقيقة)</label>
              <input type="number" value={form.duration} onChange={e => set('duration', +e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-semibold">الدرجة الكاملة</label>
              <input type="number" value={form.max_score} onChange={e => set('max_score', +e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block font-semibold">التاريخ والوقت</label>
              <input type="datetime-local" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all" />
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="w-full py-3 bg-gradient-to-l from-blue-500 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 shadow-md shadow-blue-200">
            {saving ? 'جاري الحفظ...' : (isEdit ? 'تحديث الاختبار' : 'إضافة الاختبار')}
          </button>
        </div>
      </div>
    </div>
  );
}
