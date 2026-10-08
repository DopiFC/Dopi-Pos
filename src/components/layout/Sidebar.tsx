import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Package,
  Layers,
  Warehouse,
  Users,
  UtensilsCrossed,
  BarChart3,
  CreditCard,
  ShieldAlert,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/pos', label: 'Bán hàng (POS)', icon: ShoppingBag, highlight: true },
    { to: '/orders', label: 'Đơn hàng', icon: Receipt },
    { to: '/products', label: 'Sản phẩm', icon: Package },
    { to: '/categories', label: 'Danh mục', icon: Layers },
    { to: '/inventory', label: 'Quản lý kho', icon: Warehouse },
    { to: '/customers', label: 'Khách hàng', icon: Users },
    { to: '/tables', label: 'Bàn & Phòng (F&B)', icon: UtensilsCrossed },
    { to: '/reports', label: 'Báo cáo doanh thu', icon: BarChart3 },
    { to: '/subscription', label: 'Gói dịch vụ', icon: CreditCard },
  ];

  const adminItems = [
    { to: '/admin', label: 'Khu vực Admin', icon: ShieldAlert },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              D
            </div>
            <div>
              <div className="font-bold text-white tracking-tight leading-none text-base">
                Dopi<span className="text-blue-500">POS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">Phiên bản 1.0</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Chức năng chính
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : item.highlight
                      ? 'text-blue-400 hover:bg-slate-800 hover:text-blue-300 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 px-3 pb-1 text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
                Quản trị viên
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-purple-600 text-white'
                          : 'text-purple-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </>
          )}

          <div className="pt-4 px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tài khoản
          </div>
          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Cài đặt cửa hàng</span>
          </NavLink>
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-800 text-xs text-slate-400 text-center">
          DopiPOS Hộ kinh doanh & F&B
        </div>
      </aside>
    </>
  );
};
