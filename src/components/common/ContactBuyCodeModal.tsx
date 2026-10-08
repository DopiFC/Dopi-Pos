import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Phone, Mail, MessageSquare, Facebook, Send, Copy, Check } from 'lucide-react';
import { SystemSettings } from '../../types';

interface ContactBuyCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanName?: string;
}

export const ContactBuyCodeModal: React.FC<ContactBuyCodeModalProps> = ({
  isOpen,
  onClose,
  selectedPlanName
}) => {
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'DopiPOS',
    contactZalo: '0987654321',
    contactFacebook: 'https://facebook.com/dopipos',
    contactMessenger: 'https://m.me/dopipos',
    contactPhone: '0987.654.321',
    contactEmail: 'hotro@dopipos.vn'
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/system-settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings) {
            setSettings(data.settings);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Liên hệ mua Mã kích hoạt DopiPOS" maxWidth="md">
      <div className="space-y-4">
        {selectedPlanName && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Bạn đang quan tâm: <span className="font-semibold">{selectedPlanName}</span>. Vui lòng liên hệ trực tiếp đội ngũ hỗ trợ DopiPOS qua các kênh dưới đây để nhận mã kích hoạt nhanh nhất:
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 text-sm">
          {/* Zalo */}
          {settings.contactZalo && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 bg-white transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                  Zalo
                </div>
                <div>
                  <div className="font-medium text-slate-800">Zalo Hỗ trợ / Mua mã</div>
                  <div className="text-xs text-slate-500">{settings.contactZalo}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.contactZalo, 'zalo')}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1"
                >
                  {copiedKey === 'zalo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'zalo' ? 'Đã chép' : 'Sao chép'}
                </button>
                <a
                  href={`https://zalo.me/${settings.contactZalo.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Mở Zalo
                </a>
              </div>
            </div>
          )}

          {/* Hotline Phone */}
          {settings.contactPhone && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-400 bg-white transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">Hotline tư vấn</div>
                  <div className="text-xs text-slate-500">{settings.contactPhone}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.contactPhone, 'phone')}
                  className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 flex items-center gap-1"
                >
                  {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'phone' ? 'Đã chép' : 'Sao chép'}
                </button>
                <a
                  href={`tel:${settings.contactPhone.replace(/[^0-9]/g, '')}`}
                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                >
                  Gọi ngay
                </a>
              </div>
            </div>
          )}

          {/* Messenger */}
          {settings.contactMessenger && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-purple-400 bg-white transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">Facebook Messenger</div>
                  <div className="text-xs text-slate-500">Nhắn tin trực tiếp với DopiPOS</div>
                </div>
              </div>
              <a
                href={settings.contactMessenger}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Nhắn tin
              </a>
            </div>
          )}

          {/* Facebook Fanpage */}
          {settings.contactFacebook && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-400 bg-white transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Facebook className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">Fanpage Facebook</div>
                  <div className="text-xs text-slate-500">DopiPOS - Phần mềm bán hàng</div>
                </div>
              </div>
              <a
                href={settings.contactFacebook}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                Ghé thăm
              </a>
            </div>
          )}

          {/* Email */}
          {settings.contactEmail && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-slate-800">Email hỗ trợ</div>
                  <div className="text-xs text-slate-500">{settings.contactEmail}</div>
                </div>
              </div>
              <a
                href={`mailto:${settings.contactEmail}`}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
              >
                Gửi mail
              </a>
            </div>
          )}
        </div>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
