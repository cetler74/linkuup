import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserPermissionsProvider } from './contexts/UserPermissionsContext';
import { PlaceProvider } from './contexts/PlaceContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import NotFoundPage from './components/common/NotFoundPage';
import ShaderBackground from './components/common/ShaderBackground';
import ShaderBackgroundCSS from './components/common/ShaderBackgroundCSS';
import WebGLShaderBackground from './components/common/WebGLShaderBackground';
import OriginalShaderBackground from './components/common/OriginalShaderBackground';
import SimpleShaderBackground from './components/common/SimpleShaderBackground';
import InteractiveBackground from './components/common/InteractiveBackground';
import HomePage from './pages/HomePage';
import SearchResultsWithImages from './pages/SearchResultsWithImages';
import SalonDetailsWithImages from './pages/SalonDetailsWithImages';
import BookingPage from './pages/BookingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import JoinPage from './pages/JoinPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import BillingPage from './pages/BillingPage';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './components/auth/AuthPage';
import BusinessOwnerRoute from './components/auth/BusinessOwnerRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import OwnerLayout from './components/owner/OwnerLayout';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import UpgradePlan from './pages/owner/UpgradePlan';
import CreateFirstPlace from './pages/owner/CreateFirstPlace';
import PlacesManagement from './pages/owner/PlacesManagement';
import ServicesManagement from './pages/owner/ServicesManagement';
import EmployeesManagement from './pages/owner/EmployeesManagement';
import CustomersManagement from './pages/owner/CustomersManagement';
import CustomerDetails from './pages/owner/CustomerDetails';
import BookingsManagement from './pages/owner/BookingsManagement';
import PlaceWorkingHours from './pages/owner/PlaceWorkingHours';
import UserSettingsManagement from './pages/owner/UserSettingsManagement';
import RewardsManagement from './pages/owner/RewardsManagement';
import EmployeeTimeOff from './pages/owner/EmployeeTimeOff';
import CampaignsManagement from './pages/owner/CampaignsManagement';
import MessagesManagement from './pages/owner/MessagesManagement';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerBookings from './pages/customer/CustomerBookings';
import CustomerRewards from './pages/customer/CustomerRewards';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import TestOwner from './pages/TestOwner';
import TestForm from './pages/TestForm';
import TestFormSimple from './pages/TestFormSimple';
import DebugAuth from './pages/DebugAuth';
import RegisterFormTest from './components/auth/RegisterFormTest';
import ImageTest from './components/test/ImageTest';
import APITest from './components/test/APITest';
import ImageDebugTest from './components/test/ImageDebugTest';
import LeafletTest from './components/test/LeafletTest';
import PlacesTest from './components/test/PlacesTest';
import SimplePlacesTest from './components/test/SimplePlacesTest';

// Helper component to wrap owner routes with user permissions
const OwnerRouteWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BusinessOwnerRoute>
    <UserPermissionsProvider>
      <PlaceProvider>
        <OwnerLayout>
          {children}
        </OwnerLayout>
      </PlaceProvider>
    </UserPermissionsProvider>
  </BusinessOwnerRoute>
);

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Basic Protected Route Component
const BasicProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return <>{children}</>;
};

// Admin Protected Route Component
const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
          <p className="text-gray-600 mb-8">Access denied. Admin privileges required.</p>
          <a href="/" className="btn-primary">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Customer Protected Route Component
const CustomerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isCustomer, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!isCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
          <p className="text-gray-600 mb-8">Access denied. Customer account required.</p>
          <a href="/" className="btn-primary">
            Go Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  // ============================================
  // BACKGROUND TOGGLE
  // ============================================
  // Toggle between interactive and simple background
  // Set to true to use InteractiveBackground (Option 4)
  // Set to false to use SimpleShaderBackground (original)
  // ============================================
  const USE_INTERACTIVE_BACKGROUND = true;

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/search" element={
                <div className="min-h-screen flex flex-col relative bg-white search-page">
                  {USE_INTERACTIVE_BACKGROUND ? (
                    <InteractiveBackground opacity={0.4} />
                  ) : (
                    <SimpleShaderBackground opacity={0.2} />
                  )}
                  <div className="relative z-10">
                    <Header />
                  </div>
                  <main className="flex-1 relative z-10">
                    <SearchResultsWithImages />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/place/:slug" element={
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1">
                    <SalonDetailsWithImages />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/book/:placeId" element={
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1">
                    <BookingPage />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={
                <div className="min-h-screen flex flex-col">
                  <div className="relative z-10">
                    <Header />
                  </div>
                  <main className="flex-1">
                    <ContactPage />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/pricing" element={
                <div className="min-h-screen flex flex-col">
                  <main className="flex-1">
                    <PricingPage />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/billing" element={
                <BasicProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <BillingPage />
                    </main>
                    <Footer />
                  </div>
                </BasicProtectedRoute>
              } />
              <Route path="/privacy-policy" element={
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1">
                    <PrivacyPolicyPage />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/terms-of-service" element={
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1">
                    <TermsOfServicePage />
                  </main>
                  <Footer />
                </div>
              } />
              <Route path="/manager" element={
                <BasicProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <ManagerDashboard />
                    </main>
                    <Footer />
                  </div>
                </BasicProtectedRoute>
              } />
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <AdminDashboard />
                    </main>
                    <Footer />
                  </div>
                </AdminProtectedRoute>
              } />
              <Route path="/admin/dashboard" element={
                <AdminProtectedRoute>
                  <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-1">
                      <AdminDashboard />
                    </main>
                    <Footer />
                  </div>
                </AdminProtectedRoute>
              } />
              <Route path="/owner" element={
                <OwnerRouteWrapper>
                  <OwnerDashboard />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/dashboard" element={
                <OwnerRouteWrapper>
                  <OwnerDashboard />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/upgrade" element={
                <OwnerRouteWrapper>
                  <UpgradePlan />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/create-first-place" element={
                <OwnerRouteWrapper>
                  <CreateFirstPlace />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/places" element={
                <OwnerRouteWrapper>
                  <PlacesManagement />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/services" element={
                <OwnerRouteWrapper>
                  <ServicesManagement />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/employees" element={
                <OwnerRouteWrapper>
                  <EmployeesManagement />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/customers" element={
                <OwnerRouteWrapper>
                  <CustomersManagement />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/customers/:userId" element={
                <OwnerRouteWrapper>
                  <CustomerDetails />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/bookings" element={
                <OwnerRouteWrapper>
                  <ProtectedRoute requiredFeature="bookings">
                    <BookingsManagement />
                  </ProtectedRoute>
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/rewards" element={
                <OwnerRouteWrapper>
                  <ProtectedRoute requiredFeature="rewards">
                    <RewardsManagement />
                  </ProtectedRoute>
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/working-hours" element={
                <OwnerRouteWrapper>
                  <PlaceWorkingHours />
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/time-off" element={
                <OwnerRouteWrapper>
                  <ProtectedRoute requiredFeature="time_off">
                    <EmployeeTimeOff />
                  </ProtectedRoute>
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/campaigns" element={
                <OwnerRouteWrapper>
                  <ProtectedRoute requiredFeature="campaigns">
                    <CampaignsManagement />
                  </ProtectedRoute>
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/messages" element={
                <OwnerRouteWrapper>
                  <ProtectedRoute requiredFeature="messaging">
                    <MessagesManagement />
                  </ProtectedRoute>
                </OwnerRouteWrapper>
              } />
              <Route path="/owner/settings" element={
                <OwnerRouteWrapper>
                  <UserSettingsManagement />
                </OwnerRouteWrapper>
              } />
              <Route path="/customer/dashboard" element={
                <CustomerProtectedRoute>
                  <CustomerDashboard />
                </CustomerProtectedRoute>
              } />
              <Route path="/customer/bookings" element={
                <CustomerProtectedRoute>
                  <CustomerBookings />
                </CustomerProtectedRoute>
              } />
              <Route path="/customer/rewards" element={
                <CustomerProtectedRoute>
                  <CustomerRewards />
                </CustomerProtectedRoute>
              } />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/test-images" element={<ImageTest />} />
              <Route path="/test-api" element={<APITest />} />
              <Route path="/test-image-debug" element={<ImageDebugTest />} />
              <Route path="/test-leaflet" element={<LeafletTest />} />
              <Route path="/test-places" element={<PlacesTest />} />
              <Route path="/test-simple-places" element={<SimplePlacesTest />} />
              <Route path="/test-owner" element={<TestOwner />} />
              <Route path="/test-form" element={<TestForm />} />
              <Route path="/test-form-simple" element={<TestFormSimple />} />
              <Route path="/test-api-direct" element={<APITest />} />
              <Route path="/debug-auth" element={<DebugAuth />} />
              <Route path="/test-register" element={<RegisterFormTest />} />
              {/* Add more routes as needed */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;