import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle,
  KeyRound,
  MessageCircle,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Check,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRemainingDays, formatDateOnly, formatCurrency } from '../../utils/format';
import { ActivateCodeModal } from '../../components/common/ActivateCodeModal';
import { ContactBuyCodeModal } from '../../components/common/ContactBuyCodeModal';

export const Subscription: React.FC = () => {
  const { subscription } = useAuth();
  const subInfo = getRemainingDays(subscription?.endDate);

  const [activateOpen, setActivateOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<'month_1' | 'month_3'>('month_1');
  const [contactOpen, setContactOpen] = useState(false);
  const [selectedPlanForContact, setSelectedPlanForContact] = useState<string>('');

  const plans = [
    {
      id: 'month_1' as const,
      name: 'DopiPOS Hộ kinh doanh – 1 tháng',
      price: 39000,
      days: 30,
      description: 'Phù hợp trải nghiệm bán hàng nhanh, quản lý tồn kho và doanh thu cho hộ kinh doanh nhỏ.',
      features: [
        'Đầy đủ tính năng Bán hàng POS',
        'Quản lý sản phẩm & Topping F&B',
        'Quản lý tồn kho & Xuất nhập kho',
        'Quản lý đơn hàng & In hóa đơn',
        'Quản lý bàn & phòng F&B',
        'Báo cáo doanh thu & xuất Excel',
        'Hỗ trợ kỹ thuật qua Zalo / Hotline'
      ]
    },
    {
      id: 'month_3' as const,
      name: 'DopiPOS Hộ kinh doanh – 3 tháng',
      price: 79000,
      days: 90,
      popular: true,
      description: 'Tiết kiệm chi phí, vận hành ổn định lâu dài cho cửa hàng bán lẻ và quán F&B chuyên nghiệp.',
      features: [
        'Mọi tính năng của gói 1 tháng',
        'Tiết kiệm hơn 30% chi phí',
        'Cộng dồn thời hạn nếu đang còn gói',
        'Ưu tiên hỗ trợ kỹ thuật 24/7',
        'Cập nhật tính năng mới miễn phí',
        'Sao lưu dữ liệu đám mây an toàn'
      ]
    }
  ];

  const handleOpenActivate = (planId: 'month_1' | 'month_3') => {
    setSelectedPlanId(planId);
    setActivateOpen(true);
  };

  const handleOpenContact = (planName: string) => {
    setSelectedPlanForContact(planName);
    setContactOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gói dịch vụ DopiPOS</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gói phần mềm bản quyền chính hãng dành cho hộ kinh doanh, cửa hàng bán lẻ và F&B
        </p>
      </div>

      {/* Current Subscription Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 block">
                Gói hiện tại
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                {subscription?.planName || 'Chưa kích hoạt gói'}
              </h2>
            </div>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                subInfo.isExpired
                  ? 'bg-rose-100 text-rose-800'
                  : subInfo.days <= 5
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {subInfo.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Ngày kích hoạt:</span>
            <span className="font-semibold text-slate-700">
              {formatDateOnly(subscription?.startDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Ngày hết hạn:</span>
            <span className="font-semibold text-slate-700">
              {formatDateOnly(subscription?.endDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Kích hoạt qua mã:</span>
            <span className="font-mono text-slate-500">
              {subscription?.activatedViaCode ? `${subscription.activatedViaCode.slice(0, 4)}...${subscription.activatedViaCode.slice(-4)}` : 'Hệ thống'}
            </span>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-all ${
              plan.popular
                ? 'border-blue-600 ring-2 ring-blue-600/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 right-6 px-3 py-0.5 bg-blue-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wider shadow-xs">
                Được ưa chuộng nhất
              </span>
            )}

            <div>
              <h3 className="font-bold text-base text-slate-900">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>

              <div className="my-5 pb-5 border-b border-slate-100 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-xs text-slate-500">/ {plan.days} ngày</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                {plan.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleOpenActivate(plan.id)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" />
                Nhập mã kích hoạt gói này
              </button>

              <button
                type="button"
                onClick={() => handleOpenContact(plan.name)}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Chưa có mã? Mua mã kích hoạt
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cumulative extension reminder */}
      <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
        <span className="font-bold">Chính sách bảo lưu thời hạn: </span>
        Nếu bạn kích hoạt thêm mã khi gói cũ vẫn còn ngày sử dụng, hệ thống sẽ tự động cộng nối tiếp thời hạn mới vào ngày hết hạn hiện tại mà không làm mất bất kỳ ngày nào!
      </div>

      {/* Modals */}
      <ActivateCodeModal
        isOpen={activateOpen}
        onClose={() => setActivateOpen(false)}
        defaultPlanId={selectedPlanId}
        onOpenContact={() => setContactOpen(true)}
      />

      <ContactBuyCodeModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        selectedPlanName={selectedPlanForContact}
      />
    </div>
  );
};
