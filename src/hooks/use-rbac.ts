import { useAuth } from "../contexts/auth-context";
import type { Role } from "../contexts/auth-context";

export const useRbac = () => {
  const { user } = useAuth();

  const hasRole = (roles: Role[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return { user, hasRole };
};
