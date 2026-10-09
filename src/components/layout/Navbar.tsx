import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store as StoreIcon,
  ShoppingBag,
  User,
  LogOut,
  ShieldAlert,
  Sparkles,
  Menu,
  X,
  CreditCard,
  ChevronDown,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRemainingDays } from '../../utils/format';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenActivateModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenActivateModal }) => {
  const {
    user,
    profile,
    store,
    subscription,
    isAdmin,
    isAccountLocked,
    isTrialActive,
    trialDaysRemaining,
    isPlanExpired,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const subInfo = getRemainingDays(subscription?.endDate);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: Hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              D
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none">
                Dopi<span className="text-blue-600">POS</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Bán hàng & F&B</span>
            </div>
          </Link>

          {/* Store name badge */}
          {store && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-md text-xs font-medium text-slate-700 ml-3">
              <StoreIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate max-w-[160px]">{store.name}</span>
            </div>
          )}
        </div>

        {/* Center/Right: Realtime sync indicator & Subscription pill & POS quick button & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Live Multi-Device Sync Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Realtime đa thiết bị</span>
          </div>

          {/* Status Bar: Account Locked or Subscription Warning / Pill */}
          <div className={`${isAccountLocked ? 'flex' : 'hidden sm:flex'} items-center`}>
            {isAccountLocked ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 border border-rose-300 text-rose-700 rounded-full text-xs font-bold shadow-xs"
                title="Tài khoản này đã bị khóa bởi Quản trị viên"
              >
                <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Tài khoản của bạn đã bị khoá</span>
              </div>
            ) : isPlanExpired ? (
              <button
                type="button"
                onClick={onOpenActivateModal}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-semibold hover:bg-rose-100 transition-colors"
                title="Gói dùng thử 3 ngày đã hết hạn. Hãy kích hoạt mã để tiếp tục sử dụng tính năng nâng cao."
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Hết hạn dùng thử (3 ngày) - Kích hoạt ngay</span>
              </button>
            ) : isTrialActive ? (
              <button
                type="button"
                onClick={onOpenActivateModal}
                className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-100 transition-colors"
                title="Đang dùng thử Gói Hộ Kinh Doanh (Free 3 ngày)"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Gói Hộ KD (Free 3 ngày): còn {trialDaysRemaining} ngày</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenActivateModal}
                className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-medium transition-colors ${
                  subInfo.days <= 5
                    ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
                title="Bấm để gia hạn hoặc kích hoạt thêm mã"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{subInfo.label}</span>
              </button>
            )}
          </div>

          {/* Big POS Button */}
          <Link
            to="/pos"
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden xs:inline">Bán hàng POS</span>
          </Link>

          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-xs">
                {profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 text-sm divide-y divide-slate-100">
                  <div className="px-4 py-2.5">
                    <p className="font-semibold text-slate-900 truncate">{profile?.displayName || 'Chủ cửa hàng'}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {isAccountLocked ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[11px] font-bold uppercase flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          ĐÃ BỊ KHÓA
                        </span>
                      ) : isAdmin ? (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[11px] font-bold uppercase">
                          ADMIN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[11px] font-medium">
                          USER
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{subInfo.label}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Thông tin cửa hàng
                    </Link>
                    <Link
                      to="/subscription"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      Gói dịch vụ
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-purple-700 hover:bg-purple-50 font-medium"
                      >
                        <ShieldAlert className="w-4 h-4 text-purple-600" />
                        Khu vực Quản trị Admin
                      </Link>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 w-full text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
