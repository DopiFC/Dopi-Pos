import React, { useState } from 'react';
import { Modal } from './Modal';
import { KeyRound, CheckCircle, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface ActivateCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlanId?: 'month_1' | 'month_3';
  onSuccess?: () => void;
  onOpenContact?: () => void;
}

export const ActivateCodeModal: React.FC<ActivateCodeModalProps> = ({
  isOpen,
  onClose,
  defaultPlanId = 'month_1',
  onSuccess,
  onOpenContact
}) => {
  const { user, store, refreshSubscription } = useAuth();
  const { success, error } = useToast();

  const [code, setCode] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'month_1' | 'month_3'>(defaultPlanId);
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Force uppercase and allow only letters and digits
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setCode(val);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !store) return;

    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 15) {
      error('Mã kích hoạt phải có chính xác 15 ký tự (A-Z, 0-9).');
      return;
    }

    setLoading(true);
    setResultMessage(null);

    try {
      const response = await fetch('/api/activation/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: normalized,
          planId: selectedPlan,
          userId: user.uid,
          storeId: store?.id || user.uid
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        success(data.message || 'Kích hoạt thành công!');
        setResultMessage(data.message);
        await refreshSubscription();
        setTimeout(() => {
          setCode('');
          onClose();
          if (onSuccess) onSuccess();
        }, 1200);
        return;
      }

      if (data && !data.success && data.message) {
        error(data.message);
        return;
      }
    } catch {
      // Backend not available, fallback to client Firestore redemption
    }

    // Direct Firestore code redemption fallback
    try {
      const codeRef = doc(db, 'activationCodes', normalized);
      const codeSnap = await getDoc(codeRef);

      if (!codeSnap.exists()) {
        error('Mã kích hoạt không tồn tại trên hệ thống.');
        return;
      }

      const cData = codeSnap.data();
      if (cData.status === 'disabled') {
        error('Mã kích hoạt này hiện đang bị tạm khóa.');
        return;
      }
      if (cData.redeemed) {
        error('Mã kích hoạt này đã được sử dụng trước đó.');
        return;
      }

      const planDays = cData.planId === 'month_3' ? 90 : 30;
      const now = new Date();
      const nowIso = now.toISOString();

      // Read current subscription
      const subRef = doc(db, 'subscriptions', user.uid);
      const subSnap = await getDoc(subRef);
      const currentSub = subSnap.exists() ? subSnap.data() : null;

      const currentEnd = (currentSub?.endDate && new Date(currentSub.endDate) > now)
        ? new Date(currentSub.endDate)
        : now;
      const newEndDate = new Date(currentEnd.getTime() + planDays * 86400000).toISOString();

      await setDoc(codeRef, {
        redeemed: true,
        redeemedBy: user.uid,
        redeemedAt: nowIso,
        status: 'redeemed'
      }, { merge: true });

      const updatedSub = {
        id: user.uid,
        userId: user.uid,
        storeId: store?.id || user.uid,
        planId: cData.planId || selectedPlan,
        planName: cData.planId === 'month_3' ? 'DopiPOS Hộ kinh doanh – 3 tháng' : 'DopiPOS Hộ kinh doanh – 1 tháng',
        status: 'active',
        isTrial: false,
        startDate: currentSub?.startDate || nowIso,
        endDate: newEndDate,
        activatedViaCode: normalized,
        updatedAt: nowIso
      };

      await setDoc(subRef, updatedSub, { merge: true });

      success(`Kích hoạt mã thành công! Gói được gia hạn thêm ${planDays} ngày.`);
      setResultMessage(`Kích hoạt thành công thêm ${planDays} ngày.`);
      await refreshSubscription();
      setTimeout(() => {
        setCode('');
        onClose();
        if (onSuccess) onSuccess();
      }, 1200);
    } catch (err: any) {
      console.error('Redeem error:', err);
      error('Không thể kích hoạt mã lúc này. Vui lòng kiểm tra lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kích hoạt gói dịch vụ DopiPOS" maxWidth="md">
      <form onSubmit={handleActivate} className="space-y-4">
        {/* Plan Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Chọn gói cần kích hoạt
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedPlan('month_1')}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedPlan === 'month_1'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900">Gói 1 tháng (30 ngày)</div>
              <div className="text-sm font-bold text-blue-600 mt-1">39.000 ₫</div>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan('month_3')}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedPlan === 'month_3'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900">Gói 3 tháng (90 ngày)</div>
              <div className="text-sm font-bold text-blue-600 mt-1">79.000 ₫</div>
            </button>
          </div>
        </div>

        {/* Code Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Mã kích hoạt (15 ký tự)
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={code}
              onChange={handleCodeChange}
              placeholder="VD: DP29K8XZ34W9M1Q"
              maxLength={15}
              className="w-full pl-10 pr-20 py-2.5 font-mono text-center tracking-widest text-base uppercase rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <span className="absolute right-3 top-3 text-xs font-medium text-slate-400">
              {code.length}/15
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Mỗi mã chỉ được sử dụng một lần. Nếu tài khoản còn hạn, thời gian mới sẽ được cộng dồn tiếp tục.
          </p>
        </div>

        {resultMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading || code.length !== 15}
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Đang xác thực mã...' : 'Kích hoạt gói ngay'}
          </button>

          {onOpenContact && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenContact();
              }}
              className="w-full py-2 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Chưa có mã? Liên hệ DopiPOS để mua code
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
};
