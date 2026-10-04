import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/auth-context";
import type { Role } from "../../contexts/auth-context";

interface RequireRoleProps {
  allowedRoles: Role[];
  children: React.ReactElement;
}

export const RequireRole = ({ allowedRoles, children }: RequireRoleProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return children;
};
