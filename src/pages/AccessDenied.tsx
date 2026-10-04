import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";

const AccessDenied = () => {
  return (
    <div className="glass-card p-10 text-center">
      <h1 className="text-2xl font-semibold">Access Restricted</h1>
      <p className="text-white/70 mt-2">
        You do not have permission to view this page. Please contact the Super Admin.
      </p>
      <div className="mt-4">
        <Link to="/">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};

export default AccessDenied;
