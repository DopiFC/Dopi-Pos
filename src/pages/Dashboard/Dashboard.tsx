import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  CreditCard,
  Banknote,
  AlertTriangle,
  TrendingUp,
  Package,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getOrders, getProducts } from '../../services/storeService';
import { Order, Product } from '../../types';
import { formatCurrency, getRemainingDays, formatDateOnly } from '../../utils/format';
import { ActivateCodeModal } from '../../components/common/ActivateCodeModal';
import { ContactBuyCodeModal } from '../../components/common/ContactBuyCodeModal';

export const Dashboard: React.FC = () => {
  const { user, store, subscription } = useAuth();
  const { success, error } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [activateOpen, setActivateOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const subInfo = getRemainingDays(subscription?.endDate);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [ordList, prodList] = await Promise.all([
        getOrders(user.uid, 300),
        getProducts(user.uid)
      ]);
      setOrders(ordList);
      setProducts(prodList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Seed demo data handler
  const handleSeedDemoData = async () => {
    if (!user || !store) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/seed-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, userId: user.uid })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Đã khởi tạo danh mục, sản phẩm mẫu và bàn F&B thành công!');
        await loadDashboardData();
      } else {
        error(data.message || 'Lỗi khởi tạo dữ liệu mẫu');
      }
    } catch (e) {
      error('Không thể kết nối đến máy chủ.');
    } finally {
      setSeeding(false);
    }
  };

  // Filter today's orders
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(
    (o) => o.status === 'completed' && new Date(o.createdAt).toDateString() === todayStr
  );

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const todayCash = todayOrders.reduce((sum, o) => {
    if (o.paymentMethod === 'cash') return sum + o.total;
    if (o.paymentMethod === 'split') return sum + (o.cashAmount || 0);
    return sum;
  }, 0);
  const todayTransfer = todayOrders.reduce((sum, o) => {
    if (o.paymentMethod === 'transfer') return sum + o.total;
    if (o.paymentMethod === 'split') return sum + (o.transferAmount || 0);
    return sum;
  }, 0);

  // Top selling products from all completed orders
  const productSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  orders
    .filter((o) => o.status === 'completed')
    .forEach((order) => {
      order.items.forEach((item) => {
        const cur = productSalesMap.get(item.productId) || {
          name: item.productName,
          qty: 0,
          revenue: 0
        };
        cur.qty += item.quantity;
        cur.revenue += item.subtotal;
        productSalesMap.set(item.productId, cur);
      });
    });

  const topSelling = Array.from(productSalesMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Low stock products
  const lowStockProducts = products
    .filter((p) => p.status === 'active' && p.stock <= (p.minStockAlert || 10))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Expiration warning banner if <= 5 days or expired */}
      {subInfo.isExpired && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 text-rose-800">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <p className="font-bold text-sm">Gói dịch vụ DopiPOS đã hết hạn</p>
              <p className="text-xs text-rose-600">
                Vui lòng kích hoạt mã mới để tiếp tục sử dụng đầy đủ các tính năng bán hàng và báo cáo.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivateOpen(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shrink-0"
          >
            Nhập mã kích hoạt ngay
          </button>
        </div>
      )}

      {!subInfo.isExpired && subInfo.days <= 5 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-bold text-sm">Gói dịch vụ sắp hết hạn ({subInfo.label})</p>
              <p className="text-xs text-amber-700">
                Ngày hết hạn: {formatDateOnly(subscription?.endDate)}. Bạn có thể kích hoạt mã gia hạn ngay mà không mất thời gian còn lại.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActivateOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shrink-0"
          >
            Gia hạn gói
          </button>
        </div>
      )}

      {/* Top Banner: Store Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {store?.name || 'Cửa hàng của tôi'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Trạng thái:</span>
            <span className="font-semibold text-slate-700">{subscription?.planName}</span>
            <span className="text-slate-300">•</span>
            <span
              className={`font-semibold ${
                subInfo.isExpired
                  ? 'text-rose-600'
                  : subInfo.days <= 5
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {subInfo.label}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {products.length === 0 && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDemoData}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              {seeding ? 'Đang tạo mẫu...' : 'Tạo dữ liệu mẫu F&B'}
            </button>
          )}

          <Link
            to="/pos"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Mở màn hình Bán hàng
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Doanh thu hôm nay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Doanh thu hôm nay</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(todayRevenue)}</div>
          <div className="text-xs text-slate-500 mt-1">
            Tổng thu từ {todayOrders.length} đơn hoàn thành
          </div>
        </div>

        {/* Số đơn hôm nay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Số đơn hôm nay</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{todayOrders.length} đơn</div>
          <div className="text-xs text-slate-500 mt-1">Đã hoàn thành và trừ kho</div>
        </div>

        {/* Tiền mặt hôm nay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Tiền mặt</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(todayCash)}</div>
          <div className="text-xs text-slate-500 mt-1">Tiền thu mặt trực tiếp</div>
        </div>

        {/* Chuyển khoản hôm nay */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Chuyển khoản</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(todayTransfer)}</div>
          <div className="text-xs text-slate-500 mt-1">Tài khoản & QR ngân hàng</div>
        </div>
      </div>

      {/* Two columns: Top Selling & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Sản phẩm bán chạy</h2>
            </div>
            <Link to="/reports" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Xem báo cáo
            </Link>
          </div>

          {topSelling.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Chưa có dữ liệu bán hàng. Hãy thực hiện đơn hàng đầu tiên trên màn hình POS!
            </div>
          ) : (
            <div className="space-y-3">
              {topSelling.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{item.qty} lượt</span>
                    <span className="text-slate-400 ml-2">({formatCurrency(item.revenue)})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Cảnh báo tồn kho thấp</h2>
            </div>
            <Link to="/inventory" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Quản lý kho
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-emerald-600 text-xs flex flex-col items-center gap-1">
              <Package className="w-6 h-6 text-emerald-500 mb-1" />
              <span>Tồn kho của tất cả sản phẩm đều an toàn!</span>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                  <div>
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-500">Mã SKU: {p.sku || '--'}</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900 text-xs">
                      Còn {p.stock} {p.unit}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Định mức: {p.minStockAlert || 10}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
