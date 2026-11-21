import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Profile } from './pages/auth/Profile';
import { Dashboard } from './pages/analytics/Dashboard';
import { LeadsList } from './pages/sales/LeadsList';
import { OrdersList } from './pages/sales/OrdersList';
import { QuotationList } from './pages/sales/QuotationList';
import NotificationsPage from './pages/communications/NotificationsPage';
import { AppointmentList } from './pages/service/AppointmentList';
import { ProductDetail } from './pages/shop/ProductDetail';
import { ProductList } from './pages/shop/ProductList';
import { ProductManage } from './pages/shop/ProductManage';
import CartPage from './pages/shop/CartPage';
import { VehicleDetail } from './pages/vehicles/VehicleDetail';
import { VehicleForm } from './pages/vehicles/VehicleForm';
import { VehicleList } from './pages/vehicles/VehicleList';

function NotFound() {
  return (
    <main className="container py-5 text-center">
      <h1 className="h3">Page not found</h1>
      <p className="text-muted">The page you requested does not exist.</p>
    </main>
  );
}

function DealerRoute({ children }) {
  return <ProtectedRoute dealerOnly>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route
                path="vehicles/new"
                element={<DealerRoute><VehicleForm /></DealerRoute>}
              />
              <Route
                path="vehicles/:id/edit"
                element={<DealerRoute><VehicleForm /></DealerRoute>}
              />
              <Route path="shop" element={<ProductList />} />
              <Route path="shop/product/:id" element={<ProductDetail />} />
              <Route path="cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
              <Route
                path="shop/manage"
                element={<DealerRoute><ProductManage /></DealerRoute>}
              />
              <Route path="service/appointments" element={<ProtectedRoute><AppointmentList /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="analytics" element={<DealerRoute><Dashboard /></DealerRoute>} />
              <Route path="sales/leads" element={<DealerRoute><LeadsList /></DealerRoute>} />
              <Route path="sales/quotations" element={<DealerRoute><QuotationList /></DealerRoute>} />
              <Route path="sales/orders" element={<DealerRoute><OrdersList /></DealerRoute>} />
              <Route path="not-found" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/not-found" replace />} />
            </Route>
          </Routes>
          <Toaster position="top-right" />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
