import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const { success, error } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await resetPassword(email.trim());
      setSubmitted(true);
      success('Email đặt lại mật khẩu đã được gửi!');
    } catch (err: any) {
      console.error(err);
      let msg = 'Không thể gửi email đặt lại mật khẩu. Vui lòng kiểm tra lại địa chỉ email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'Không tìm thấy tài khoản với email này.';
      }
      setErrorMessage(msg);
      error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center bg-linear-to-b from-blue-50/50 to-white border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-600 rounded-xl text-white font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            D
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quên mật khẩu
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Nhập email của bạn để nhận liên kết đặt lại mật khẩu
          </p>
        </div>

        <div className="p-8">
          {submitted ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu đến <span className="font-semibold">{email}</span>. Vui lòng kiểm tra hộp thư đến (và thư mục Spam nếu cần).
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 pt-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại Đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email đã đăng ký
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
              </button>

              <div className="pt-4 text-center border-t border-slate-100">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
