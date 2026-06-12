import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [confirmResolve, setConfirmResolve] = useState<((v: boolean) => void) | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setConfirmMsg(message);
      setConfirmResolve(() => (v: boolean) => { setConfirmMsg(null); resolve(v); });
    });
  }, []);

  const icons = { success: <CheckCircle size={18} className="text-green-500" />, error: <AlertTriangle size={18} className="text-red-500" />, info: <AlertTriangle size={18} className="text-blue-500" /> };
  const bgColors = { success: 'bg-green-50 border-green-200', error: 'bg-red-50 border-red-200', info: 'bg-blue-50 border-blue-200' };

  return (
    <ToastContext.Provider value={{ show, confirm }}>
      {children}

      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg ${bgColors[t.type]} animate-slide-down min-w-[280px]`}
            style={{ animation: 'slideDown 0.25s ease-out' }}>
            {icons[t.type]}
            <span className="text-sm text-gray-700 flex-1">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>
              <X size={14} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmMsg && (
        <div className="fixed inset-0 bg-black/40 z-[9998] flex items-center justify-center p-4" onClick={() => confirmResolve?.(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center"><AlertTriangle size={20} className="text-red-500" /></div>
              <p className="text-gray-800 font-medium">{confirmMsg}</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => confirmResolve?.(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">إلغاء</button>
              <button onClick={() => confirmResolve?.(true)} className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}
