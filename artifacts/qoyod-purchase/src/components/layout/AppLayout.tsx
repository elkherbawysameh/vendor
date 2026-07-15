import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Receipt,
  Users,
  UserPlus,
  Tags,
  BarChart3,
  FileText,
  LogOut,
  Menu,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const role = user.role;
  const isManager = role === "admin" || role === "accounts_manager" || role === "accounts_employee";
  const isAdminOrAccountsManager = role === "admin" || role === "accounts_manager";

  const navigation = [
    { name: "Dashboard", nameAr: "لوحة القيادة", href: "/", icon: LayoutDashboard, exact: true },
    { name: "Requests", nameAr: "الطلبات", href: "/requests", icon: ShoppingCart },
    { name: "New Request", nameAr: "طلب جديد", href: "/requests/new", icon: PlusCircle },
    { name: "Refund Request", nameAr: "طلب استرداد", href: "/refunds/new", icon: Receipt },
    ...(isManager ? [
      { name: "Vendors", nameAr: "الموردين", href: "/vendors", icon: Users },
    ] : []),
    ...(isAdminOrAccountsManager ? [
      { name: "Categories", nameAr: "الفئات", href: "/categories", icon: Tags },
      { name: "Reports", nameAr: "التقارير", href: "/reports", icon: BarChart3 },
    ] : []),
    { name: "Policies", nameAr: "السياسات", href: "/policies", icon: FileText },
    ...(role === "admin" ? [
      { name: "Admins", nameAr: "المستخدمين", href: "/users", icon: UserPlus },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Qoyod" className="h-20 w-45" />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "w-64 bg-sidebar border-r border-sidebar-border flex-col h-screen sticky top-0 transition-transform duration-300 z-50",
        isMobileMenuOpen ? "fixed inset-y-0 left-0 translate-x-0" : "max-md:-translate-x-full fixed md:relative"
      )}>
        <div className="p-6 flex items-center border-b border-sidebar-border/50">
          <div className="bg-white rounded-lg px-3 py-2">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Qoyod" className="h-20 w-45" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
          {navigation.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer group",
                  isActive 
                    ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground")} />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className={cn("text-[10px] leading-tight", isActive ? "text-primary-foreground/80" : "text-sidebar-foreground/60")}>{item.nameAr}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate text-sidebar-foreground" title={user.email}>{user.name || user.email.split('@')[0]}</span>
              <Badge variant="outline" className="w-fit text-[10px] mt-0.5 capitalize px-1 py-0 h-4 text-sidebar-foreground/80 border-sidebar-border">
                {role.replace('_', ' ')}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout / تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen bg-muted/20">
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 px-6 flex items-center justify-between hidden md:flex">
          <h1 className="text-lg font-semibold text-foreground capitalize">
            {location === '/' ? 'Dashboard' : location.split('/')[1].replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive"></span>
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
        <footer className="py-4 text-center text-xs text-muted-foreground border-t">
          This system created by Sameh Elkherbawy. All rights reserved.
        </footer>
      </main>
      
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
