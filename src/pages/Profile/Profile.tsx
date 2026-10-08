import React, { useState } from 'react';
import { Store as StoreIcon, User, Phone, MapPin, CreditCard, ShieldCheck, Save, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getRemainingDays, formatDateOnly } from '../../utils/format';
import { ActivateCodeModal } from '../../components/common/ActivateCodeModal';
import { ContactBuyCodeModal } from '../../components/common/ContactBuyCodeModal';

export const Profile: React.FC = () => {
  const { user, profile, store, subscription, isAdmin, logout, refreshProfile } = useAuth();
  const { success, error } = useToast();

  const [storeName, setStoreName] = useState(store?.name || '');
  const [phone, setPhone] = useState(store?.phone || '');
  const [address, setAddress] = useState(store?.address || '');
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [saving, setSaving] = useState(false);

  const [activateOpen, setActivateOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const subInfo = getRemainingDays(subscription?.endDate);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      // Update store
      await updateDoc(doc(db, 'stores', user.uid), {
        name: storeName.trim(),
        phone: phone.trim(),
        address: address.trim()
      });

      // Update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        storeName: storeName.trim(),
        phoneNumber: phone.trim()
      });

      await refreshProfile();
      success('Đã lưu thông tin cửa hàng thành công!');
    } catch (err: any) {
      error('Không thể lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hồ sơ & Cài đặt cửa hàng</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Quản lý thông tin thương hiệu hiển thị trên hóa đơn và trạng thái gói DopiPOS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Subscription Summary Card */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 text-blue-600">
              <CreditCard className="w-5 h-5" />
              <h2 className="font-semibold text-slate-900 text-sm">Gói DopiPOS</h2>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Gói hiện tại:</span>
                <span className="font-bold text-slate-800">
                  {subscription?.planName || 'Chưa có gói kích hoạt'}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 block">Trạng thái:</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                    subInfo.isExpired
                      ? 'bg-rose-100 text-rose-800'
                      : subInfo.days <= 5
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {subInfo.label}
                </span>
              </div>

              {subscription?.endDate && (
                <div>
                  <span className="text-xs text-slate-500 block">Ngày hết hạn:</span>
                  <span className="font-medium text-slate-700">
                    {formatDateOnly(subscription.endDate)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setActivateOpen(true)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Kích hoạt / Gia hạn bằng Mã
                </button>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Liên hệ mua code
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Phân quyền:</span>
              <span className="font-semibold uppercase text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                {profile?.role || (isAdmin ? 'Admin' : 'User')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-800 text-xs truncate max-w-[160px]">{user?.email}</span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full mt-2 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng xuất khỏi hệ thống
            </button>
          </div>
        </div>

        {/* Right: Store Information Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Thông tin cửa hàng & in ấn
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Tên cửa hàng / Thương hiệu *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="VD: Cà phê Phố Cổ"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <StoreIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <p className="text-xs text-slate-400 mt-1">Tên này sẽ hiển thị ở đầu hóa đơn thanh toán.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên người quản lý / Đại diện
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Số điện thoại liên hệ
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0987 654 321"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Địa chỉ cửa hàng
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="VD: 123 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ActivateCodeModal
        isOpen={activateOpen}
        onClose={() => setActivateOpen(false)}
        onOpenContact={() => setContactOpen(true)}
      />

      <ContactBuyCodeModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </div>
  );
};
