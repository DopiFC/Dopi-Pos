import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Printer,
  XCircle,
  Eye,
  Filter,
  DollarSign,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getOrders, cancelOrder, subscribeToOrders } from '../../services/storeService';
import { Order } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const Orders: React.FC = () => {
  const { user, store } = useAuth();
  const { success, error } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday'>('all');

  // Modals
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = async () => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    try {
      setLoading(true);
      const list = await getOrders(storeId, 500);
      setOrders(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    loadData();

    // Realtime listener connects multiple devices simultaneously
    const unsubscribe = subscribeToOrders(storeId, (liveOrders) => {
      setOrders(liveOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, store?.id]);

  const handlePrint = (order: Order) => {
    setViewingOrder(order);
    setIsReceiptOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingOrder || !user) return;
    setIsCancelling(true);
    try {
      await cancelOrder(cancellingOrder, user.uid);
      success(`Đã hủy đơn ${cancellingOrder.orderNumber} và hoàn trả số lượng vào kho!`);
      setCancellingOrder(null);
      loadData();
    } catch (err) {
      error('Không thể hủy đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch =
      !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.tableName?.toLowerCase().includes(search.toLowerCase());

    let matchDate = true;
    const orderDate = new Date(o.createdAt);
    const today = new Date();
    if (dateFilter === 'today') {
      matchDate = orderDate.toDateString() === today.toDateString();
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      matchDate = orderDate.toDateString() === yesterday.toDateString();
    }

    return matchStatus && matchSearch && matchDate;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Đơn hàng</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch sử giao dịch, in lại hóa đơn và xử lý hủy đơn hoàn kho
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã HĐ, tên khách hàng, tên bàn..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="yesterday">Hôm qua</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Đã hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Mã HĐ</th>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Khách hàng / Bàn</th>
                <th className="py-3 px-4">Số món</th>
                <th className="py-3 px-4">Thanh toán</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Đang tải danh sách đơn hàng...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Không tìm thấy đơn hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {o.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {formatDateTime(o.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {o.customerName || 'Khách lẻ'}
                      </div>
                      {o.tableName && (
                        <div className="text-[11px] text-blue-600 font-semibold">
                          {o.tableName}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {o.items.reduce((s, i) => s + i.quantity, 0)} món
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {o.paymentMethod === 'cash'
                          ? 'Tiền mặt'
                          : o.paymentMethod === 'transfer'
                          ? 'Chuyển khoản'
                          : 'Kết hợp'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(o.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          o.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {o.status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrint(o)}
                          className="px-2.5 py-1 text-slate-600 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium transition-colors flex items-center gap-1"
                          title="In lại hóa đơn"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In HĐ</span>
                        </button>
                        {o.status === 'completed' && (
                          <button
                            type="button"
                            onClick={() => setCancellingOrder(o)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Hủy đơn và hoàn kho"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={viewingOrder}
        store={store}
      />

      {/* Confirm Cancel Modal */}
      <ConfirmModal
        isOpen={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        onConfirm={handleConfirmCancel}
        title="Xác nhận hủy đơn hàng"
        message={`Bạn có chắc chắn muốn hủy đơn hàng ${cancellingOrder?.orderNumber}? Số lượng các món trong đơn (${cancellingOrder?.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm) sẽ được hoàn trả tự động vào kho hàng.`}
        confirmLabel="Hủy đơn & Hoàn kho"
        isLoading={isCancelling}
      />
    </div>
  );
};
