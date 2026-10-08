import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hành động',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  isDestructive = true,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
