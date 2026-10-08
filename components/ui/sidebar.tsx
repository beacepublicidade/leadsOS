"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Users, MessageSquare, FileText, Target, BarChart2,
  Sparkles, Monitor, Building2, Plug, Mail, UserCog, Search,
  Settings, ChevronLeft, ChevronRight, LogOut, Menu, Megaphone, TrendingUp,
  Briefcase, FileCheck2, Wallet,
} from "lucide-react";

interface NavItem {
  href:   string;
  label:  string;
  icon:   React.ElementType;
  badge?: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard",           label: "Home",       icon: Home          },
  { href: "/dashboard/leads",     label: "Leads",      icon: Users         },
  { href: "/dashboard/conversas", label: "Conversas",  icon: MessageSquare },
  { href: "/dashboard/propostas", label: "Propostas",  icon: FileText      },
  { href: "/dashboard/prospecao", label: "Prospecção", icon: Target        },
  { href: "/dashboard/relatorios",  label: "Relatórios",  icon: BarChart2  },
  { href: "/dashboard/bi",          label: "Central BI",  icon: TrendingUp },
  { href: "/dashboard/campanhas",   label: "Campanhas",   icon: Megaphone  },
  { href: "/dashboard/insights",    label: "Insights IA", icon: Sparkles   },
  { href: "/dashboard/war-room",  label: "War Room",   icon: Monitor       },
  { href: "/dashboard/agencia",     label: "Agência",    icon: Briefcase     },
  { href: "/dashboard/juridico",    label: "Jurídico",   icon: FileCheck2    },
  { href: "/dashboard/financeiro",  label: "Financeiro", icon: Wallet        },
];

const NAV_ADMIN: NavItem[] = [
  { href: "/dashboard/clients",      label: "Clientes",      icon: Building2 },
  { href: "/dashboard/integracoes",  label: "Integrações",   icon: Plug      },
  { href: "/dashboard/templates",    label: "Templates",     icon: Mail      },
  { href: "/dashboard/users",        label: "Usuários",      icon: UserCog   },
  { href: "/dashboard/logs",         label: "Logs",          icon: Search    },
  { href: "/dashboard/configuracoes",label: "Configurações", icon: Settings  },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed,   setCollapsed]   = useState(false);
  const [user,        setUser]        = useState<{ name?: string; profile?: string } | null>(null);
  const [mobile,      setMobile]      = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(j => {
      if (j.user) setUser(j.user);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const content = document.querySelector(".dashboard-content");
    if (content) {
      if (collapsed && !mobile) content.classList.add("collapsed");
      else content.classList.remove("collapsed");
    }
  }, [collapsed, mobile]);

  const isAdmin = !user || user.profile === "admin";
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const sidebarStyle: React.CSSProperties = {
    position:      "fixed",
    top:           0,
    left:          mobile ? (mobileOpen ? 0 : -280) : 0,
    bottom:        0,
    width:         mobile ? 260 : collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
    background:    "var(--bg-surface)",
    borderRight:   "1px solid var(--border)",
    display:       "flex",
    flexDirection: "column",
    zIndex:        40,
    transition:    "width 0.25s ease, left 0.25s ease",
    overflowX:     "hidden",
    overflowY:     "auto",
  };

  function NavLink({ item }: { item: NavItem }) {
    const active   = isActive(item.href);
    const Icon     = item.icon;
    const isCollapsed = collapsed && !mobile;

    return (
      <button
        onClick={() => { router.push(item.href); if (mobile) setMobileOpen(false); }}
        title={isCollapsed ? item.label : undefined}
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            9,
          padding:        isCollapsed ? "9px 0" : "8px 11px",
          justifyContent: isCollapsed ? "center" : "flex-start",
          width:          "100%",
          background:     active ? "var(--accent-light)" : "transparent",
          border:         active ? "1px solid var(--accent-border)" : "1px solid transparent",
          borderRadius:   "var(--radius)",
          color:          active ? "var(--accent)" : "var(--text-secondary)",
          cursor:         "pointer",
          fontSize:       13,
          fontWeight:     active ? 600 : 500,
          transition:     "all var(--transition)",
          whiteSpace:     "nowrap",
          overflow:       "hidden",
          marginBottom:   2,
        }}
        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"; }}
        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <Icon
          size={16}
          strokeWidth={active ? 2.2 : 1.8}
          style={{ flexShrink: 0 }}
        />
        {!isCollapsed && (
          <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
        )}
        {item.badge && !isCollapsed && (
          <span style={{
            background: "var(--accent)", color: "#fff",
            borderRadius: "var(--radius-full)", fontSize: 10,
            fontWeight: 700, padding: "1px 6px", flexShrink: 0,
          }}>
            {item.badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 39 }}
        />
      )}

      {/* Mobile hamburger */}
      {mobile && (
        <button
          onClick={() => setMobileOpen(o => !o)}
          style={{
            position: "fixed", top: 14, left: 14, zIndex: 50,
            background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius)", padding: "7px 9px", cursor: "pointer",
            color: "var(--text-primary)", display: "flex", alignItems: "center",
          }}
        >
          <Menu size={18} />
        </button>
      )}

      <aside style={sidebarStyle}>

        {/* Logo */}
        <div style={{
          padding:        collapsed && !mobile ? "18px 0" : "16px 14px",
          display:        "flex",
          alignItems:     "center",
          justifyContent: collapsed && !mobile ? "center" : "space-between",
          borderBottom:   "1px solid var(--border)",
          flexShrink:     0,
        }}>
          {(!collapsed || mobile) && (
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 30, height: 30,
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                borderRadius: 8, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff",
                boxShadow: "0 2px 8px rgba(124,58,237,0.4)",
              }}>L</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>LeadsOS</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: -1 }}>Comercial IA</div>
              </div>
            </div>
          )}
          {collapsed && !mobile && (
            <div style={{
              width: 30, height: 30,
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff",
              boxShadow: "0 2px 8px rgba(124,58,237,0.4)",
            }}>L</div>
          )}
          {!mobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              style={{
                background: "none", border: "none", color: "var(--text-muted)",
                cursor: "pointer", padding: 4, lineHeight: 1,
                borderRadius: "var(--radius-sm)", transition: "color var(--transition)",
                display: "flex", alignItems: "center",
              }}
              title={collapsed ? "Expandir" : "Recolher"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: collapsed && !mobile ? "12px 8px" : "12px 10px", overflowY: "auto" }}>
          <div style={{ marginBottom: 4 }}>
            {NAV.map(item => <NavLink key={item.href} item={item} />)}
          </div>

          {isAdmin && (
            <>
              {(!collapsed || mobile) && (
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  padding: "14px 12px 6px",
                }}>
                  Admin
                </div>
              )}
              {collapsed && !mobile && (
                <div style={{ height: 1, background: "var(--border)", margin: "10px 4px" }} />
              )}
              {NAV_ADMIN.map(item => <NavLink key={item.href} item={item} />)}
            </>
          )}
        </nav>

        {/* User profile */}
        <div style={{
          padding:   collapsed && !mobile ? "12px 8px" : "12px 10px",
          borderTop: "1px solid var(--border)",
          flexShrink: 0,
        }}>
          <button
            onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => router.push("/login")); }}
            title={collapsed && !mobile ? "Sair" : undefined}
            style={{
              display:        "flex",
              alignItems:     "center",
              gap:            9,
              width:          "100%",
              padding:        collapsed && !mobile ? "8px 0" : "8px 10px",
              justifyContent: collapsed && !mobile ? "center" : "flex-start",
              background:     "transparent",
              border:         "1px solid transparent",
              borderRadius:   "var(--radius)",
              cursor:         "pointer",
              transition:     "background var(--transition)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "var(--accent-light)", border: "1px solid var(--accent-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            {(!collapsed || mobile) && (
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.name ?? "Usuário"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                  <LogOut size={9} /> Sair
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
