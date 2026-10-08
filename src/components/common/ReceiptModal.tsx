import React, { useRef, useState } from 'react';
import { Modal } from './Modal';
import { Printer, CheckCircle2, Download, Share2, Copy, Loader2 } from 'lucide-react';
import { Order, Store } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { downloadReceiptImage } from '../../utils/receiptImage';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  store: Store | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  store
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();
  const { subscription, isPlanActive, isAdmin } = useAuth();
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);

  // Khi người dùng mua gói Hộ Kinh Doanh (hoặc các gói nâng cao / admin), ẩn dòng chữ thương hiệu DopiPOS trên hóa đơn
  const isHouseholdOrPaidPlan = Boolean(
    isAdmin ||
    (isPlanActive && !subscription?.isTrial) ||
    (subscription?.planId && subscription.planId !== 'free' && !subscription?.isTrial) ||
    (subscription?.planName?.toLowerCase().includes('hộ kinh doanh') && !subscription?.isTrial)
  );

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!order) return;
    setIsDownloadingImage(true);
    try {
      await downloadReceiptImage(order, store, { hideBranding: isHouseholdOrPaidPlan });
      success('Đã tải ảnh hóa đơn (.png) độ nét cao về thiết bị thành công!');
    } catch (err: any) {
      console.error('Lỗi xuất ảnh hóa đơn:', err);
      error('Không thể tạo ảnh hóa đơn. Vui lòng thử lại.');
    } finally {
      setIsDownloadingImage(false);
    }
  };

  const handleCopyText = () => {
    if (!order) return;
    const textLines = [
      `=============================`,
      `${store?.name || 'DopiPOS Store'}`,
      `HÓA ĐƠN BÁN HÀNG: ${order.orderNumber}`,
      `Thời gian: ${formatDateTime(order.createdAt)}`,
      order.tableName ? `Bàn: ${order.tableName}` : null,
      order.customerName ? `Khách: ${order.customerName}` : null,
      `-----------------------------`,
      ...order.items.map(
        (i) => `${i.productName} x${i.quantity} = ${formatCurrency(i.subtotal)}`
      ),
      `-----------------------------`,
      `Tạm tính: ${formatCurrency(order.subtotal)}`,
      order.discount > 0 ? `Giảm giá: -${formatCurrency(order.discount)}` : null,
      order.surcharge > 0 ? `Phụ thu: +${formatCurrency(order.surcharge)}` : null,
      `TỔNG TIỀN: ${formatCurrency(order.total)}`,
      `Hình thức: ${
        order.paymentMethod === 'cash'
          ? 'Tiền mặt'
          : order.paymentMethod === 'transfer'
          ? 'Chuyển khoản'
          : 'Kết hợp'
      }`,
      order.amountReceived ? `Khách đưa: ${formatCurrency(order.amountReceived)}` : null,
      order.changeGiven ? `Tiền thừa: ${formatCurrency(order.changeGiven)}` : null,
      `Cảm ơn quý khách!`,
      `=============================`
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(textLines);
    success('Đã sao chép nội dung hóa đơn!');
  };

  const paymentLabel = {
    cash: 'Tiền mặt',
    transfer: 'Chuyển khoản ngân hàng',
    split: 'Tiền mặt + Chuyển khoản'
  }[order.paymentMethod];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Hóa đơn thanh toán" maxWidth="md">
      <div className="space-y-4">
        {/* Printable Receipt Card */}
        <div
          ref={printAreaRef}
          className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs font-mono text-xs text-slate-800 printable-receipt selection:bg-blue-100"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 leading-snug">
              {store?.name || 'DopiPOS Store'}
            </h2>
            {store?.address && <p className="text-slate-500 mt-0.5 text-[11px]">{store.address}</p>}
            {store?.phone && <p className="text-slate-500 text-[11px]">ĐT: {store.phone}</p>}
            <div className="mt-2 text-xs font-bold uppercase text-slate-800 tracking-wide bg-slate-50 py-1 rounded">
              HÓA ĐƠN BÁN HÀNG
            </div>
          </div>

          {/* Order Details */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã hóa đơn:</span>
              <span className="font-bold text-slate-900">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời gian:</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            {order.tableName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Bàn/Phòng:</span>
                <span className="font-semibold text-blue-700">{order.tableName}</span>
              </div>
            )}
            {order.customerName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-medium text-slate-800">{order.customerName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Hình thức phục vụ:</span>
              <span className="font-medium">
                {order.orderType === 'dine_in'
                  ? 'Tại quán'
                  : order.orderType === 'takeaway'
                  ? 'Mang đi'
                  : 'Giao hàng'}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-semibold text-slate-600 pb-1.5 border-b border-slate-200 text-[11px]">
              <span className="col-span-6">Mặt hàng</span>
              <span className="col-span-2 text-center">SL</span>
              <span className="col-span-4 text-right">Thành tiền</span>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-1.5 text-xs">
                  <div className="grid grid-cols-12 items-baseline">
                    <span className="col-span-6 font-semibold text-slate-900 leading-tight">
                      {item.productName}
                    </span>
                    <span className="col-span-2 text-center text-slate-700 font-medium">
                      {item.quantity}
                    </span>
                    <span className="col-span-4 text-right font-bold text-slate-900">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                  {item.selectedToppings && item.selectedToppings.length > 0 && (
                    <div className="text-[10px] text-slate-500 pl-2 mt-0.5">
                      + {item.selectedToppings.map((t) => `${t.name} (${formatCurrency(t.price)})`).join(', ')}
                    </div>
                  )}
                  {item.note && (
                    <div className="text-[10px] text-amber-700 italic pl-2">Ghi chú: {item.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tạm tính:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Giảm giá:</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            {order.surcharge > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Phụ thu:</span>
                <span>+{formatCurrency(order.surcharge)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 pt-1.5 border-t border-slate-200">
              <span>TỔNG THANH TOÁN:</span>
              <span className="text-blue-700 text-base">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment Detail */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-slate-600 text-xs">
            <div className="flex justify-between">
              <span>Phương thức:</span>
              <span className="font-semibold text-slate-800">{paymentLabel}</span>
            </div>
            {order.amountReceived !== undefined && order.amountReceived > 0 && (
              <div className="flex justify-between">
                <span>Khách đưa:</span>
                <span className="font-medium">{formatCurrency(order.amountReceived)}</span>
              </div>
            )}
            {order.changeGiven !== undefined && order.changeGiven > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Tiền thừa trả khách:</span>
                <span>{formatCurrency(order.changeGiven)}</span>
              </div>
            )}
            {order.paymentMethod === 'split' && (
              <div className="text-[11px] text-slate-500 pl-2">
                (Tiền mặt: {formatCurrency(order.cashAmount || 0)} - CK: {formatCurrency(order.transferAmount || 0)})
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-3 text-slate-500 space-y-0.5 text-xs">
            <p className="font-semibold text-slate-700">Cảm ơn quý khách và hẹn gặp lại!</p>
            {!isHouseholdOrPaidPlan && (
              <p className="text-[10px] text-slate-400">Hóa đơn điện tử • DopiPOS</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={isDownloadingImage}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] disabled:opacity-60"
            title="Lưu hóa đơn dưới dạng file ảnh PNG để gửi qua Zalo / Facebook"
          >
            {isDownloadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isDownloadingImage ? 'Đang xuất...' : 'Tải ảnh hóa đơn'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            <span>In (80mm)</span>
          </button>
          <button
            type="button"
            onClick={handleCopyText}
            className="py-2.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <Copy className="w-4 h-4 text-slate-500" />
            <span>Sao chép text</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center min-h-[44px]"
          >
            <span>Đóng</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
