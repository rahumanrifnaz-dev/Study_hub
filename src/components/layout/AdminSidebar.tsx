import { NavLink } from "react-router-dom";

const AdminSidebar = ({ onNav }: { onNav?: () => void }) => {
  return (
    <aside className="glass-card p-4 h-fit">
      <h2 className="section-title mb-4">Admin Controls</h2>
      <nav className="flex flex-col gap-2 text-sm">
        <NavLink
          to="/admin"
          end
          className={({ isActive }) =>
            isActive
              ? "px-3 py-2 rounded-lg bg-white/15 text-white"
              : "px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          }
          onClick={onNav}
        >
          Admin Dashboard
        </NavLink>
        <NavLink
          to="/admin/requests"
          className={({ isActive }) =>
            isActive
              ? "px-3 py-2 rounded-lg bg-white/15 text-white"
              : "px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
          }
          onClick={onNav}
        >
          Access Requests
        </NavLink>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
