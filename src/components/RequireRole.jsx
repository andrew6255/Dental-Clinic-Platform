import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useRoleClinic from "../hooks/useRoleClinic";

// roles: array of allowed roles (e.g., ["admin","secretary"])
export default function RequireRole({ roles, children }) {
  const nav = useNavigate();
  const { role, loading } = useRoleClinic();

  useEffect(() => {
    if (loading) return;
    if (!role) return nav("/login");
    if (roles && roles.length && !roles.includes(role)) nav("/");
  }, [role, loading, nav, roles]);

  if (loading) return <div className="p-6">Loading…</div>;
  return children;
}
