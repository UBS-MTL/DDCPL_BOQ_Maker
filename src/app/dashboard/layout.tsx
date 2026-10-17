"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Layers,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FolderTree,
  Building2,
  History,
  UserCheck,
  Menu,
  X,
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import GlobalSearch from "@/components/GlobalSearch";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Quotations", href: "/dashboard/quotations", icon: FileText },
  { label: "Products", href: "/dashboard/products", icon: Package },
  { label: "Categories", href: "/dashboard/categories", icon: FolderTree },
  { label: "Customers", href: "/dashboard/customers", icon: Users },
  { label: "Verticals", href: "/dashboard/verticals", icon: Layers },
  { label: "Solutions", href: "/dashboard/solutions", icon: Building2 },
];

const adminItems = [
  { label: "My Team", href: "/dashboard/team", icon: UserCheck },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const bottomItems = [
  { label: "History", href: "/dashboard/history", icon: History },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.push("/login");
      return;
    }
    const u = JSON.parse(stored);
    Promise.resolve().then(() => setUser(u));
  }, [router]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50/80 bg-pattern">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const NavItem = ({ item, isActive }: { item: typeof navItems[0]; isActive: boolean }) => (
    <Link
      href={item.href}
      onClick={() => setMobileOpen(false)}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100/50"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
      title={collapsed ? item.label : undefined}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
        isActive
          ? "bg-indigo-100"
          : "bg-transparent group-hover:bg-gray-100"
      }`}>
        <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-indigo-600" : ""}`} />
      </div>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  return (
    <div className="flex h-screen bg-gray-50/80 bg-pattern">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`fixed top-4 left-4 z-50 lg:hidden p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:bg-gray-50 transition-colors ${mobileOpen ? "hidden" : ""}`}
        title="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-100 transition-all duration-300 flex flex-col shadow-premium fixed inset-y-0 left-0 z-50 lg:static lg:z-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${collapsed ? "w-[72px]" : "w-64"}`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center border-b border-gray-100/80 ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          {!collapsed && (
            <img src="/logo.png" alt="DDCPL" className="h-8 w-auto" />
          )}
          {collapsed && (
            <img src="/logo.png" alt="DDCPL" className="h-7 w-auto" />
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center py-2 border-b border-gray-100/80">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
          <div className="px-3 mb-2">
            {!collapsed && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Menu</span>}
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return <NavItem key={item.href} item={item} isActive={isActive} />;
          })}

          {user?.role === "admin" && (
            <div className="pt-4 mt-4 border-t border-gray-100/80">
              <div className="px-3 mb-2">
                {!collapsed && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Admin</span>}
              </div>
              {adminItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return <NavItem key={item.href} item={item} isActive={isActive} />;
              })}
            </div>
          )}

          <div className="pt-4 mt-4 border-t border-gray-100/80">
            <div className="px-3 mb-2">
              {!collapsed && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">More</span>}
            </div>
            {bottomItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return <NavItem key={item.href} item={item} isActive={isActive} />;
            })}
          </div>
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100/80">
          {!collapsed ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50/80">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 via-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm shadow-indigo-200/50 flex-shrink-0">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate leading-tight">{user?.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur border-b border-gray-100/80">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-3 flex items-center justify-end gap-3">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </div>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
