import React from 'react';
import { Modal } from './Modal';
import { CheckCircle2, Printer, Eye, PlusCircle } from 'lucide-react';
import { Order, Invoice } from '../../types';
import { formatCurrency } from '../../utils/format';

interface CheckoutSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  invoice: Invoice | null;
  onPrint: () => void;
  onViewInvoice: () => void;
  onNewOrder: () => void;
}

export const CheckoutSuccessModal: React.FC<CheckoutSuccessModalProps> = ({
  isOpen,
  onClose,
  order,
  invoice,
  onPrint,
  onViewInvoice,
  onNewOrder
}) => {
  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh toán thành công" maxWidth="sm">
      <div className="flex flex-col items-center text-center py-2 space-y-4">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900">Thanh toán thành công!</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Đơn hàng đã được lưu và hệ thống đã xuất hóa đơn kèm tự động trừ tồn kho.
          </p>
        </div>

        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-slate-800">#{order.orderNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Mã hóa đơn:</span>
            <span className="font-mono font-bold text-blue-600">
              #{invoice?.id || `INV-${order.orderNumber.replace('DP-', '')}`}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
            <span className="text-slate-600 font-medium">Tổng thanh toán:</span>
            <span className="font-bold text-emerald-600 text-sm">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Action Buttons as requested */}
        <div className="w-full space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              In hóa đơn
            </button>
            <button
              type="button"
              onClick={onViewInvoice}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              Xem hóa đơn
            </button>
          </div>

          <button
            type="button"
            onClick={onNewOrder}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Đơn hàng mới
          </button>
        </div>
      </div>
    </Modal>
  );
};
