import { NavLink } from "react-router-dom";

const base =
  "block rounded-xl px-3 py-2 text-sm hover:bg-slate-50 border border-transparent";
const active =
  "border-slate-200 bg-white font-semibold";

export default function Sidebar({ role }) {
  const items = [
    { to: rolePath(role), label: "Appointments", roles: ["admin","doctor","secretary","patient"] },
    { to: "/patients", label: "Patients", roles: ["admin","doctor","secretary"] },
    { to: "/billing",  label: "Billing",  roles: ["admin","secretary"] },
    { to: "/availability", label: "Availability", roles: ["admin","secretary"] },
    { to: "/services", label: "Services", roles: ["admin","secretary","doctor"] },
    { to: "/inventory", label: "Inventory", roles: ["admin","secretary"] },
    { to: "/my-files", label: "My files", roles: ["patient"] },
    { to: "/book", label: "Book", roles: ["patient"] },
  ];

  return (
    <aside className="w-full sm:w-60 shrink-0">
      <nav className="sticky top-16 space-y-2">
        {items.filter(i => i.roles.includes(role)).map(i => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) => `${base} ${isActive ? active : ""}`}
          >
            {i.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function rolePath(role){
  if (role === "admin") return "/admin";
  if (role === "doctor") return "/doctor";
  if (role === "secretary") return "/secretary";
  return "/patient";
}
