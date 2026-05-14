import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { UtensilsCrossed, LogOut, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/", label: "抽取餐厅" },
  { path: "/restaurants", label: "餐厅管理" },
  { path: "/blacklist", label: "黑名单" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[oklch(0.75_0.15_75)] to-[oklch(0.6_0.12_25)] flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-200">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              今天吃什么
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <span
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    location === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{user?.name || "用户"}</span>
                  {user?.role === "admin" && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      管理员
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="bg-gradient-to-r from-primary to-[oklch(0.6_0.12_25)] text-primary-foreground shadow-sm"
                onClick={() => navigate("/auth")}
              >
                登录
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="md:hidden border-t border-border/50 overflow-hidden"
            >
              <div className="container py-4 space-y-2">
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <span
                      className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        location === item.path
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
                <div className="pt-2 border-t border-border/50">
                  {isAuthenticated ? (
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-muted-foreground">{user?.name || "用户"}</span>
                      <Button variant="ghost" size="sm" onClick={() => logout()}>
                        <LogOut className="w-4 h-4 mr-1" /> 退出
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                    >
                      登录 / 注册
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="container text-center text-sm text-muted-foreground">
          <p>今天吃什么 — 让选择不再困难</p>
        </div>
      </footer>
    </div>
  );
}
