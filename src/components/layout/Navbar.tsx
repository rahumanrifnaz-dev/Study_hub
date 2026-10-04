import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/auth-context";
import EELogo from "../EELogo";

const Navbar = ({ isAdmin }: { isAdmin?: boolean }) => {
  const { user, logout } = useAuth();

  return (
    <header className={`border-b border-white/10 backdrop-blur-glass bg-white/5 sticky top-0 z-40 ${isAdmin ? "admin-navbar" : ""}`}>
      <div className="container-page h-16 flex items-center px-1 md:px-2" role="navigation" aria-label="Main navigation">
        <EELogo />
        <Link to="/" className="font-semibold text-lg tracking-wide text-left mr-auto" aria-label="Home">
          Electrical Engineering_23
        </Link>
        <nav className="flex items-center gap-2 lg:gap-4 text-sm ml-auto" aria-label="User menu">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? "text-neon-blue" : "text-white/80 hover:text-white"
            }
          >
            Dashboard
          </NavLink>
          {user?.role === "super_admin" && (
            <NavLink
              to="/admin/requests"
              className={({ isActive }) =>
                isActive ? "text-neon-purple" : "text-white/80 hover:text-white"
              }
            >
              Control
            </NavLink>
          )}
          {user ? (
            <button className="btn-download btn-danger" style={{ minWidth: 0, padding: '0.5rem 1rem', borderRadius: '0.75rem', fontWeight: 600 }} onClick={logout}>
              Logout
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
