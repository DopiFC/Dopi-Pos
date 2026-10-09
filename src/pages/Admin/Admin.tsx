import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Users,
  CreditCard,
  KeyRound,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Lock,
  Unlock,
  Download,
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ActivationCode, SystemSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { Modal } from '../../components/common/Modal';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const Admin: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'codes' | 'users' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);

  // Admin Stats
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    totalSubscriptions: number;
    activeSubscriptions: number;
    expiringSoonSubscriptions: number;
    totalCodes: number;
    redeemedCodes: number;
    unredeemedCodes: number;
  }>({
    totalUsers: 0,
    activeUsers: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    expiringSoonSubscriptions: 0,
    totalCodes: 0,
    redeemedCodes: 0,
    unredeemedCodes: 0
  });

  const [usersList, setUsersList] = useState<any[]>([]);
  const [codesList, setCodesList] = useState<ActivationCode[]>([]);
  const [codeFilter, setCodeFilter] = useState<'all' | 'unredeemed' | 'redeemed' | 'disabled'>('all');
  const [codeSearch, setCodeSearch] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'trial' | 'active' | 'expired'>('all');
  const [grantUserModal, setGrantUserModal] = useState<any | null>(null);
  const [grantDays, setGrantDays] = useState<number>(30);
  const [grantPlanId, setGrantPlanId] = useState<string>('month_1');
  const [isGranting, setIsGranting] = useState(false);

  // Generate Codes Modal
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genCount, setGenCount] = useState<number>(10);
  const [genPlanId, setGenPlanId] = useState<'month_1' | 'month_3'>('month_1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedCodes, setLastGeneratedCodes] = useState<string[]>([]);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    appName: 'DopiPOS',
    contactZalo: '',
    contactFacebook: '',
    contactMessenger: '',
    contactPhone: '',
    contactEmail: ''
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load Admin Data
  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, codesRes, settingsRes] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch(`/api/admin/codes?filter=${codeFilter}`).then((r) => r.json()),
        fetch('/api/system-settings').then((r) => r.json())
      ]);

      if (statsRes.success) {
        setStats(statsRes.stats);
        if (statsRes.users) setUsersList(statsRes.users);
      }
      if (codesRes.success) {
        setCodesList(codesRes.codes);
      }
      if (settingsRes.success && settingsRes.settings) {
        setSettings(settingsRes.settings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin, codeFilter]);

  if (!isAdmin) {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Truy cập bị từ chối</h1>
        <p className="text-sm text-slate-500 mt-2">
          Khu vực này chỉ dành riêng cho Quản trị viên hệ thống (Admin). Tài khoản của bạn không có quyền truy cập.
        </p>
      </div>
    );
  }

  // Handle batch code generation
  const handleGenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: genCount,
          planId: genPlanId,
          adminUid: user?.uid
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Đã tạo thành công ${data.count} mã kích hoạt cho ${data.planName}!`);
        setLastGeneratedCodes(data.codes);
        loadAdminData();
      } else {
        error(data.message || 'Lỗi khi tạo mã.');
      }
    } catch (err) {
      error('Không thể kết nối đến máy chủ.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct grant / extend user subscription by Admin
  const handleGrantUserPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantUserModal || !user) return;
    setIsGranting(true);
    try {
      const planNames: Record<string, string> = {
        month_1: 'DopiPOS Hộ kinh doanh (30 ngày)',
        month_3: 'DopiPOS Hộ kinh doanh (90 ngày)',
        year_1: 'DopiPOS Hộ kinh doanh (365 ngày)'
      };
      const res = await fetch('/api/admin/activate-user-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user.email,
          userId: grantUserModal.uid,
          planId: grantPlanId,
          days: grantDays,
          planName: planNames[grantPlanId] || `Gói Hộ kinh doanh (${grantDays} ngày)`
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Đã kích hoạt ${grantDays} ngày cho ${grantUserModal.displayName || grantUserModal.email}!`);
        setGrantUserModal(null);
        loadAdminData();
      } else {
        error(data.message || 'Lỗi khi kích hoạt gói.');
      }
    } catch {
      error('Lỗi kết nối máy chủ.');
    } finally {
      setIsGranting(false);
    }
  };

  // Toggle user account lock
  const handleToggleUserStatus = async (targetUser: any) => {
    const nextStatus = targetUser.status === 'blocked' ? 'active' : 'blocked';
    const isLocked = nextStatus === 'blocked';

    // Optimistic UI update
    setUsersList((prev) =>
      prev.map((u) =>
        u.uid === targetUser.uid ? { ...u, status: nextStatus, isLocked } : u
      )
    );

    try {
      const res = await fetch('/api/admin/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: user?.email,
          userId: targetUser.uid,
          status: nextStatus
        })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        success(`Đã ${nextStatus === 'blocked' ? 'khóa' : 'mở khóa'} tài khoản ${targetUser.email}`);
        return;
      }
    } catch {
      // Backend unavailable, fallback to client Firestore write
    }

    try {
      await setDoc(
        doc(db, 'users', targetUser.uid),
        { status: nextStatus, isLocked, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      success(`Đã ${nextStatus === 'blocked' ? 'khóa' : 'mở khóa'} tài khoản ${targetUser.email}`);
    } catch (err: any) {
      console.error('Error toggling user status in Firestore:', err);
      error('Lỗi khi cập nhật trạng thái tài khoản.');
      loadAdminData();
    }
  };

  // Toggle code status (active / disabled)
  const handleToggleCodeStatus = async (code: ActivationCode) => {
    const nextStatus = code.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await fetch('/api/admin/toggle-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.code, status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success(`Đã đổi trạng thái mã ${code.code}`);
        loadAdminData();
      } else {
        error(data.message || 'Lỗi cập nhật mã.');
      }
    } catch (err) {
      error('Lỗi kết nối.');
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        success('Đã lưu cấu hình liên hệ hệ thống!');
      } else {
        error('Không thể lưu cấu hình.');
      }
    } catch (err) {
      error('Lỗi kết nối máy chủ.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Copy code to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Export Codes CSV
  const handleExportCodesCSV = () => {
    const headers = ['Mã kích hoạt', 'Gói', 'Số ngày', 'Đã dùng', 'Người dùng ID', 'Ngày dùng', 'Trạng thái', 'Ngày tạo'];
    const rows = codesList.map((c) => [
      c.code,
      c.planId,
      c.planDays,
      c.redeemed ? 'ĐÃ DÙNG' : 'CHƯA DÙNG',
      `"${c.redeemedBy || ''}"`,
      `"${c.redeemedAt || ''}"`,
      c.status,
      `"${c.createdAt}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DopiPOS_Activation_Codes_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCodes = codesList.filter((c) => !codeSearch || c.code.includes(codeSearch.toUpperCase()));

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 text-xs font-bold uppercase">
              Admin Control Panel
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Quản trị Hệ thống DopiPOS
          </h1>
          <p className="text-xs text-slate-500">
            Quản lý người dùng, sinh mã kích hoạt hàng loạt và cấu hình thông tin mua mã
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold self-start">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'overview' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('codes')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'codes' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Mã kích hoạt ({stats.totalCodes})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'users' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Người dùng ({stats.totalUsers})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'settings' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Cấu hình liên hệ
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Tổng người dùng
              </span>
              <div className="text-2xl font-bold text-slate-900">{stats.totalUsers}</div>
              <div className="text-xs text-slate-500 mt-1">Đã đăng ký tài khoản</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Gói đang hoạt động
              </span>
              <div className="text-2xl font-bold text-emerald-600">{stats.activeSubscriptions}</div>
              <div className="text-xs text-slate-500 mt-1">
                {stats.expiringSoonSubscriptions} gói sắp hết hạn (dưới 7 ngày)
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Mã chưa kích hoạt
              </span>
              <div className="text-2xl font-bold text-blue-600">{stats.unredeemedCodes}</div>
              <div className="text-xs text-slate-500 mt-1">Sẵn sàng bán cho khách</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                Mã đã kích hoạt
              </span>
              <div className="text-2xl font-bold text-slate-700">{stats.redeemedCodes}</div>
              <div className="text-xs text-slate-500 mt-1">Đã quy đổi thành subscription</div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-purple-900 text-sm">Sinh mã kích hoạt nhanh</h2>
              <p className="text-xs text-purple-700 mt-0.5">
                Tạo lô 10, 50, 100 hoặc 500 mã 15 ký tự bảo mật để cấp cho khách hàng thanh toán qua Zalo/Chuyển khoản.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGenModalOpen(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              Tạo mã kích hoạt ngay
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ACTIVATION CODES */}
      {/* ============================================================== */}
      {activeTab === 'codes' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  placeholder="Tìm mã 15 ký tự..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Tất cả mã</option>
                <option value="unredeemed">Chưa sử dụng</option>
                <option value="redeemed">Đã sử dụng</option>
                <option value="disabled">Đã khóa</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCodesCSV}
                className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất file CSV
              </button>
              <button
                type="button"
                onClick={() => setIsGenModalOpen(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Sinh mã mới
              </button>
            </div>
          </div>

          {/* Codes Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Mã kích hoạt (15 ký tự)</th>
                    <th className="py-3 px-4">Gói dịch vụ</th>
                    <th className="py-3 px-4 text-center">Trạng thái sử dụng</th>
                    <th className="py-3 px-4">Người dùng kích hoạt</th>
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4 text-right">Khóa / Mở</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                        Chưa có mã kích hoạt nào. Hãy bấm "Sinh mã mới" để tạo lô mã.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((c) => (
                      <tr key={c.code} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 tracking-wider">
                          <div className="flex items-center gap-2">
                            <span>{c.code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(c.code)}
                              className="text-slate-400 hover:text-purple-600 p-0.5"
                              title="Sao chép mã"
                            >
                              {copiedCode === c.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {c.planId === 'month_1' ? (
                            <span className="text-blue-700 font-semibold">1 tháng (30 ngày)</span>
                          ) : (
                            <span className="text-purple-700 font-semibold">3 tháng (90 ngày)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          {c.status === 'disabled' ? (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-bold">
                              ĐÃ KHÓA
                            </span>
                          ) : c.redeemed ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              ĐÃ SỬ DỤNG
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                              CHƯA DÙNG
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-sans">
                          {c.redeemedBy ? (
                            <span className="truncate max-w-[120px] block" title={c.redeemedBy}>
                              User ID: {c.redeemedBy.slice(0, 8)}...
                            </span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                          {c.redeemedAt ? formatDateTime(c.redeemedAt) : formatDateTime(c.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right font-sans">
                          {!c.redeemed && (
                            <button
                              type="button"
                              onClick={() => handleToggleCodeStatus(c)}
                              className={`p-1 rounded text-xs transition-colors ${
                                c.status === 'active'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={c.status === 'active' ? 'Khóa mã' : 'Mở khóa'}
                            >
                              {c.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}
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

      {/* ============================================================== */}
      {/* TAB 3: USERS LIST & MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên, email, cửa hàng, SĐT..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Tất cả tài khoản</option>
                <option value="trial">Đang dùng thử (3 ngày)</option>
                <option value="active">Đang hoạt động</option>
                <option value="expired">Đã hết hạn</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 flex items-center">
              Tổng số: <span className="font-bold text-slate-800 ml-1">{usersList.length} tài khoản</span>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Tài khoản & Email</th>
                    <th className="py-3 px-4">Cửa hàng & SĐT</th>
                    <th className="py-3 px-4">Gói dịch vụ</th>
                    <th className="py-3 px-4 text-center">Thời hạn & Trạng thái</th>
                    <th className="py-3 px-4">Ngày đăng ký</th>
                    <th className="py-3 px-4 text-right">Quản lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList
                    .filter((u) => {
                      const matchSearch =
                        !userSearch ||
                        u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.storeName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.phoneNumber?.toLowerCase().includes(userSearch.toLowerCase());

                      let matchStatus = true;
                      if (userStatusFilter === 'trial') {
                        matchStatus = Boolean(u.isTrial && !u.isExpired);
                      } else if (userStatusFilter === 'active') {
                        matchStatus = Boolean(!u.isExpired);
                      } else if (userStatusFilter === 'expired') {
                        matchStatus = Boolean(u.isExpired);
                      }

                      return matchSearch && matchStatus;
                    })
                    .map((u, idx) => (
                      <tr key={u.uid || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{u.displayName || 'Chủ quán'}</span>
                            {u.role === 'admin' && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[10px] font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px] font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{u.storeName || '--'}</div>
                          <div className="text-slate-500 text-[11px]">{u.phoneNumber || '--'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {u.planName || (u.isTrial ? 'Gói Hộ KD (Free 3 ngày)' : 'Chưa có gói')}
                          </span>
                          {u.subEndDate && (
                            <span className="text-[10px] text-slate-400">
                              Đến: {formatDateTime(u.subEndDate)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.status === 'blocked' ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[11px] font-bold">
                              ĐÃ KHÓA
                            </span>
                          ) : u.isExpired ? (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px] font-bold">
                              HẾT HẠN
                            </span>
                          ) : u.isTrial ? (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-bold">
                              DÙNG THỬ (còn {u.daysLeft} ngày)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              HOẠT ĐỘNG (còn {u.daysLeft} ngày)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {formatDateTime(u.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setGrantUserModal(u);
                                setGrantDays(30);
                                setGrantPlanId('month_1');
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold transition-colors"
                              title="Kích hoạt hoặc gia hạn ngày sử dụng"
                            >
                              Kích hoạt gói
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                className={`p-1 rounded text-xs transition-colors ${
                                  u.status === 'blocked'
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title={u.status === 'blocked' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              >
                                {u.status === 'blocked' ? (
                                  <Unlock className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SYSTEM SETTINGS (CONTACTS) */}
      {/* ============================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-2xl">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Cấu hình thông tin Liên hệ mua Mã kích hoạt
          </h2>
          <p className="text-xs text-slate-500">
            Thông tin này sẽ tự động hiển thị trong hộp thoại "Liên hệ Dopi để mua code" khi người dùng bấm mua gói.
          </p>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Số Zalo hỗ trợ
            </label>
            <input
              type="text"
              value={settings.contactZalo}
              onChange={(e) => setSettings({ ...settings, contactZalo: e.target.value })}
              placeholder="0987654321"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Hotline tư vấn
            </label>
            <input
              type="text"
              value={settings.contactPhone}
              onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              placeholder="0987.654.321"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Link Facebook Fanpage
            </label>
            <input
              type="url"
              value={settings.contactFacebook}
              onChange={(e) => setSettings({ ...settings, contactFacebook: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Link Facebook Messenger
            </label>
            <input
              type="url"
              value={settings.contactMessenger}
              onChange={(e) => setSettings({ ...settings, contactMessenger: e.target.value })}
              placeholder="https://m.me/..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Email hỗ trợ
            </label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              placeholder="hotro@dopipos.vn"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSavingSettings ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      )}

      {/* Batch Code Generation Modal */}
      <Modal
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
        title="Sinh mã kích hoạt mới hàng loạt"
        maxWidth="md"
      >
        <form onSubmit={handleGenerateCodes} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1.5">
              Gói dịch vụ áp dụng
            </label>
            <select
              value={genPlanId}
              onChange={(e) => setGenPlanId(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="month_1">Gói 1 tháng (30 ngày - 39.000 ₫)</option>
              <option value="month_3">Gói 3 tháng (90 ngày - 79.000 ₫)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1.5">
              Số lượng mã cần tạo
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 500].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setGenCount(num)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    genCount === num
                      ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-600/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num} mã
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mỗi mã sẽ được sinh ngẫu nhiên đúng 15 ký tự (A-Z và 0-9) và lưu vào cơ sở dữ liệu backend an toàn.
            </p>
          </div>

          {lastGeneratedCodes.length > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
              <span className="font-bold text-emerald-800">
                Đã tạo thành công {lastGeneratedCodes.length} mã gần nhất:
              </span>
              <div className="font-mono text-[11px] text-slate-700 max-h-24 overflow-y-auto bg-white p-2 rounded border border-emerald-100">
                {lastGeneratedCodes.slice(0, 10).join(', ')}
                {lastGeneratedCodes.length > 10 && ` ...và ${lastGeneratedCodes.length - 10} mã khác`}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsGenModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-xs"
            >
              {isGenerating ? 'Đang sinh mã...' : `Tạo ngay ${genCount} mã`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Grant / Extend User Subscription Modal */}
      {grantUserModal && (
        <Modal
          isOpen={Boolean(grantUserModal)}
          onClose={() => setGrantUserModal(null)}
          title={`Kích hoạt gói dịch vụ cho ${grantUserModal.displayName || grantUserModal.email}`}
          maxWidth="md"
        >
          <form onSubmit={handleGrantUserPlan} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div>
                <span className="text-slate-500">Email:</span>{' '}
                <span className="font-semibold text-slate-800">{grantUserModal.email}</span>
              </div>
              <div>
                <span className="text-slate-500">Cửa hàng:</span>{' '}
                <span className="font-semibold text-slate-800">{grantUserModal.storeName || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500">Gói hiện tại:</span>{' '}
                <span className="font-semibold text-slate-800">{grantUserModal.planName || 'Chưa có'}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Chọn gói kích hoạt:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'month_1', days: 30, label: '1 tháng (30 ngày)' },
                  { id: 'month_3', days: 90, label: '3 tháng (90 ngày)' },
                  { id: 'year_1', days: 365, label: '1 năm (365 ngày)' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setGrantPlanId(p.id);
                      setGrantDays(p.days);
                    }}
                    className={`py-2.5 px-2 text-center text-xs font-bold rounded-lg border transition-all ${
                      grantPlanId === p.id
                        ? 'border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-600/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Hoặc nhập số ngày kích hoạt tùy chỉnh:
              </label>
              <input
                type="number"
                min={1}
                max={3650}
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value) || 30)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Hệ thống sẽ cập nhật ngày hết hạn mới cho người dùng ngay lập tức.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setGrantUserModal(null)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isGranting}
                className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-xs"
              >
                {isGranting ? 'Đang kích hoạt...' : `Kích hoạt ${grantDays} ngày`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
