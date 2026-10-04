
import React, { useEffect, useState } from "react";
import { apiClient } from "../../integrations/api/client";
import RoleManagement from "./RoleManagement";
import { useAuth } from "../../contexts/auth-context";

interface Activity {
  id: string;
  type: "upload" | "edit" | "delete";
  material_id: string;
  title: string;
  description: string;
  section_key: string;
  week_label: string;
  file_url: string;
  timestamp: string;
  full_name: string;
  email: string;
}


const AdminDashboard = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    apiClient
      .get<Activity[]>("/api/activity/latest", user?.apiToken)
      .then(setActivities)
      .catch(() => setError("Failed to load activity log."))
      .finally(() => setLoading(false));
  }, [user?.apiToken]);

  return (
    <div className="p-2 sm:p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">Admin Activity Log</h2>
      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-center text-red-400">{error}</div>
      ) : activities.length === 0 ? (
        <div className="text-center text-gray-400">No recent activity.</div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-lg bg-white/10 p-3 flex flex-col sm:flex-row sm:items-center gap-2 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold capitalize text-neon-blue">
                    {activity.type}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{activity.timestamp && new Date(activity.timestamp).toLocaleString()}</span>
                </div>
                <div className="text-sm text-white/90 truncate">
                  {activity.title || activity.section_key} {activity.week_label && `- ${activity.week_label}`}
                </div>
                {activity.description && (
                  <div className="text-xs text-white/60 truncate">{activity.description}</div>
                )}
                <div className="text-xs text-white/40 truncate">By: {activity.full_name} ({activity.email})</div>
              </div>
              <div className="flex flex-row gap-2 justify-end sm:justify-center">
                {activity.file_url && (
                  <a
                    href={activity.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary px-2 py-1 text-xs"
                  >
                    View File
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6">
        <RoleManagement />
      </div>
    </div>
  );
};

export default AdminDashboard;
