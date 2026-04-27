// lib/nav.ts
import {
  LayoutDashboard, CalendarDays, CalendarClock,
  Scissors, Clock, Users, Settings, Crown, UserCog,
} from "lucide-react";
import type { RolTenant } from "@/types";

export type SubItem = {
  label:            string;
  href:             string;
  icon?:            React.ElementType;
  soloPropietario?: boolean;
};

export type NavItem = {
  label:      string;
  href:       string;
  icon:       React.ElementType;
  soloAdmin?: boolean;
  children?:  SubItem[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",  icon: LayoutDashboard },
  { label: "Turnos",      href: "/turnos",     icon: CalendarDays },
  { label: "Calendario",  href: "/calendario", icon: CalendarClock },
  { label: "Servicios",   href: "/servicios",  icon: Scissors,   soloAdmin: true },
  { label: "Horarios",    href: "/horarios",   icon: Clock,      soloAdmin: true },
  { label: "Clientes",    href: "/clientes",   icon: Users },
  {
    label: "Configuración", href: "/configuracion", icon: Settings, soloAdmin: true,
    children: [
      { label: "Mi negocio",         href: "/configuracion",          icon: UserCog },
      { label: "Plan y suscripción", href: "/configuracion/plan",     icon: Crown,  soloPropietario: true },
      { label: "Usuarios",           href: "/configuracion/usuarios", icon: Users,  soloPropietario: true },
    ],
  },
];

export const ROUTE_LABELS: Record<string, string> = {
  dashboard:     "Dashboard",
  turnos:        "Turnos",
  calendario:    "Calendario",
  servicios:     "Servicios",
  horarios:      "Horarios",
  clientes:      "Clientes",
  configuracion: "Configuración",
  plan:          "Plan y suscripción",
  usuarios:      "Usuarios",
  nuevo:         "Nuevo",
  editar:        "Editar",
};

export function filtrarNavItems(items: NavItem[], rol: RolTenant): NavItem[] {
  const esAdmin = rol === "ADMINISTRADOR" || rol === "PROPIETARIO";
  return items.filter((i) => !i.soloAdmin || esAdmin);
}