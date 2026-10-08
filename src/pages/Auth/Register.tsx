import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Lock, Mail, Store, User, Phone, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Register: React.FC = () => {
  const { signUp, signInWithGoogle } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu nhập lại không khớp.');
      return;
    }

    if (!displayName.trim() || !storeName.trim()) {
      setErrorMessage('Vui lòng điền đầy đủ Tên người dùng và Tên cửa hàng.');
      return;
    }

    setLoading(true);

    try {
      await signUp(
        email.trim(),
        password,
        displayName.trim(),
        storeName.trim(),
        phoneNumber.trim()
      );
      success('Đăng ký tài khoản thành công!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      const msg = err.message || 'Đăng ký không thành công. Vui lòng thử lại.';
      setErrorMessage(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center bg-linear-to-b from-blue-50/50 to-white border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-600 rounded-xl text-white font-bold text-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
            D
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tạo tài khoản DopiPOS
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bắt đầu quản lý bán hàng cho hộ kinh doanh và quán F&B
          </p>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Tên của bạn *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="VD: Anh Minh"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Tên cửa hàng / Quán *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="VD: Tiệm Cà Phê 1990"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Email đăng ký *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Mật khẩu *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Nhập lại mật khẩu *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                'Đang tạo tài khoản...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Hoàn tất đăng ký tài khoản
                </>
              )}
            </button>

            <div className="pt-3 text-center border-t border-slate-100">
              <span className="text-xs text-slate-600">Đã có tài khoản? </span>
              <Link to="/login" className="text-xs font-bold text-blue-600 hover:text-blue-700">
                Đăng nhập ngay
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
