import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { supabaseClient } from "../../integrations/supabase/client";
import { useAuth } from "../../contexts/auth-context";

interface AdminRequestItem {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  userId: string;
  name: string;
  email: string;
}

interface AdminRequestRow {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  user_id: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

const AdminRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdminRequestItem[]>([]);
  const [admins, setAdmins] = useState<AdminRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      const { data, error } = await supabaseClient
        .from("admin_requests")
        .select("id, status, created_at, user_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const rows = data as AdminRequestRow[];
        const ids = rows.map((row) => row.user_id);
        const { data: profiles } = ids.length
          ? await supabaseClient
              .from("profiles")
              .select("id, full_name, email")
              .in("id", ids)
          : { data: [] as ProfileRow[] };

        const profileMap = new Map(
          (profiles ?? []).map((profile) => [profile.id, profile])
        );

        setRequests(
          rows.map((row) => {
            const profile = profileMap.get(row.user_id);
            return {
              id: row.id,
              status: row.status,
              createdAt: row.created_at,
              userId: row.user_id,
              name: profile?.full_name ?? "Member",
              email: profile?.email ?? "",
            };
          })
        );
      }

      const { data: adminData, error: adminError } = await supabaseClient
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (!adminError && adminData) {
        setAdmins(
          adminData.map((row) => ({
            id: row.id,
            status: "approved",
            createdAt: row.created_at,
            userId: row.id,
            name: row.full_name ?? "Admin",
            email: row.email ?? "",
          }))
        );
      }
      setLoading(false);
    };

    loadRequests();
  }, []);

  const approveRequest = async (requestId: string, userId: string) => {
    await supabaseClient
      .from("admin_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    await supabaseClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId);

    setRequests((prev) => prev.filter((req) => req.id !== requestId));
  };

  const rejectRequest = async (requestId: string) => {
    await supabaseClient
      .from("admin_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);
    setRequests((prev) => prev.filter((req) => req.id !== requestId));
  };

  const removeAdmin = async (profileId: string) => {
    await supabaseClient
      .from("profiles")
      .update({ role: "member" })
      .eq("id", profileId);
    setAdmins((prev) => prev.filter((admin) => admin.userId !== profileId));
  };

  const canManage = useMemo(() => user?.role === "super_admin", [user]);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h1 className="text-2xl font-semibold">Admin Access Requests</h1>
        <p className="text-white/70">Super Admin approves or rejects role upgrades.</p>
      </div>
      <Card className="p-6">
        <div className="divide-y divide-white/10">
          {loading ? (
            <div className="py-6 text-sm text-white/60">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="py-6 text-sm text-white/60">No requests yet.</div>
          ) : (
            requests.map((req) => (
            <div key={req.id} className="flex items-start gap-3 py-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-neon-blue">
                ⓘ
              </span>
              <div className="flex-1">
                <h3 className="font-medium">{req.name}</h3>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => rejectRequest(req.id)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  disabled={!canManage}
                  onClick={() => approveRequest(req.id, req.userId)}
                >
                  Approve
                </Button>
              </div>
            </div>
            ))
          )}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Current Admins</h2>
        <div className="divide-y divide-white/10">
          {loading ? (
            <div className="py-6 text-sm text-white/60">Loading admins...</div>
          ) : admins.length === 0 ? (
            <div className="py-6 text-sm text-white/60">No admins found.</div>
          ) : (
            admins.map((admin) => (
              <div key={admin.userId} className="flex items-start gap-3 py-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-neon-blue">
                  ✔
                </span>
                <div className="flex-1">
                  <h3 className="font-medium">{admin.name}</h3>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!canManage}
                    onClick={() => removeAdmin(admin.userId)}
                  >
                    Remove Admin
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminRequests;
