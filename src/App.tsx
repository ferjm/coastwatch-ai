import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

// Public pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// App pages
import Dashboard from "./pages/app/Dashboard";
import Uploads from "./pages/app/Uploads";
import MapView from "./pages/app/MapView";
import Review from "./pages/app/Review";
import Areas from "./pages/app/Areas";
import Flights from "./pages/app/Flights";
import Models from "./pages/app/Models";
import Jobs from "./pages/app/Jobs";
import Settings from "./pages/app/Settings";
import UserManagement from "./pages/UserManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected app routes */}
            <Route path="/app/*" element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="uploads" element={<Uploads />} />
                    <Route path="map" element={<MapView />} />
                    <Route path="review" element={<Review />} />
                    <Route path="areas" element={<Areas />} />
                    <Route path="flights" element={<Flights />} />
                    <Route path="models" element={<Models />} />
                    <Route path="jobs" element={<Jobs />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="users" element={
                      <ProtectedRoute requiredRole="admin">
                        <UserManagement />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
