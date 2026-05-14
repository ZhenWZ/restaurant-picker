import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import StarRating from "@/components/StarRating";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Upload, Pencil, Trash2, Search, Store, Ban } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getLoginUrl } from "@/const";

export default function Restaurants() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [batchText, setBatchText] = useState("");

  const utils = trpc.useUtils();
  const { data: restaurants, isLoading } = trpc.restaurant.list.useQuery();
  const { data: myRatings } = trpc.rating.myRatings.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myBlacklist } = trpc.blacklist.list.useQuery(undefined, { enabled: isAuthenticated });

  const createMutation = trpc.restaurant.create.useMutation({
    onSuccess: () => {
      utils.restaurant.list.invalidate();
      toast.success("餐厅添加成功！");
      setShowAddDialog(false);
      setNewName("");
      setNewDescription("");
      setNewCategory("");
      setNewEmoji("");
    },
    onError: (err) => toast.error(err.message),
  });

  const batchCreateMutation = trpc.restaurant.batchCreate.useMutation({
    onSuccess: (data) => {
      utils.restaurant.list.invalidate();
      toast.success(`成功添加 ${data.count} 家餐厅！`);
      setShowBatchDialog(false);
      setBatchText("");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.restaurant.update.useMutation({
    onSuccess: () => {
      utils.restaurant.list.invalidate();
      toast.success("餐厅信息已更新");
      setShowEditDialog(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.restaurant.delete.useMutation({
    onSuccess: () => {
      utils.restaurant.list.invalidate();
      toast.success("餐厅已删除");
      setShowDeleteDialog(false);
      setDeletingId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const rateMutation = trpc.rating.upsert.useMutation({
    onSuccess: () => {
      utils.rating.myRatings.invalidate();
      utils.restaurant.list.invalidate();
      toast.success("评分已更新");
    },
    onError: (err) => toast.error(err.message),
  });

  const blacklistAddMutation = trpc.blacklist.add.useMutation({
    onSuccess: () => {
      utils.blacklist.list.invalidate();
      toast.success("已加入黑名单");
    },
    onError: (err) => toast.error(err.message),
  });

  const blacklistRemoveMutation = trpc.blacklist.remove.useMutation({
    onSuccess: () => {
      utils.blacklist.list.invalidate();
      toast.success("已从黑名单移除");
    },
    onError: (err) => toast.error(err.message),
  });

  const blacklistedIds = useMemo(() => {
    return new Set((myBlacklist || []).map(b => b.restaurantId));
  }, [myBlacklist]);

  const myRatingsMap = useMemo(() => {
    const map = new Map<number, number>();
    (myRatings || []).forEach(r => map.set(r.restaurantId, r.score));
    return map;
  }, [myRatings]);

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (!searchQuery.trim()) return restaurants;
    const q = searchQuery.toLowerCase();
    return restaurants.filter(
      r => r.name.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q)
    );
  }, [restaurants, searchQuery]);

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error("请输入餐厅名称");
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      category: newCategory.trim() || undefined,
      emoji: newEmoji.trim() || undefined,
    });
  };

  const handleBatchAdd = () => {
    const lines = batchText.split("\n").filter(l => l.trim());
    if (lines.length === 0) {
      toast.error("请输入至少一家餐厅");
      return;
    }
    const items = lines.map(line => {
      // Support format: "name | category | description | emoji" or just "name"
      const parts = line.split("|").map(p => p.trim());
      return {
        name: parts[0],
        category: parts[1] || undefined,
        description: parts[2] || undefined,
        emoji: parts[3] || undefined,
      };
    });
    batchCreateMutation.mutate({ restaurants: items });
  };

  const handleEdit = (restaurant: any) => {
    setEditingRestaurant({ ...restaurant });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!editingRestaurant) return;
    updateMutation.mutate({
      id: editingRestaurant.id,
      name: editingRestaurant.name,
      description: editingRestaurant.description || undefined,
      category: editingRestaurant.category || undefined,
      emoji: editingRestaurant.emoji || undefined,
    });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deletingId) deleteMutation.mutate({ id: deletingId });
  };

  return (
    <div className="container py-8 sm:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            餐厅列表
          </h1>
          <p className="text-muted-foreground mt-1">
            共 {restaurants?.length || 0} 家餐厅
          </p>
        </div>
        {isAuthenticated && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBatchDialog(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> 批量添加
            </Button>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="gap-2 bg-gradient-to-r from-[oklch(0.75_0.15_75)] to-[oklch(0.6_0.12_25)] text-white"
            >
              <Plus className="w-4 h-4" /> 添加餐厅
            </Button>
          </div>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative mb-6"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="搜索餐厅名称或分类..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 rounded-xl"
        />
      </motion.div>

      {/* Restaurant List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Store className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "没有找到匹配的餐厅" : "还没有餐厅，快来添加第一家吧！"}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((restaurant, index) => (
            <motion.div
              key={restaurant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.03, ease: [0.23, 1, 0.32, 1] }}
              className={`group relative bg-card rounded-2xl border border-border/60 p-5 hover:shadow-lg hover:shadow-black/[0.04] transition-all duration-300 ${
                blacklistedIds.has(restaurant.id) ? "opacity-60" : ""
              }`}
            >
              {blacklistedIds.has(restaurant.id) && (
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive">
                    已屏蔽
                  </span>
                </div>
              )}

              <div className="mb-3">
                <div className="flex items-center gap-2">
                  {restaurant.emoji && (
                    <span className="text-2xl">{restaurant.emoji}</span>
                  )}
                  <h3 className="font-semibold text-base">{restaurant.name}</h3>
                </div>
                {restaurant.category && (
                  <span className="inline-block text-xs text-muted-foreground mt-1 px-2 py-0.5 rounded-full bg-secondary">
                    {restaurant.category}
                  </span>
                )}
              </div>

              {restaurant.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {restaurant.description}
                </p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <StarRating
                  value={restaurant.rating.average}
                  readonly
                  size="sm"
                />
                <span className="text-xs text-muted-foreground">
                  {restaurant.rating.average.toFixed(1)} ({restaurant.rating.count})
                </span>
              </div>

              {/* User's rating */}
              {isAuthenticated && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">我的评分：</span>
                  <StarRating
                    value={myRatingsMap.get(restaurant.id) || 0}
                    onChange={(score) => rateMutation.mutate({ restaurantId: restaurant.id, score })}
                    size="sm"
                  />
                </div>
              )}

              {/* Actions */}
              {isAuthenticated && (
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  {blacklistedIds.has(restaurant.id) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1"
                      onClick={() => blacklistRemoveMutation.mutate({ restaurantId: restaurant.id })}
                    >
                      移出黑名单
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => blacklistAddMutation.mutate({ restaurantId: restaurant.id })}
                    >
                      <Ban className="w-3 h-3" /> 屏蔽
                    </Button>
                  )}

                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 gap-1 ml-auto"
                        onClick={() => handleEdit(restaurant)}
                      >
                        <Pencil className="w-3 h-3" /> 编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 gap-1 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(restaurant.id)}
                      >
                        <Trash2 className="w-3 h-3" /> 删除
                      </Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <div className="text-center mt-8">
          <p className="text-muted-foreground mb-3">登录后可以添加餐厅、评分和管理黑名单</p>
          <Button
            variant="outline"
            onClick={() => { window.location.href = getLoginUrl(); }}
          >
            立即登录
          </Button>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加餐厅</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>餐厅名称 *</Label>
              <Input
                placeholder="例如：海底捞"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Input
                placeholder="例如：火锅、川菜、日料"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Emoji 图标</Label>
              <Input
                placeholder="例如：🌶️🍲、🍗🍔"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                placeholder="简短描述（可选）"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAdd} disabled={createMutation.isPending}>
              {createMutation.isPending ? "添加中..." : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Add Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>批量添加餐厅</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              每行一家餐厅，格式：<code className="px-1.5 py-0.5 rounded bg-muted text-xs">名称 | 分类 | 描述 | emoji</code>
              <br />
              分类、描述和 emoji 可省略，只填名称也可以。
            </p>
            <Textarea
              placeholder={`海底捞 | 火锅 | 服务好 | 🌶️🍲\n西贝菜面村 | 西北菜\n麦当劳\n肯德基 | 快餐 | | 🍗🍔`}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>取消</Button>
            <Button onClick={handleBatchAdd} disabled={batchCreateMutation.isPending}>
              {batchCreateMutation.isPending ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑餐厅</DialogTitle>
          </DialogHeader>
          {editingRestaurant && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>餐厅名称</Label>
                <Input
                  value={editingRestaurant.name}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <Input
                  value={editingRestaurant.category || ""}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Emoji 图标</Label>
                <Input
                  value={editingRestaurant.emoji || ""}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, emoji: e.target.value })}
                  placeholder="例如：🌶️🍲"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={editingRestaurant.description || ""}
                  onChange={(e) => setEditingRestaurant({ ...editingRestaurant, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "保存中..." : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，相关的评分和黑名单记录也会被一并删除。确定要删除这家餐厅吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
