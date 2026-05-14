import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import SlotMachine from "@/components/SlotMachine";
import StarRating from "@/components/StarRating";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Sparkles, Trophy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PickResult {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  emoji?: string | null;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [useWeights, setUseWeights] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState<PickResult[] | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<PickResult | null>(null);
  const [ratingScore, setRatingScore] = useState(0);

  const { data: restaurantList } = trpc.restaurant.list.useQuery();
  const pickMutation = trpc.restaurant.randomPick.useMutation();
  const rateMutation = trpc.rating.upsert.useMutation();

  const allRestaurants = useMemo(() => {
    return (restaurantList || []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji }));
  }, [restaurantList]);

  const handleSpin = async () => {
    if (allRestaurants.length === 0) {
      toast.error("还没有餐厅数据，请先添加餐厅");
      return;
    }

    setIsSpinning(true);
    setResults(null);
    setSelectedResult(null);

    try {
      const picks = await pickMutation.mutateAsync({ useWeights });
      // Wait for slot machine animation to finish
      setTimeout(() => {
        setResults(picks);
        setIsSpinning(false);
      }, 3200);
    } catch (error: any) {
      setIsSpinning(false);
      toast.error(error.message || "抽取失败");
    }
  };

  const handleSelectResult = (result: PickResult) => {
    setSelectedResult(result);
    setRatingScore(0);
    setShowResultDialog(true);
  };

  const handleRate = async () => {
    if (!selectedResult || ratingScore === 0) return;
    try {
      await rateMutation.mutateAsync({
        restaurantId: selectedResult.id,
        score: ratingScore,
      });
      toast.success("评分成功！");
      setShowResultDialog(false);
    } catch {
      toast.error("评分失败，请重试");
    }
  };

  // Count duplicates in results
  const getResultSummary = () => {
    if (!results) return null;
    const counts = new Map<number, { count: number; restaurant: PickResult }>();
    results.forEach(r => {
      const existing = counts.get(r.id);
      if (existing) {
        existing.count++;
      } else {
        counts.set(r.id, { count: 1, restaurant: r });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  };

  const resultSummary = getResultSummary();

  return (
    <div className="container py-8 sm:py-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="text-center mb-10 sm:mb-14"
      >
        <h1
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-3"
          style={{ fontFamily: "'Noto Serif SC', serif" }}
        >
          今天吃什么？
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
          让命运为你做出选择，告别选择困难
        </p>
      </motion.div>

      {/* Slot Machine */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-card rounded-3xl border border-border/60 shadow-xl shadow-black/[0.03] p-6 sm:p-8">
          <SlotMachine
            results={results}
            isSpinning={isSpinning}
            allRestaurants={allRestaurants}
          />

          {/* Options */}
          <div className="flex items-center justify-center gap-3 mt-6 mb-6">
            <Switch
              id="use-weights"
              checked={useWeights}
              onCheckedChange={setUseWeights}
              disabled={isSpinning}
            />
            <Label htmlFor="use-weights" className="text-sm text-muted-foreground cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              以评分作为权重
            </Label>
          </div>

          {/* Spin Button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              disabled={isSpinning}
              onClick={handleSpin}
              className="relative px-10 py-6 text-base font-semibold rounded-2xl bg-gradient-to-r from-[oklch(0.75_0.15_75)] to-[oklch(0.6_0.12_25)] text-white shadow-lg shadow-[oklch(0.75_0.15_75/0.25)] hover:shadow-xl hover:shadow-[oklch(0.75_0.15_75/0.35)] transition-all duration-300 active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
            >
              <Dices className="w-5 h-5 mr-2" />
              {isSpinning ? "抽取中..." : "开始抽取"}
            </Button>
          </div>


        </div>
      </motion.div>

      {/* Results Section */}
      <AnimatePresence>
        {results && resultSummary && !isSpinning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="max-w-2xl mx-auto mt-8"
          >
            <div className="bg-card rounded-2xl border border-border/60 shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-[oklch(0.75_0.15_75)]" />
                <h3 className="font-semibold text-lg">抽取结果</h3>
              </div>

              <div className="space-y-3">
                {resultSummary.map(({ restaurant, count }) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 cursor-pointer group ${
                      count >= 2
                        ? "bg-[oklch(0.75_0.15_75/0.08)] border border-[oklch(0.75_0.15_75/0.2)] hover:border-[oklch(0.75_0.15_75/0.4)]"
                        : "bg-secondary/50 border border-transparent hover:border-border"
                    }`}
                    onClick={() => handleSelectResult(restaurant)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        count >= 2
                          ? "bg-[oklch(0.75_0.15_75)] text-white"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {count}
                      </div>
                      <div>
                        <p className="font-medium">{restaurant.name}</p>
                        {restaurant.category && (
                          <p className="text-xs text-muted-foreground">{restaurant.category}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      <span>选择并评分</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {resultSummary.some(r => r.count >= 2) && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  🎉 有餐厅出现了多次！命运的暗示？
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl" style={{ fontFamily: "'Noto Serif SC', serif" }}>
              {selectedResult?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedResult?.description && (
              <p className="text-sm text-muted-foreground mb-4">{selectedResult.description}</p>
            )}
            {isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm font-medium">为这家餐厅评分：</p>
                <StarRating value={ratingScore} onChange={setRatingScore} size="lg" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                登录后可以为餐厅评分，影响未来的抽取权重
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowResultDialog(false)}>
              {isAuthenticated ? "跳过" : "关闭"}
            </Button>
            {isAuthenticated && (
              <Button
                onClick={handleRate}
                disabled={ratingScore === 0 || rateMutation.isPending}
                className="bg-gradient-to-r from-[oklch(0.75_0.15_75)] to-[oklch(0.6_0.12_25)] text-white"
              >
                提交评分
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
