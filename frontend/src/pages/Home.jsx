import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { REPORT_ROLES } from "../constants";

export function Home() {
  const { user, logout } = useAuth();
  const canSeeReports = user?.roles.some((role) => REPORT_ROLES.includes(role));

  return (
    <div className="page">
      <nav className="navbar">
        <span>medi360</span>
        <div className="nav-links">
          {canSeeReports && <Link to="/reports">Reports</Link>}
          <button onClick={logout}>Αποσύνδεση</button>
        </div>
      </nav>
      <p>Καλώς ήρθες, {user?.full_name}.</p>
    </div>
  );
}
