import React, { useEffect, useState } from 'react';
import { Layers, Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getCategories,
  saveCategory,
  deleteCategory,
  getProducts
} from '../../services/storeService';
import { Category } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const Categories: React.FC = () => {
  const { user, store } = useAuth();
  const { success, error } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);

  // Delete state
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    try {
      setLoading(true);
      const [cats, prods] = await Promise.all([
        getCategories(storeId),
        getProducts(storeId)
      ]);
      setCategories(cats);

      const counts: Record<string, number> = {};
      prods.forEach((p) => {
        counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
      });
      setProductCounts(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, store?.id]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setSortOrder(categories.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setName(c.name);
    setSortOrder(c.sortOrder || 1);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      error('Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const id = editingCategory
        ? editingCategory.id
        : `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const storeId = store?.id || user.uid;
      await saveCategory({
        id,
        storeId,
        name: name.trim(),
        sortOrder: Number(sortOrder) || 1,
        createdAt: editingCategory ? editingCategory.createdAt : nowIso
      });

      success(editingCategory ? 'Đã cập nhật danh mục!' : 'Đã thêm danh mục mới!');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      error('Không thể lưu danh mục.');
    }
  };

  const handleDelete = async () => {
    if (!deletingCatId) return;
    try {
      await deleteCategory(deletingCatId);
      success('Đã xóa danh mục thành công.');
      setDeletingCatId(null);
      loadData();
    } catch (err) {
      error('Không thể xóa danh mục.');
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Danh mục</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân loại hàng hóa, đồ uống giúp nhân viên POS tìm món nhanh chóng
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          Thêm danh mục mới
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-16 text-center">Thứ tự</th>
              <th className="py-3 px-4">Tên danh mục</th>
              <th className="py-3 px-4 text-center">Số sản phẩm</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Đang tải danh mục...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  Chưa có danh mục nào. Hãy bấm "Thêm danh mục mới"!
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-slate-400">
                    {c.sortOrder || 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                      {productCounts[c.id] || 0} món
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(c.id)}
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

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        maxWidth="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Tên danh mục *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cà phê, Trà hoa quả, Đồ ăn..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Thứ tự ưu tiên hiển thị
            </label>
            <input
              type="number"
              min="1"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 1)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Số nhỏ hơn sẽ hiển thị trước trên thanh lọc POS.</p>
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
              {editingCategory ? 'Lưu thay đổi' : 'Thêm danh mục'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={Boolean(deletingCatId)}
        onClose={() => setDeletingCatId(null)}
        onConfirm={handleDelete}
        title="Xóa danh mục"
        message="Bạn có chắc chắn muốn xóa danh mục này? Các sản phẩm thuộc danh mục sẽ không bị mất."
        confirmLabel="Xóa"
      />
    </div>
  );
};
