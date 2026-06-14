import { useState, useEffect } from 'react';
import { MessageSquare, Send, Phone, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink, User, Mail } from 'lucide-react';
import { useToast } from '../components/Toast';
import { supabase } from '../supabaseClient';

export default function ParentMessages() {
  const { show } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<any | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/parent_messages');
      const d = await r.json();
      if (r.ok) setMessages(d);
    } catch { show('فشل تحميل الرسائل', 'error'); }
    setLoading(false);
  };

  useEffect(() => { loadMessages(); }, []);

  const handleReply = async (msgId: string) => {
    if (!replyText.trim()) return show('يرجى كتابة الرد', 'error');
    setSending(msgId);
    try {
      const r = await fetch(`/api/parent-messages/${msgId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });
      if (!r.ok) throw new Error();
      setReplyText('');
      setSelectedMsg(null);
      show('تم إرسال الرد', 'success');
      loadMessages();
    } catch { show('فشل إرسال الرد', 'error'); }
    setSending(null);
  };

  const sendWhatsApp = (phone: string, reply: string) => {
    const msg = encodeURIComponent(`السلام عليكم ورحمة الله وبركاته\n\nرد إدارة المركز على رسالتك:\n${reply}\n\nمع تحيات إدارة المركز`);
    window.open(`https://wa.me/2${phone.replace(/^0/, '')}?text=${msg}`, '_blank');
  };

  const unread = messages.filter(m => !m.is_read).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow">
            <MessageSquare size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">إشعارات أولياء الأمور</h2>
            <p className="text-xs text-gray-400">رسائل واردة من أولياء الأمور</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {unread} غير مقروء
            </span>
          )}
          <button onClick={loadMessages} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">لا توجد رسائل من أولياء الأمور بعد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`bg-white rounded-2xl shadow-sm border ${msg.reply ? 'border-green-100' : msg.is_read ? 'border-gray-100' : 'border-violet-200'} overflow-hidden`}>
              {/* Message Header */}
              <div className="p-4 pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {msg.parent_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{msg.parent_name || 'ولي أمر'}</p>
                      <p className="text-xs text-gray-400">
                        عن: {msg.student_name} ({msg.student_code})
                        <span className="mx-1">•</span>
                        {msg.parent_phone}
                        <span className="mx-1">•</span>
                        {new Date(msg.created_at).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  {!msg.is_read && <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" title="جديد" />}
                </div>
                <p className="text-gray-700 text-sm mt-3 leading-relaxed">{msg.message}</p>
              </div>

              {/* Reply */}
              {msg.reply ? (
                <div className="bg-green-50 border-t border-green-100 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                      C
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-xs">المركز</p>
                        <span className="text-[10px] text-gray-400">
                          {msg.replied_at ? new Date(msg.replied_at).toLocaleDateString('ar-EG') : ''}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{msg.reply}</p>
                      <button onClick={() => sendWhatsApp(msg.parent_phone, msg.reply)}
                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold mt-1.5 transition-colors">
                        <Phone size={12} />
                        إرسال الرد عبر واتساب
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedMsg?.id === msg.id ? (
                /* Reply Form */
                <div className="bg-gray-50 border-t border-gray-100 px-4 py-3">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="اكتب ردك هنا..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => handleReply(msg.id)} disabled={sending === msg.id}
                      className="flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                      {sending === msg.id ? 'جاري الإرسال...' : <><Send size={12} /> إرسال الرد</>}
                    </button>
                    <button onClick={() => { setSelectedMsg(null); setReplyText(''); }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-3 py-2 transition-colors">
                      إلغاء
                    </button>
                    <button onClick={() => sendWhatsApp(msg.parent_phone, replyText)}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-semibold px-3 py-2 transition-colors mr-auto">
                      <Phone size={12} />
                      واتساب
                    </button>
                  </div>
                </div>
              ) : (
                /* Reply Button */
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <button onClick={() => { setSelectedMsg(msg); setReplyText(''); }}
                    className="flex items-center gap-1.5 text-violet-600 hover:text-violet-700 text-xs font-semibold transition-colors">
                    <MessageSquare size={12} />
                    رد على الرسالة
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
