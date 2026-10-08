import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShoppingBag,
  Receipt,
  Package,
  LayoutDashboard,
  MoreHorizontal,
  Warehouse,
  Users,
  UtensilsCrossed,
  BarChart3,
  CreditCard,
  Settings,
  X,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const BottomNavigation: React.FC = () => {
  const { isAdmin } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/pos', label: 'Bán hàng', icon: ShoppingBag, highlight: true },
    { to: '/orders', label: 'Đơn hàng', icon: Receipt },
    { to: '/products', label: 'Sản phẩm', icon: Package },
  ];

  const moreItems = [
    { to: '/inventory', label: 'Kho hàng', icon: Warehouse, desc: 'Theo dõi tồn kho & điều chỉnh' },
    { to: '/customers', label: 'Khách hàng', icon: Users, desc: 'Danh sách và lịch sử mua hàng' },
    { to: '/tables', label: 'Bàn & Phòng', icon: UtensilsCrossed, desc: 'Quản lý bàn cho quán ăn / cafe' },
    { to: '/reports', label: 'Báo cáo', icon: BarChart3, desc: 'Doanh thu, lợi nhuận, ca bán' },
    { to: '/subscription', label: 'Gói dịch vụ', icon: CreditCard, desc: 'Thời hạn bản quyền & kích hoạt mã' },
    { to: '/profile', label: 'Cài đặt cửa hàng', icon: Settings, desc: 'Thông tin cửa hàng, máy in & QR' },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg px-2 py-1 safe-area-bottom">
        <div className="grid grid-cols-5 items-center justify-around">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors min-h-[52px] ${
                    isActive
                      ? 'text-blue-600 font-bold'
                      : tab.highlight
                      ? 'text-slate-800 font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`relative flex items-center justify-center ${
                        tab.highlight
                          ? 'w-10 h-7 rounded-lg bg-blue-50 text-blue-600'
                          : ''
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                    </div>
                    <span className="text-[10px] mt-0.5 leading-tight text-center">{tab.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors min-h-[52px] ${
              showMoreMenu ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] mt-0.5 leading-tight">Thêm</span>
          </button>
        </div>
      </nav>

      {/* "More" Drawer / Bottom Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Drawer content */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drawer handle & title */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Tính năng mở rộng</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-3 overflow-y-auto divide-y divide-slate-100 space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMoreMenu(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 p-3 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="text-xs text-slate-500 truncate">{item.desc}</div>
                    </div>
                  </NavLink>
                );
              })}

              {/* ONLY IF ADMIN: show Admin link */}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setShowMoreMenu(false)}
                  className="flex items-center gap-3.5 p-3 rounded-xl bg-purple-50 text-purple-800 transition-colors mt-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-purple-900">Khu vực Admin Hệ thống</div>
                    <div className="text-xs text-purple-700 truncate">Quản lý mã kích hoạt & người dùng</div>
                  </div>
                </NavLink>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400">
              DopiPOS • Hộ kinh doanh & F&B
            </div>
          </div>
        </div>
      )}
    </>
  );
};
