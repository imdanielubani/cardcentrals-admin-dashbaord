import { createBrowserRouter, Navigate } from "react-router";
import { AdminLayout } from "./components/admin/AdminLayout";
import { DashboardPage } from "./components/admin/DashboardPage";
import { UsersPage } from "./components/admin/UsersPage";
import { GiftcardsPage } from "./components/admin/GiftcardsPage";
import { WithdrawalsPage } from "./components/admin/WithdrawalsPage";
import { RatesPage } from "./components/admin/RatesPage";
import { FinancePage } from "./components/admin/FinancePage";
import { FraudPage } from "./components/admin/FraudPage";
import { LogsPage } from "./components/admin/LogsPage";
import { SettingsPage } from "./components/admin/SettingsPage";
import { BannersPage } from "./components/admin/BannersPage";
import { CountriesPage } from "./components/admin/CountriesPage";
import { CatalogPage } from "./components/admin/CatalogPage";
import { AdminLoginPage } from "./components/admin/AdminLoginPage";
import { ForgotPasswordPage } from "./components/admin/ForgotPasswordPage";
import { ResetPasswordPage } from "./components/admin/ResetPasswordPage";
import { AdminAuthWrapper } from "./components/admin/AdminAuthWrapper";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AdminAuthWrapper />,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />,
      },
      {
        path: "login",
        element: <AdminLoginPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />,
      },
      {
        element: <AdminLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "users",
            element: <UsersPage />,
          },
          {
            path: "giftcards",
            element: <GiftcardsPage />,
          },
          {
            path: "withdrawals",
            element: <WithdrawalsPage />,
          },
          {
            path: "rates",
            element: <RatesPage />,
          },
          {
            path: "countries",
            element: <CountriesPage />,
          },
          {
            path: "catalog",
            element: <CatalogPage />,
          },
          {
            path: "finance",
            element: <FinancePage />,
          },
          {
            path: "fraud",
            element: <FraudPage />,
          },
          {
            path: "logs",
            element: <LogsPage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
          {
            path: "banners",
            element: <BannersPage />,
          },
        ],
      },
    ],
  },
]);
