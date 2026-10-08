import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Plus,
  Edit,
  Trash2,
  ShoppingBag,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getTables,
  getTableAreas,
  saveTable,
  deleteTable,
  saveTableArea,
  updateTableStatus,
  subscribeToTables
} from '../../services/storeService';
import { Table, TableArea, TableStatus } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const Tables: React.FC = () => {
  const { user, store } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Table Modal
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableName, setTableName] = useState('');
  const [tableAreaId, setTableAreaId] = useState('');
  const [tableCapacity, setTableCapacity] = useState<number>(4);

  // Area Modal
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [areaName, setAreaName] = useState('');

  // Delete
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    try {
      setLoading(true);
      const [tbls, ars] = await Promise.all([
        getTables(storeId),
        getTableAreas(storeId)
      ]);
      setTables(tbls);
      setAreas(ars);
      if (ars.length > 0 && !tableAreaId) {
        setTableAreaId(ars[0].id);
      }
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

    // Real-time table listener across multiple waiter devices
    const unsubscribe = subscribeToTables(storeId, (liveTables) => {
      setTables(liveTables);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, store?.id]);

  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableName(`Bàn ${tables.length + 1}`);
    setTableAreaId(areas[0]?.id || '');
    setTableCapacity(4);
    setIsTableModalOpen(true);
  };

  const handleOpenEditTable = (t: Table) => {
    setEditingTable(t);
    setTableName(t.name);
    setTableAreaId(t.areaId);
    setTableCapacity(t.capacity || 4);
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!tableName.trim()) {
      error('Vui lòng nhập tên bàn.');
      return;
    }

    try {
      const selectedArea = areas.find((a) => a.id === tableAreaId);
      const nowIso = new Date().toISOString();
      const id = editingTable
        ? editingTable.id
        : `tbl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const tableToSave: Table = {
        id,
        storeId: user.uid,
        name: tableName.trim(),
        areaId: tableAreaId,
        areaName: selectedArea ? selectedArea.name : 'Chung',
        status: editingTable ? editingTable.status : 'available',
        currentOrderId: editingTable ? editingTable.currentOrderId : null,
        capacity: Number(tableCapacity) || 4,
        createdAt: editingTable ? editingTable.createdAt : nowIso
      };

      await saveTable(tableToSave);
      success(editingTable ? 'Đã cập nhật bàn!' : 'Đã thêm bàn mới!');
      setIsTableModalOpen(false);
      loadData();
    } catch (err) {
      error('Không thể lưu thông tin bàn.');
    }
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!areaName.trim()) {
      error('Vui lòng nhập tên khu vực.');
      return;
    }

    try {
      const id = `area_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await saveTableArea({
        id,
        storeId: user.uid,
        name: areaName.trim(),
        sortOrder: areas.length + 1,
        createdAt: new Date().toISOString()
      });
      success('Đã thêm khu vực mới!');
      setAreaName('');
      setIsAreaModalOpen(false);
      loadData();
    } catch (err) {
      error('Không thể lưu khu vực.');
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingTableId) return;
    try {
      await deleteTable(deletingTableId);
      success('Đã xóa bàn.');
      setDeletingTableId(null);
      loadData();
    } catch (err) {
      error('Không thể xóa bàn.');
    }
  };

  const handleToggleTableStatus = async (table: Table) => {
    const nextStatus: TableStatus =
      table.status === 'available'
        ? 'occupied'
        : table.status === 'occupied'
        ? 'bill_printed'
        : 'available';

    try {
      await updateTableStatus(table.id, nextStatus);
      success(`Đã đổi trạng thái ${table.name}`);
      loadData();
    } catch (err) {
      error('Lỗi khi cập nhật trạng thái bàn.');
    }
  };

  const handleOrderAtTable = (table: Table) => {
    navigate(`/pos?tableId=${table.id}`);
  };

  const filteredTables = tables.filter(
    (t) => selectedAreaId === 'all' || t.areaId === selectedAreaId
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Bàn & Phòng (F&B)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sơ đồ bàn, khu vực và trạng thái phục vụ khách dùng tại quán
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => setIsAreaModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            Thêm khu vực
          </button>
          <button
            type="button"
            onClick={handleOpenAddTable}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm bàn mới
          </button>
        </div>
      </div>

      {/* Area Filter Tabs & Status Legend */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedAreaId('all')}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors ${
              selectedAreaId === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả khu vực ({tables.length})
          </button>
          {areas.map((a) => {
            const count = tables.filter((t) => t.areaId === a.id).length;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedAreaId(a.id)}
                className={`px-3 py-1.5 rounded-full font-medium shrink-0 transition-colors ${
                  selectedAreaId === a.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {a.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Bàn trống ({tables.filter((t) => t.status === 'available').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Đang dùng ({tables.filter((t) => t.status === 'occupied').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span>Chờ tính tiền ({tables.filter((t) => t.status === 'bill_printed').length})</span>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))
        ) : filteredTables.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
            Chưa có bàn nào trong khu vực này.
          </div>
        ) : (
          filteredTables.map((t) => {
            const isAvail = t.status === 'available';
            const isOcc = t.status === 'occupied';
            const isBill = t.status === 'bill_printed';

            return (
              <div
                key={t.id}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                  isAvail
                    ? 'bg-white border-emerald-200 hover:border-emerald-400 shadow-xs'
                    : isOcc
                    ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                    : 'bg-purple-50/70 border-purple-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium text-slate-500 truncate max-w-[80px]">
                      {t.areaName}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isAvail ? 'bg-emerald-500' : isOcc ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                    />
                  </div>

                  <h3 className="font-bold text-sm text-slate-900">{t.name}</h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Sức chứa: {t.capacity || 4} chỗ
                  </div>

                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => handleToggleTableStatus(t)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                        isAvail
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : isOcc
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-purple-100 text-purple-900 hover:bg-purple-200'
                      }`}
                      title="Bấm để đổi trạng thái"
                    >
                      {isAvail ? 'Bàn trống' : isOcc ? 'Đang có khách' : 'Chờ tính tiền'}
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => handleOrderAtTable(t)}
                    className="flex-1 py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    Bán hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEditTable(t)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    title="Sửa"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingTableId(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    title="Xóa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Table */}
      <Modal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        title={editingTable ? 'Chỉnh sửa bàn' : 'Thêm bàn mới'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveTable} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Tên bàn / Phòng *
            </label>
            <input
              type="text"
              required
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="VD: Bàn 01, Bàn VIP..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Khu vực
            </label>
            <select
              value={tableAreaId}
              onChange={(e) => setTableAreaId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Sức chứa (số khách)
            </label>
            <input
              type="number"
              min="1"
              value={tableCapacity}
              onChange={(e) => setTableCapacity(Number(e.target.value) || 4)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsTableModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              {editingTable ? 'Lưu thay đổi' : 'Thêm bàn'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Area */}
      <Modal
        isOpen={isAreaModalOpen}
        onClose={() => setIsAreaModalOpen(false)}
        title="Thêm khu vực F&B mới"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveArea} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Tên khu vực *
            </label>
            <input
              type="text"
              required
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="VD: Sân thượng, Tầng 2, Sân vườn..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAreaModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Thêm khu vực
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deletingTableId)}
        onClose={() => setDeletingTableId(null)}
        onConfirm={handleDeleteTable}
        title="Xóa bàn"
        message="Bạn có chắc chắn muốn xóa bàn này?"
        confirmLabel="Xóa"
      />
    </div>
  );
};
