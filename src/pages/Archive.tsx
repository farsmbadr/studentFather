import { useState, useEffect } from 'react';
import { Eye, Trash2, RotateCcw, Archive as ArchiveIcon } from 'lucide-react';
import { supabase } from '../supabaseClient';
import ListTemplate from '../components/ListTemplate';
import { useToast } from '../components/Toast';
import { printHeaderHtml, printFooterHtml, printHeaderStyle } from '../utils/printHeader';

interface Student {
  id: string;
  name: string;
  code: string;
  grade: string;
  gender: string;
  group_name: string;
  phone: string;
  parent_phone?: string;
  parent_name?: string;
  address?: string;
  status: string;
  monthly_fee: number;
  join_date: string;
  deletion_reason?: string;
  deleted_at?: string;
  notes?: string;
  booking_deposit?: number;
  school?: string;
  division?: string;
  parent_job?: string;
  birth_date?: string;
  email?: string;
}

export default function Archive({ onViewStudent }: { onViewStudent?: (id: string) => void }) {
  const { show, confirm } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [centerName, setCenterName] = useState('CenterMasr');
  const [centerAddress, setCenterAddress] = useState('');
  const [centerPhone, setCenterPhone] = useState('');
  const [centerLogo, setCenterLogo] = useState('');

  const load = async () => {
    setLoading(true);
    const [sRes, cfgRes] = await Promise.all([
      supabase.from('students').select('*').eq('status', 'deleted').order('created_at', { ascending: false }),
      supabase.from('center_config').select('center_name,address,phone,logo').maybeSingle(),
    ]);
    setStudents(sRes.data || []);
    if (cfgRes.data) { setCenterName((cfgRes.data as any).center_name || 'CenterMasr'); setCenterAddress((cfgRes.data as any).address || ''); setCenterPhone((cfgRes.data as any).phone || ''); setCenterLogo((cfgRes.data as any).logo || ''); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const restore = async (student: Student) => {
    await supabase.from('students').update({ status: 'active', deleted_at: null }).eq('id', student.id);
    show('تم استعادة الطالب بنجاح');
    load();
  };

  const permanentDelete = async (id: string) => {
    const ok = await confirm('⚠️ هل أنت متأكد؟ هذا سيحذف الطالب نهائياً من قاعدة البيانات!');
    if (!ok) return;
    await supabase.from('students').delete().eq('id', id);
    show('تم حذف الطالب نهائياً');
    load();
  };

  const filtered = students.filter(s =>
    s.name.includes(search) || s.code.includes(search) || s.phone.includes(search)
  );

  return (
    <div className="fade-in space-y-4">

      <ListTemplate
        title="أرشيف الطلاب"
        data={filtered}
        keyExtractor={s => s.id}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="بحث بالاسم أو الكود أو الهاتف..."
        loading={loading}
        emptyMessage="لا يوجد طلاب في الأرشيف"
        emptyIcon={<ArchiveIcon size={40} className="mx-auto text-gray-300" />}
        onExport={() => {}}
        onPrint={() => {
          const w = window.open('', '_blank');
          if (!w) return;
          const rows = filtered.map(s => `
            <tr>
              <td>${s.code}</td>
              <td style="font-weight:bold">${s.name}</td>
              <td>${s.grade}</td>
              <td>${s.gender}</td>
              <td style="direction:ltr;text-align:left">${s.phone}</td>
              <td style="direction:ltr;text-align:left">${s.parent_phone || '—'}</td>
              <td>${s.group_name || '—'}</td>
              <td>${s.deletion_reason || '—'}</td>
              <td>${s.deleted_at ? new Date(s.deleted_at).toLocaleString('ar-EG') : '—'}</td>
            </tr>`).join('');
          w.document.write(`<!DOCTYPE html><html dir="rtl">
          <head><meta charset="UTF-8"><title>أرشيف الطلاب</title>
          <style>
            @page { size: landscape; margin: 14mm 3mm 10mm; }
            * { font-family: 'Traditional Arabic', 'Arabic Typesetting', Arial, sans-serif; }
            body { margin: 0; padding: 0; }
            ${printHeaderStyle()}
            .content { padding: 8mm 3mm 6mm; }
            h2 { text-align: center; font-size: 14pt; color: #1e3a5f; margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12pt; }
            th { background: #1e3a5f; color: white; padding: 5px 3px; text-align: center; font-weight: bold; }
            td { padding: 3px 3px; border-bottom: 1px solid #ddd; text-align: center; }
            tr:nth-child(even) { background: #f8f9fa; }
            .count { text-align: center; font-size: 12pt; color: #666; margin-top: 6px; }
          </style></head><body>
          ${printHeaderHtml({ center_name: centerName, address: centerAddress, phone: centerPhone, logo: centerLogo })}
          <div class="content">
          <h2>أرشيف الطلاب</h2>
          <table>
            <thead><tr><th>#</th><th>اسم الطالب</th><th>المرحلة</th><th>النوع</th><th>موبايل الطالب</th><th>موبايل ولي الأمر</th><th>المجموعة</th><th>سبب الحذف</th><th>تاريخ الحذف</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="count">إجمالي: ${filtered.length} طلاب</div>
          </div>
          ${printFooterHtml()}</body></html>`);
          w.document.close();
          setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
        }}
        onRefresh={load}
        columns={[
          { key: 'code', label: '#', render: s => <span className="font-mono text-gray-600 font-bold">{s.code}</span> },
          { key: 'name', label: 'اسم الطالب', render: s => <span className="font-semibold text-gray-800">{s.name}</span> },
          { key: 'grade', label: 'المرحلة', render: s => <span className="text-gray-600">{s.grade}</span> },
          { key: 'gender', label: 'النوع', render: s => <span className="text-gray-600">{s.gender}</span> },
          { key: 'phone', label: 'موبايل الطالب', render: s => <span className="text-gray-600 dir-ltr">{s.phone}</span> },
          { key: 'parent_phone', label: 'موبايل ولي الأمر', render: s => <span className="text-gray-600 dir-ltr">{s.parent_phone || '—'}</span> },
          { key: 'group_name', label: 'المجموعات', render: s => <span className="text-gray-600">{s.group_name || '—'}</span> },
          { key: 'deletion_reason', label: 'سبب الحذف', render: s => <span className="text-gray-600 font-semibold">{s.deletion_reason || '—'}</span> },
          { key: 'deleted_at', label: 'تاريخ الحذف', render: s => <span className="text-gray-500 text-xs">{s.deleted_at ? new Date(s.deleted_at).toLocaleString('ar-EG') : '—'}</span> },
          {
            key: 'actions', label: '', sortable: false, render: s => (
              <div className="flex items-center gap-1.5">
                <button onClick={() => onViewStudent?.(s.id)} title="عرض ملف الطالب"
                  className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors">
                  <Eye size={16} />
                </button>
                <button onClick={() => restore(s)} title="استعادة الطالب"
                  className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors">
                  <RotateCcw size={16} />
                </button>
                <button onClick={() => permanentDelete(s.id)} title="حذف نهائي"
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )
          },
        ]}
      />
    </div>
  );
}
