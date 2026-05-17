import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ban, Undo2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { listMyBlacklist, listRestaurants, removeFromBlacklist } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

export default function Blacklist() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: restaurants } = useQuery({
    queryKey: queryKeys.restaurants,
    queryFn: listRestaurants,
  });
  const { data: myBlacklist, isLoading } = useQuery({
    queryKey: queryKeys.myBlacklist,
    queryFn: listMyBlacklist,
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: ({ restaurantId }: { restaurantId: number }) => removeFromBlacklist(restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myBlacklist });
      toast.success("已从黑名单移除");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const blacklistedRestaurants = useMemo(() => {
    if (!myBlacklist || !restaurants) return [];
    const blacklistIds = new Set(myBlacklist.map(b => b.restaurantId));
    return restaurants.filter(r => blacklistIds.has(r.id));
  }, [myBlacklist, restaurants]);

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <ShieldOff className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">需要登录</h2>
        <p className="text-muted-foreground mb-6">登录后可以管理你的个人黑名单</p>
        <Button
          variant="outline"
          onClick={() => { window.location.href = getLoginUrl(); }}
        >
          立即登录
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
          我的黑名单
        </h1>
        <p className="text-muted-foreground mt-1">
          黑名单中的餐厅不会出现在抽取结果中
        </p>
      </motion.div>

      {/* Blacklist Items */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : blacklistedRestaurants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Ban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            黑名单为空，所有餐厅都会参与抽取
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2">
            在餐厅列表中点击"屏蔽"可以将餐厅加入黑名单
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {blacklistedRestaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/60 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium">{restaurant.name}</h3>
                  {restaurant.category && (
                    <span className="text-xs text-muted-foreground">{restaurant.category}</span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => removeMutation.mutate({ restaurantId: restaurant.id })}
                disabled={removeMutation.isPending}
              >
                <Undo2 className="w-3.5 h-3.5" /> 移除
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      {blacklistedRestaurants.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          共 {blacklistedRestaurants.length} 家餐厅被屏蔽
        </motion.p>
      )}
    </div>
  );
}
