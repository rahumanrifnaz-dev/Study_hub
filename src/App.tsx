import { Route, Routes } from "react-router-dom";
import Layout from "./components/layout/Layout";
import AdminLayout from "./components/layout/AdminLayout";
import Dashboard from "./pages/Dashboard";
import SubjectPage from "./pages/SubjectPage";
import Login from "./pages/Login";
import AccessDenied from "./pages/AccessDenied";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminRequests from "./pages/admin/AdminRequests";
import Calendar from "./pages/Calendar";
import { RequireRole } from "./components/layout/RequireRole";

const App = () => {
  return (
    <div className="app-gradient min-h-screen">
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="login" element={<Login />} />
          <Route path="subjects/:subjectId" element={<SubjectPage />} />
          <Route path="calendar" element={/* full-page copy of sidebar */ <Calendar /> } />
          <Route path="access-denied" element={<AccessDenied />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireRole allowedRoles={["admin", "super_admin"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<AdminRequests />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
