import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import HomePage from "./pages/HomePage";
import DealDetailsPage from "./pages/DealDetailsPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import { MainLayout } from "./components/MainLayout";

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
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
      <Routes>
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
        <Route path="/admin/login" element={<LoginPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
