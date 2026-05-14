import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function Auth() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("登录成功！");
      utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("注册成功！");
      utils.auth.me.invalidate();
      navigate("/");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ username, password });
    } else {
      if (!name.trim()) {
        toast.error("请输入昵称");
        return;
      }
      registerMutation.mutate({ username, password, name: name.trim() });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border-border/60 shadow-xl shadow-black/[0.04]">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-[oklch(0.75_0.15_75)] to-[oklch(0.6_0.12_25)] flex items-center justify-center shadow-lg mb-4">
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {mode === "login" ? "欢迎回来" : "创建账号"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {mode === "login" ? "登录后可评分、管理黑名单和添加餐厅" : "注册一个账号开始使用"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">昵称</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="你的昵称"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={32}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={64}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[oklch(0.75_0.15_75)] to-[oklch(0.6_0.12_25)] text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.97]"
                disabled={isPending}
              >
                {isPending ? "请稍候..." : mode === "login" ? "登录" : "注册"}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setUsername("");
                  setPassword("");
                  setName("");
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === "login" ? "没有账号？点击注册" : "已有账号？点击登录"}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
