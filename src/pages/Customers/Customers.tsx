import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCustomers, saveCustomer, deleteCustomer } from '../../services/storeService';
import { Customer } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const Customers: React.FC = () => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Delete
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await getCustomers(user.uid);
      setCustomers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      address: c.address || '',
      notes: c.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.name.trim() || !formData.phone.trim()) {
      error('Vui lòng nhập Tên và Số điện thoại khách hàng.');
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const id = editingCustomer
        ? editingCustomer.id
        : `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const customerToSave: Customer = {
        id,
        storeId: user.uid,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        totalOrders: editingCustomer ? editingCustomer.totalOrders : 0,
        totalSpent: editingCustomer ? editingCustomer.totalSpent : 0,
        lastOrderAt: editingCustomer ? editingCustomer.lastOrderAt : undefined,
        createdAt: editingCustomer ? editingCustomer.createdAt : nowIso
      };

      await saveCustomer(customerToSave);
      success(editingCustomer ? 'Đã cập nhật khách hàng!' : 'Đã thêm khách hàng mới!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      error('Không thể lưu thông tin khách hàng.');
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomerId) return;
    try {
      await deleteCustomer(deletingCustomerId);
      success('Đã xóa khách hàng.');
      setDeletingCustomerId(null);
      loadData();
    } catch (err) {
      error('Không thể xóa khách hàng.');
    }
  };

  const filtered = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Khách hàng</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lưu danh bạ khách quen, tích lũy số đơn và tổng chi tiêu
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          Thêm khách hàng
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Tên khách hàng</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Địa chỉ / Ghi chú</th>
                <th className="py-3 px-4 text-center">Tổng đơn</th>
                <th className="py-3 px-4 text-right">Tổng chi tiêu</th>
                <th className="py-3 px-4">Lần mua gần nhất</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Đang tải danh sách khách hàng...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Chưa có khách hàng nào.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-sm">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{c.phone}</td>
                    <td className="py-3 px-4 text-slate-500">
                      <div>{c.address || '--'}</div>
                      {c.notes && <div className="text-[11px] text-amber-700 mt-0.5">Note: {c.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {c.totalOrders || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                      {formatCurrency(c.totalSpent || 0)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {c.lastOrderAt ? formatDateTime(c.lastOrderAt) : '--'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCustomerId(c.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Họ và tên khách hàng *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Nguyễn Văn Nam"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Số điện thoại *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="VD: 0987654321"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Địa chỉ giao hàng / cư trú
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="VD: Số 12 ngõ 45 phố Hai Bà Trưng..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Ghi chú sở thích / thói quen
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="VD: Uống ít đá, hay ghé buổi sáng..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {editingCustomer ? 'Lưu thay đổi' : 'Thêm khách hàng'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deletingCustomerId)}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={handleDelete}
        title="Xóa khách hàng"
        message="Bạn có chắc chắn muốn xóa khách hàng này khỏi danh bạ?"
        confirmLabel="Xóa"
      />
    </div>
  );
};
