import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  Download,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Banknote,
  XCircle,
  Package,
  AlertTriangle,
  Scale,
  MinusCircle,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Receipt,
  FileSpreadsheet,
  PieChart,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getOrders,
  getProducts,
  getCategories,
  getExpenses,
  saveExpense,
  deleteExpense
} from '../../services/storeService';
import { Order, Product, Category, ExpenseRecord } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Modal } from '../../components/common/Modal';

export const Reports: React.FC = () => {
  const { user, store, canAccessAdvancedFeatures } = useAuth();
  const { success, error } = useToast();

  // Tab: Revenue overview vs Profit & Loss (P&L)
  const [reportTab, setReportTab] = useState<'sales' | 'pnl'>('sales');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Time range selector
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | '7days' | '30days' | 'custom'>('7days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<{
    category: 'rent' | 'utilities' | 'salary' | 'packaging' | 'maintenance' | 'marketing' | 'other';
    title: string;
    amount: number;
    date: string;
    note: string;
  }>({
    category: 'utilities',
    title: '',
    amount: 500000,
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const loadAllData = async () => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    try {
      setLoading(true);
      const [ordList, prodList, catList, expList] = await Promise.all([
        getOrders(storeId, 1500),
        getProducts(storeId),
        getCategories(storeId),
        getExpenses(storeId)
      ]);
      setOrders(Array.isArray(ordList) ? ordList : []);
      setProducts(Array.isArray(prodList) ? prodList : []);
      setCategories(Array.isArray(catList) ? catList : []);
      setExpenses(Array.isArray(expList) ? expList : []);
    } catch (e) {
      console.error('Error loading reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user, store?.id]);

  // Map product cost prices
  const productCostMap = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      map.set(p.id, Number(p.costPrice) || 0);
    });
    return map;
  }, [products]);

  // Product names map
  const productNameMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      map.set(p.id, p.name);
    });
    return map;
  }, [products]);

  // Filter orders by range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);

      if (timeRange === 'today') {
        return orderDate >= todayStart;
      }
      if (timeRange === 'yesterday') {
        const yStart = new Date(todayStart);
        yStart.setDate(yStart.getDate() - 1);
        return orderDate >= yStart && orderDate < todayStart;
      }
      if (timeRange === '7days') {
        const d7 = new Date(todayStart);
        d7.setDate(d7.getDate() - 6);
        return orderDate >= d7;
      }
      if (timeRange === '30days') {
        const d30 = new Date(todayStart);
        d30.setDate(d30.getDate() - 29);
        return orderDate >= d30;
      }
      if (timeRange === 'custom') {
        if (!customStart) return true;
        const start = new Date(customStart);
        const end = customEnd ? new Date(customEnd + 'T23:59:59') : now;
        return orderDate >= start && orderDate <= end;
      }
      return true;
    });
  }, [orders, timeRange, customStart, customEnd]);

  // Filter expenses by the same time range
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return expenses.filter((e) => {
      const expDate = new Date(e.date);

      if (timeRange === 'today') {
        return expDate >= todayStart;
      }
      if (timeRange === 'yesterday') {
        const yStart = new Date(todayStart);
        yStart.setDate(yStart.getDate() - 1);
        return expDate >= yStart && expDate < todayStart;
      }
      if (timeRange === '7days') {
        const d7 = new Date(todayStart);
        d7.setDate(d7.getDate() - 6);
        return expDate >= d7;
      }
      if (timeRange === '30days') {
        const d30 = new Date(todayStart);
        d30.setDate(d30.getDate() - 29);
        return expDate >= d30;
      }
      if (timeRange === 'custom') {
        if (!customStart) return true;
        const start = new Date(customStart);
        const end = customEnd ? new Date(customEnd + 'T23:59:59') : now;
        return expDate >= start && expDate <= end;
      }
      return true;
    });
  }, [expenses, timeRange, customStart, customEnd]);

  // Completed & Cancelled orders breakdown
  const completedOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'completed'),
    [filteredOrders]
  );
  const cancelledOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === 'cancelled'),
    [filteredOrders]
  );

  // 1. REVENUE CALCULATIONS
  const totalRevenue = useMemo(
    () => completedOrders.reduce((s, o) => s + o.total, 0),
    [completedOrders]
  );
  const cashRevenue = useMemo(
    () =>
      completedOrders.reduce((s, o) => {
        if (o.paymentMethod === 'cash') return s + o.total;
        if (o.paymentMethod === 'split') return s + (o.cashAmount || 0);
        return s;
      }, 0),
    [completedOrders]
  );
  const transferRevenue = useMemo(
    () =>
      completedOrders.reduce((s, o) => {
        if (o.paymentMethod === 'transfer') return s + o.total;
        if (o.paymentMethod === 'split') return s + (o.transferAmount || 0);
        return s;
      }, 0),
    [completedOrders]
  );

  // 2. PROFIT & LOSS (P&L) CORE CALCULATIONS
  // Total Cost of Goods Sold (COGS) based on product costPrice (which comes directly from raw ingredient quantification!)
  const totalCOGS = useMemo(() => {
    let cost = 0;
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const unitCost = productCostMap.get(item.productId) || 0;
        cost += unitCost * item.quantity;
      });
    });
    return cost;
  }, [completedOrders, productCostMap]);

  // Gross Profit = Total Revenue - COGS
  const grossProfit = useMemo(() => {
    return totalRevenue - totalCOGS;
  }, [totalRevenue, totalCOGS]);

  // Gross Margin (%)
  const grossMargin = useMemo(() => {
    return totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  }, [grossProfit, totalRevenue]);

  // Total Operating Expenses (OPEX)
  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // Net Profit (Lợi nhuận ròng - Lãi thực tế của cửa hàng)
  const netProfit = useMemo(() => {
    return grossProfit - totalExpenses;
  }, [grossProfit, totalExpenses]);

  // Net Margin (%)
  const netMargin = useMemo(() => {
    return totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  }, [netProfit, totalRevenue]);

  // Product Sales & Profit Breakdown
  const productProfitability = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; qty: number; revenue: number; cogs: number; profit: number }
    >();

    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const cur = map.get(item.productId) || {
          id: item.productId,
          name: item.productName || productNameMap.get(item.productId) || 'Mặt hàng',
          qty: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        };
        const unitCost = productCostMap.get(item.productId) || 0;
        const itemCost = unitCost * item.quantity;

        cur.qty += item.quantity;
        cur.revenue += item.subtotal;
        cur.cogs += itemCost;
        cur.profit += item.subtotal - itemCost;
        map.set(item.productId, cur);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [completedOrders, productCostMap, productNameMap]);

  // Sales by Category
  const categoryPerformance = useMemo(() => {
    const pCatMap = new Map<string, string>();
    products.forEach((p) => pCatMap.set(p.id, p.categoryName || 'Khác'));

    const catMap = new Map<string, { name: string; revenue: number; qty: number }>();
    completedOrders.forEach((order) => {
      order.items.forEach((item) => {
        const catName = pCatMap.get(item.productId) || 'Khác';
        const cur = catMap.get(catName) || { name: catName, revenue: 0, qty: 0 };
        cur.qty += item.quantity;
        cur.revenue += item.subtotal;
        catMap.set(catName, cur);
      });
    });
    return Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [completedOrders, products]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    const labelMap: Record<string, string> = {
      rent: 'Mặt bằng',
      utilities: 'Điện & Nước',
      salary: 'Lương nhân viên',
      packaging: 'Bao bì & Vật tư',
      maintenance: 'Sửa chữa & Bảo trì',
      marketing: 'Tiếp thị & Quảng cáo',
      other: 'Chi phí khác'
    };

    filteredExpenses.forEach((e) => {
      const label = labelMap[e.category] || 'Chi phí khác';
      map.set(label, (map.get(label) || 0) + e.amount);
    });

    return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
  }, [filteredExpenses]);

  // Handle Add Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!expenseForm.title.trim()) {
      error('Vui lòng nhập tên khoản chi.');
      return;
    }
    if (expenseForm.amount <= 0) {
      error('Số tiền chi phải lớn hơn 0.');
      return;
    }

    try {
      const storeId = store?.id || user.uid;
      const nowIso = new Date().toISOString();
      const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const categoryLabels: Record<string, string> = {
        rent: 'Mặt bằng',
        utilities: 'Điện & Nước',
        salary: 'Lương nhân sự',
        packaging: 'Bao bì đóng gói',
        maintenance: 'Bảo trì sửa chữa',
        marketing: 'Tiếp thị',
        other: 'Chi phí khác'
      };

      const record: ExpenseRecord = {
        id,
        storeId,
        category: expenseForm.category,
        categoryName: categoryLabels[expenseForm.category] || 'Khác',
        title: expenseForm.title.trim(),
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        note: expenseForm.note.trim(),
        createdBy: user.uid,
        createdAt: nowIso
      };

      await saveExpense(record);
      setExpenses((prev) => [record, ...prev]);
      success('Đã ghi nhận phiếu chi thành công!');
      setIsExpenseModalOpen(false);
      setExpenseForm({
        category: 'utilities',
        title: '',
        amount: 200000,
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
    } catch (err: any) {
      error(err?.message || 'Không thể lưu phiếu chi.');
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    try {
      await deleteExpense(expId);
      setExpenses((prev) => prev.filter((e) => e.id !== expId));
      success('Đã xóa phiếu chi thành công.');
    } catch (err) {
      error('Lỗi khi xóa phiếu chi.');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!canAccessAdvancedFeatures) {
      error('Gói dùng thử 3 ngày của bạn đã hết hạn. Vui lòng kích hoạt gói để xuất báo cáo.');
      return;
    }

    if (reportTab === 'sales') {
      const headers = ['Mã đơn', 'Thời gian', 'Khách hàng', 'Bàn', 'Hình thức', 'Thanh toán', 'Tổng tiền (VNĐ)', 'Trạng thái'];
      const rows = filteredOrders.map((o) => [
        o.orderNumber,
        `"${formatDateTime(o.createdAt)}"`,
        `"${o.customerName || 'Khách lẻ'}"`,
        `"${o.tableName || '--'}"`,
        o.orderType,
        o.paymentMethod,
        o.total,
        o.status
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `DopiPOS_BaoCao_DoanhThu_${timeRange}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Export P&L Report
      const pnlSummary = [
        ['BÁO CÁO KẾT QUẢ KINH DOANH (LÃI / LỖ)', ''],
        ['Khoảng thời gian', timeRange],
        ['', ''],
        ['1. TỔNG DOANH THU THUẦN', totalRevenue],
        ['2. GIÁ VỐN HÀNG BÁN (COGS)', totalCOGS],
        ['3. LỢI NHUẬN GỘP (1 - 2)', grossProfit],
        ['Tỷ suất lợi nhuận gộp (%)', `${grossMargin}%`],
        ['4. CHI PHÍ VẬN HÀNH / HOẠT ĐỘNG (OPEX)', totalExpenses],
        ['5. LỢI NHUẬN RÒNG (LÃI THỰC TẾ) (3 - 4)', netProfit],
        ['Tỷ suất sinh lời ròng (%)', `${netMargin}%`],
        ['', ''],
        ['CHI TIẾT LỢI NHUẬN THEO MẶT HÀNG', ''],
        ['Mặt hàng', 'Số lượng bán', 'Doanh thu (VNĐ)', 'Giá vốn (VNĐ)', 'Lợi nhuận (VNĐ)', 'Biên lãi (%)']
      ];

      const itemRows = productProfitability.map((p) => [
        `"${p.name}"`,
        p.qty,
        p.revenue,
        p.cogs,
        p.profit,
        `${p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0}%`
      ]);

      const csvContent =
        'data:text/csv;charset=utf-8,\uFEFF' +
        [...pnlSummary.map((r) => r.join(',')), ...itemRows.map((r) => r.join(','))].join('\n');

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `DopiPOS_BaoCao_LaiLo_PnL_${timeRange}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Báo cáo Doanh thu & Báo cáo Lãi / Lỗ
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Đánh giá sức khỏe tài chính, giá vốn định lượng và phân tích tình hình kinh doanh có lời hay không
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {reportTab === 'pnl' && (
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Ghi nhận chi phí (Phiếu chi)
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel / CSV
          </button>
        </div>
      </div>

      {/* Trial Expired Alert */}
      {!canAccessAdvancedFeatures && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Gói dùng thử 3 ngày đã hết hạn. Tính năng xuất báo cáo chuyên sâu và các tùy chỉnh nâng cao đang bị tạm khóa.
            </span>
          </div>
          <Link
            to="/subscription"
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shrink-0 shadow-xs"
          >
            Kích hoạt gói ngay
          </Link>
        </div>
      )}

      {/* Modern Switcher: Doanh thu vs Lãi/Lỗ */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-md text-xs font-semibold">
        <button
          type="button"
          onClick={() => setReportTab('sales')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            reportTab === 'sales'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Doanh thu & Bán hàng</span>
        </button>

        <button
          type="button"
          onClick={() => setReportTab('pnl')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            reportTab === 'pnl'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Báo cáo Lãi / Lỗ (P&L)</span>
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              timeRange === 'today' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('yesterday')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              timeRange === 'yesterday' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Hôm qua
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              timeRange === '7days' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              timeRange === '30days' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            30 ngày qua
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('custom')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              timeRange === 'custom' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Tùy chọn
          </button>
        </div>

        {timeRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            />
            <span>đến</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
            />
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: BÁO CÁO DOANH THU & BÁN HÀNG */}
      {/* =================================================================== */}
      {reportTab === 'sales' && (
        <div className="space-y-6">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doanh thu */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Tổng doanh thu</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">Từ {completedOrders.length} đơn hoàn thành</div>
            </div>

            {/* Tiền mặt */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Thu tiền mặt</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Banknote className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(cashRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">
                {totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% tổng doanh thu
              </div>
            </div>

            {/* Chuyển khoản */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Thu chuyển khoản</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(transferRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">
                {totalRevenue > 0 ? Math.round((transferRevenue / totalRevenue) * 100) : 0}% tổng doanh thu
              </div>
            </div>

            {/* Đơn hủy */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Đơn bị hủy</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{cancelledOrders.length} đơn</div>
              <div className="text-xs text-slate-500 mt-1">Đã hoàn trả số lượng vào kho</div>
            </div>
          </div>

          {/* Two columns: Performance by Product & by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Doanh thu theo sản phẩm */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Doanh thu theo Sản phẩm
              </h2>
              {productProfitability.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Chưa có dữ liệu bán hàng trong khoảng thời gian này.
                </div>
              ) : (
                <div className="space-y-3">
                  {productProfitability.slice(0, 8).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(p.revenue)}</span>
                        <span className="text-slate-400 ml-2">({p.qty} phần)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Doanh thu theo danh mục */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Doanh thu theo Danh mục
              </h2>
              {categoryPerformance.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Chưa có dữ liệu bán hàng trong khoảng thời gian này.
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryPerformance.map((c, idx) => {
                    const percent = totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{c.name}</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(c.revenue)} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: BÁO CÁO LÃI / LỖ (PROFIT & LOSS STATEMENT - P&L) */}
      {/* =================================================================== */}
      {reportTab === 'pnl' && (
        <div className="space-y-6">
          {/* Health Status Assessment Banner */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              netProfit > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : netProfit < 0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                  netProfit > 0
                    ? 'bg-emerald-600 text-white'
                    : netProfit < 0
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-500 text-white'
                }`}
              >
                {netProfit > 0 ? '✓' : netProfit < 0 ? '!' : '='}
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {netProfit > 0
                    ? `🎉 TÌNH HÌNH KINH DOANH: ĐANG CÓ LÃI (+${formatCurrency(netProfit)})`
                    : netProfit < 0
                    ? `⚠️ TÌNH HÌNH KINH DOANH: ĐANG BỊ LỖ (-${formatCurrency(Math.abs(netProfit))})`
                    : '⚖️ TÌNH HÌNH KINH DOANH: HÒA VỐN (0 ₫)'}
                </h3>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {netProfit > 0
                    ? `Cửa hàng của bạn đang sinh lời rất tốt với tỷ suất lợi nhuận ròng đạt ${netMargin}%. Hãy duy trì chi phí định lượng và mở rộng doanh số bán hàng!`
                    : netProfit < 0
                    ? `Doanh thu chưa đủ bù đắp giá vốn định lượng và chi phí vận hành (${formatCurrency(totalExpenses)}). Hãy tối ưu lại tiền điện nước, nhân sự hoặc tăng tỷ suất lãi từng món.`
                    : 'Doanh thu thu về vừa đủ trang trải toàn bộ chi phí vốn hàng bán và chi phí hoạt động.'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[11px] opacity-75">Tỷ suất sinh lời ròng:</div>
              <div className="text-xl font-black font-mono">{netMargin}%</div>
            </div>
          </div>

          {/* 5 Core Financial Indicator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Doanh thu thuần */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                1. Doanh thu thuần
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</div>
              <div className="text-[10px] text-slate-400 mt-1">{completedOrders.length} đơn hoàn thành</div>
            </div>

            {/* 2. Giá vốn COGS */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>2. Giá vốn (COGS)</span>
                <span className="text-rose-500 font-bold">-</span>
              </div>
              <div className="text-xl font-bold text-rose-600 mt-1">{formatCurrency(totalCOGS)}</div>
              <div className="text-[10px] text-slate-400 mt-1">Từ định lượng NVL đã bán</div>
            </div>

            {/* 3. Lợi nhuận gộp */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>3. Lợi nhuận gộp</span>
                <span className="text-blue-500 font-bold font-mono text-[10px]">({grossMargin}%)</span>
              </div>
              <div className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(grossProfit)}</div>
              <div className="text-[10px] text-slate-400 mt-1">Doanh thu - Giá vốn</div>
            </div>

            {/* 4. Chi phí vận hành */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>4. Chi phí vận hành</span>
                <span className="text-purple-500 font-bold">-</span>
              </div>
              <div className="text-xl font-bold text-purple-700 mt-1">{formatCurrency(totalExpenses)}</div>
              <div className="text-[10px] text-slate-400 mt-1">{filteredExpenses.length} khoản chi phí</div>
            </div>

            {/* 5. Lãi Ròng (Net Profit) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs ring-1 ring-emerald-500/30">
              <div className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>5. LÃI RÒNG (NET)</span>
                <span className="text-emerald-600 font-bold font-mono text-[10px]">({netMargin}%)</span>
              </div>
              <div
                className={`text-xl font-black mt-1 ${
                  netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {netProfit >= 0 ? `+${formatCurrency(netProfit)}` : `-${formatCurrency(Math.abs(netProfit))}`}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Tiền lời thực tế thu về</div>
            </div>
          </div>

          {/* Standard Financial Statement Table (Bảng cân đối Doanh thu - Chi phí - Lợi nhuận) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Bảng Cân đối Kết quả Kinh doanh (P&L Summary)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Báo cáo chi tiết theo chuẩn kế toán quản trị cho hộ kinh doanh & chuỗi F&B
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {/* Row 1: Doanh thu bán hàng */}
              <div className="p-3.5 flex items-center justify-between bg-slate-50/60 font-semibold text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  <span>DOANH THU THUẦN TỪ BÁN HÀNG</span>
                </div>
                <span className="font-bold font-mono text-sm">{formatCurrency(totalRevenue)}</span>
              </div>

              {/* Row 2: Giá vốn hàng bán */}
              <div className="p-3.5 flex items-center justify-between text-slate-700 pl-8">
                <div className="flex items-center gap-2">
                  <span className="text-rose-500 font-bold">(-)</span>
                  <span>Giá vốn hàng bán (COGS - Nguyên vật liệu cấu thành đã tiêu hao)</span>
                </div>
                <span className="font-mono text-rose-600 font-bold">-{formatCurrency(totalCOGS)}</span>
              </div>

              {/* Row 3: Lợi nhuận gộp */}
              <div className="p-3.5 flex items-center justify-between bg-blue-50/40 font-bold text-blue-900 pl-6 border-t border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    =
                  </span>
                  <span>LỢI NHUẬN GỘP (GROSS PROFIT)</span>
                  <span className="text-xs font-normal text-blue-600 ml-1">
                    (Biên lãi gộp: {grossMargin}%)
                  </span>
                </div>
                <span className="font-mono text-base text-blue-700">{formatCurrency(grossProfit)}</span>
              </div>

              {/* Row 4: Chi phí hoạt động */}
              <div className="p-3.5 flex items-center justify-between bg-slate-50/60 font-semibold text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  <span>CHI PHÍ VẬN HÀNH & HOẠT ĐỘNG (OPEX)</span>
                </div>
                <span className="font-bold font-mono text-sm text-purple-700">
                  -{formatCurrency(totalExpenses)}
                </span>
              </div>

              {/* Operating Expenses breakdown rows */}
              {expenseByCategory.map((exp, idx) => (
                <div key={idx} className="py-2 px-8 flex items-center justify-between text-slate-600 text-[11px]">
                  <span>• {exp.name}</span>
                  <span className="font-mono">-{formatCurrency(exp.amount)}</span>
                </div>
              ))}

              {/* Row 5: LỢI NHUẬN RÒNG (NET PROFIT) */}
              <div
                className={`p-4 flex items-center justify-between font-black text-sm border-t-2 ${
                  netProfit >= 0
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950'
                    : 'bg-rose-50/80 border-rose-500 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-lg text-white flex items-center justify-center text-xs ${
                      netProfit >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    ★
                  </span>
                  <span className="text-base tracking-wide">
                    LỢI NHUẬN THUẦN (LÃI / LỖ RÒNG TRONG KỲ):
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-300">
                    Tỷ suất: {netMargin}%
                  </span>
                </div>
                <span className="font-mono text-xl">
                  {netProfit >= 0 ? `+${formatCurrency(netProfit)}` : `-${formatCurrency(Math.abs(netProfit))}`}
                </span>
              </div>
            </div>
          </div>

          {/* Product Profitability Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Hiệu quả Lợi nhuận theo từng Món (Product Profit Breakdown)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Xác định món nào mang lại lợi nhuận cao nhất để đẩy mạnh khuyến mãi hoặc điều chỉnh công thức
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Tên món</th>
                    <th className="py-3 px-4 text-center">Đã bán</th>
                    <th className="py-3 px-4 text-right">Doanh thu mang về</th>
                    <th className="py-3 px-4 text-right">Giá vốn COGS</th>
                    <th className="py-3 px-4 text-right">Lợi nhuận đóng góp</th>
                    <th className="py-3 px-4 text-center">Tỷ suất (%)</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productProfitability.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Chưa có dữ liệu bán hàng trong kỳ này.
                      </td>
                    </tr>
                  ) : (
                    productProfitability.map((p) => {
                      const margin = p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-slate-700">
                            {p.qty}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                            {formatCurrency(p.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600">
                            {formatCurrency(p.cogs)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            +{formatCurrency(p.profit)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span
                              className={
                                margin >= 65
                                  ? 'text-emerald-700'
                                  : margin >= 45
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }
                            >
                              {margin}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {margin >= 65 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Siêu lợi nhuận
                              </span>
                            ) : margin >= 45 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                Lợi nhuận ổn
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Biên lãi mỏng
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operating Expenses Table & Manager */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Danh sách Phiếu chi Chi phí Hoạt động ({filteredExpenses.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các khoản chi phí thực tế (Mặt bằng, Điện nước, Lương, Khác) trong kỳ này
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Thêm phiếu chi
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Ngày chi</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4">Nội dung / Diễn giải</th>
                    <th className="py-3 px-4 text-right">Số tiền (₫)</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Chưa có phiếu chi nào trong khoảng thời gian này. Bấm "Thêm phiếu chi" để ghi nhận các chi phí thực tế!
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-600">{exp.date}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">
                            {exp.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{exp.title}</div>
                          {exp.note && <div className="text-[11px] text-slate-400">{exp.note}</div>}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-purple-800">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Xóa phiếu chi này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD OPERATING EXPENSE */}
      {/* =================================================================== */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Ghi nhận Chi phí Hoạt động (Phiếu chi)"
        maxWidth="md"
      >
        <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold uppercase text-slate-700 block mb-1">
              Danh mục chi phí *
            </label>
            <select
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="utilities">Tiền Điện & Nước</option>
              <option value="rent">Tiền Thuê Mặt bằng / Cửa hàng</option>
              <option value="salary">Lương Nhân viên / Phụ cấp</option>
              <option value="packaging">Bao bì, Ly nắp & Túi mang đi</option>
              <option value="maintenance">Bảo trì & Sửa chữa thiết bị</option>
              <option value="marketing">Quảng cáo & Khuyến mại</option>
              <option value="other">Chi phí hoạt động khác</option>
            </select>
          </div>

          <div>
            <label className="font-semibold uppercase text-slate-700 block mb-1">
              Tên khoản chi / Nội dung *
            </label>
            <input
              type="text"
              required
              value={expenseForm.title}
              onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
              placeholder="VD: Tiền điện tháng 10, Tiền nước, Lương ca sáng..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Số tiền chi (₫) *
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={expenseForm.amount || ''}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) || 0 })}
                placeholder="VD: 500000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Ngày phát sinh *
              </label>
              <input
                type="date"
                required
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold uppercase text-slate-700 block mb-1">
              Ghi chú thêm (Tùy chọn)
            </label>
            <input
              type="text"
              value={expenseForm.note}
              onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
              placeholder="Người nhận, hóa đơn đính kèm..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs"
            >
              Lưu phiếu chi
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
