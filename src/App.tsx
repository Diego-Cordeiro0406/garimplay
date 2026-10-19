import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { MainLayout } from "@/components/MainLayout";

import HomePage from "@/pages/HomePage";
import DealDetailsPage from "@/pages/DealDetailsPage";
import LoginPage from "@/pages/LoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import NotFoundPage from "@/pages/NotFoundPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminDealsPage from "./pages/admin/AdminDealsPage";
import AdminNewDealPage from "./pages/admin/AdminNewDealPage";
import AdminEditDealPage from "./pages/admin/AdminEditDealPage";
import AdminStoresPage from "./pages/admin/AdminStoresPage";
import { ScrollToTop } from "./components/ScrollToTop";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";

import AdminImportsPage from "./pages/admin/AdminImportsPage";
import AdminImportReviewPage from "./pages/admin/AdminImportReviewPage";
import AboutPage from "./pages/AboutPage";

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Rotas públicas */}
            <Route
              path="/"
              element={
                <MainLayout>
                  <HomePage />
                </MainLayout>
              }
            />

            <Route
              path="/ofertas/:id"
              element={
                <MainLayout>
                  <DealDetailsPage />
                </MainLayout>
              }
            />

            <Route
              path="/privacidade"
              element={
                <MainLayout>
                  <PrivacyPolicyPage />
                </MainLayout>
              }
            />

            <Route
              path="/sobre"
              element={
                <MainLayout>
                  <AboutPage />
                </MainLayout>
              }
            />

            {/* Login administrativo */}
            <Route path="/admin/login" element={<LoginPage />} />

            {/* Rotas protegidas */}

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />

                <Route path="ofertas" element={<AdminDealsPage />} />

                <Route path="ofertas/nova" element={<AdminNewDealPage />} />

                <Route path="ofertas/:id/editar" element={<AdminEditDealPage />} />

                <Route path="importacoes" element={<AdminImportsPage />} />
                <Route path="importacoes/:id" element={<AdminImportReviewPage />} />

                <Route path="lojas" element={<AdminStoresPage />} />

                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
            </Route>

            {/* Página não encontrada */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <CookieConsentBanner />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
