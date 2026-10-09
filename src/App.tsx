import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { POS } from './pages/POS/POS';
import { Products } from './pages/Products/Products';
import { Categories } from './pages/Categories/Categories';
import { Orders } from './pages/Orders/Orders';
import { Inventory } from './pages/Inventory/Inventory';
import { Customers } from './pages/Customers/Customers';
import { Tables } from './pages/Tables/Tables';
import { Reports } from './pages/Reports/Reports';
import { Subscription } from './pages/Subscription/Subscription';
import { Admin } from './pages/Admin/Admin';
import { Profile } from './pages/Profile/Profile';
import { AdminRoute } from './components/layout/AdminRoute';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected App Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/tables" element={<Tables />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <Admin />
                  </AdminRoute>
                }
              />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
