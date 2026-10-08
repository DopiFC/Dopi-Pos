import React, { useEffect, useState } from 'react';
import {
  Warehouse,
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  History,
  AlertTriangle,
  Package,
  Search,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getProducts,
  getInventoryTransactions,
  adjustInventory
} from '../../services/storeService';
import { Product, InventoryTransaction } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Modal } from '../../components/common/Modal';

export const Inventory: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: Stock Overview vs Transaction Logs
  const [activeTab, setActiveTab] = useState<'stock' | 'logs'>('stock');

  // Search & Filters
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'import' | 'export' | 'adjustment'>('import');
  const [amount, setAmount] = useState<number>(10);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [prods, trans] = await Promise.all([
        getProducts(user.uid),
        getInventoryTransactions(user.uid, 200)
      ]);
      setProducts(prods);
      setTransactions(trans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenAdjust = (p: Product, type: 'import' | 'export' | 'adjustment') => {
    setSelectedProduct(p);
    setAdjustType(type);
    setAmount(type === 'adjustment' ? p.stock : 10);
    setNote('');
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;
    if (amount <= 0 && adjustType !== 'adjustment') {
      error('Số lượng phải lớn hơn 0.');
      return;
    }

    setSubmitting(true);
    try {
      await adjustInventory(
        user.uid,
        selectedProduct,
        adjustType,
        amount,
        note,
        user.uid
      );
      success(
        adjustType === 'import'
          ? `Đã nhập thêm ${amount} ${selectedProduct.unit} cho ${selectedProduct.name}!`
          : adjustType === 'export'
          ? `Đã xuất ${amount} ${selectedProduct.unit} cho ${selectedProduct.name}!`
          : `Đã điều chỉnh tồn kho ${selectedProduct.name} thành ${amount} ${selectedProduct.unit}!`
      );
      setIsAdjustModalOpen(false);
      loadData();
    } catch (err) {
      error('Lỗi khi điều chỉnh tồn kho. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchLowStock = !lowStockOnly || p.stock <= (p.minStockAlert || 10);
    return matchSearch && matchLowStock;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Kho & Tồn kho</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi lượng hàng thực tế, nhập hàng, xuất kho và xem lịch sử biến động kho
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold self-start">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'stock' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Danh sách tồn kho
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'logs' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Biến động kho ({transactions.length})
          </button>
        </div>
      </div>

      {activeTab === 'stock' ? (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm sản phẩm theo tên hoặc SKU..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                lowStockOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Chỉ xem tồn thấp ({products.filter((p) => p.stock <= (p.minStockAlert || 10)).length})
            </button>
          </div>

          {/* Products Stock Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Sản phẩm</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Đơn vị</th>
                    <th className="py-3 px-4 text-right">Giá vốn</th>
                    <th className="py-3 px-4 text-center">Tồn hiện tại</th>
                    <th className="py-3 px-4 text-center">Định mức cảnh báo</th>
                    <th className="py-3 px-4 text-right">Thao tác kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Đang tải dữ liệu tồn kho...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Không có sản phẩm nào.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isLow = p.stock <= (p.minStockAlert || 10);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 text-sm">
                            {p.name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.sku || '--'}</td>
                          <td className="py-3 px-4 text-slate-600">{p.unit}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatCurrency(p.costPrice)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                p.stock === 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}
                            >
                              {p.stock} {p.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-slate-500">
                            {p.minStockAlert || 10}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(p, 'import')}
                                className="px-2 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Nhập thêm hàng"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Nhập
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(p, 'export')}
                                className="px-2 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                                title="Xuất bớt hàng"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                                Xuất
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(p, 'adjustment')}
                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                title="Kiểm kho / Điều chỉnh"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Inventory Transaction Logs */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Sản phẩm</th>
                  <th className="py-3 px-4 text-center">Loại giao dịch</th>
                  <th className="py-3 px-4 text-center">Biến động</th>
                  <th className="py-3 px-4 text-center">Tồn trước &gt; sau</th>
                  <th className="py-3 px-4">Lý do / Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Chưa có lịch sử biến động kho. Các đơn bán hàng và nhập xuất kho sẽ hiển thị tại đây.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(t.createdAt)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{t.productName}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            t.type === 'import'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.type === 'sale'
                              ? 'bg-blue-100 text-blue-800'
                              : t.type === 'cancel_order'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.type === 'import'
                            ? 'Nhập hàng'
                            : t.type === 'export'
                            ? 'Xuất hàng'
                            : t.type === 'sale'
                            ? 'Bán hàng POS'
                            : t.type === 'cancel_order'
                            ? 'Hủy đơn hoàn kho'
                            : 'Điều chỉnh'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={t.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}
                        >
                          {t.quantityChange > 0 ? `+${t.quantityChange}` : t.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {t.previousStock} &rarr; <span className="font-bold text-slate-800">{t.newStock}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{t.note || '--'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={
            adjustType === 'import'
              ? `Nhập kho: ${selectedProduct.name}`
              : adjustType === 'export'
              ? `Xuất kho: ${selectedProduct.name}`
              : `Kiểm kho / Điều chỉnh: ${selectedProduct.name}`
          }
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between">
              <span className="text-slate-500">Tồn kho hiện tại:</span>
              <span className="font-bold text-slate-900">
                {selectedProduct.stock} {selectedProduct.unit}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                {adjustType === 'adjustment'
                  ? 'Số lượng tồn thực tế sau kiểm đếm *'
                  : 'Số lượng thay đổi *'}
              </label>
              <input
                type="number"
                min="0"
                required
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Lý do / Ghi chú
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Nhập lô mới từ nhà cung cấp..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg"
              >
                {submitting ? 'Đang lưu...' : 'Xác nhận cập nhật'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
