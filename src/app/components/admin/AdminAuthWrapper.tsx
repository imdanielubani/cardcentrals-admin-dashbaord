import { Outlet, useLocation, Navigate } from "react-router";
import { AdminAuthProvider, useAdminAuth } from "../../context/AdminAuthContext";
import React from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSessionLoading } = useAdminAuth();
  const location = useLocation();

  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="w-8 h-8 border-3 border-[#0159C7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPublicRoute = ["/login", "/forgot-password", "/reset-password"].includes(location.pathname);

  // If we are at the root, we'll let the router handle it (it will redirect to dashboard)
  // which will then be caught by this guard if not authenticated.
  if (location.pathname === "/") {
    return <>{children}</>;
  }

  if (!isAuthenticated && !isPublicRoute) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AdminAuthWrapper() {
  return (
    <AdminAuthProvider>
      <AuthGuard>
        <Outlet />
      </AuthGuard>
    </AdminAuthProvider>
  );
}
