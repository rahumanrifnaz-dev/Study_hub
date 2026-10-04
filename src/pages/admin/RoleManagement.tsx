import React, { useEffect, useState } from "react";
import { apiClient } from "../../integrations/api/client";
import { useAuth } from "../../contexts/auth-context";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const RoleManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    apiClient
      .get<User[]>("/api/users", user?.apiToken)
      .then(setUsers)
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, [user?.apiToken]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      await apiClient.post(`/api/users/${userId}/role`, { role: newRole }, user?.apiToken);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch {
      alert("Failed to update role.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <section className="glass-card p-6 mt-6">
      <h2 className="section-title mb-4">Role Management</h2>
      {loading ? (
        <div className="text-white/60">Loading users...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/70">
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/10">
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td className="capitalize">{user.role.replace("_", " ")}</td>
                <td>
                  <select
                    value={user.role}
                    disabled={updating === user.id}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="bg-white/10 text-white rounded px-2 py-1"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default RoleManagement;
