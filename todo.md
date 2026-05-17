# Project TODO

## 数据库设计
- [x] 创建 restaurants 表（餐厅名称、描述、创建者、创建时间）
- [x] 创建 ratings 表（用户ID、餐厅ID、评分）
- [x] 创建 blacklist 表（用户ID、餐厅ID）
- [x] 执行数据库迁移

## 后端 API
- [x] 餐厅 CRUD（增删改查）
- [x] 批量添加餐厅
- [x] 评分功能（创建/更新评分）
- [x] 获取餐厅平均评分
- [x] 黑名单管理（添加/移除）
- [x] 随机抽取餐厅（支持评分权重、排除黑名单）
- [x] 管理员权限控制

## 前端页面
- [x] 老虎机式抽取界面（三个滚动窗口、动画效果）
- [x] 抽取选项（是否使用评分权重）
- [x] 餐厅列表页面（查看所有餐厅、评分）
- [x] 餐厅管理页面（添加、批量添加、管理员编辑/删除）
- [x] 评分功能（星级评分UI）
- [x] 黑名单管理页面
- [x] 用户认证与权限展示
- [x] 优雅精致的视觉设计风格

## 测试
- [x] 前端业务工具单元测试

## 调整需求
- [x] 抽取餐厅不需要登录（改为 publicProcedure）
- [x] 前端移除抽取功能的登录限制提示

## 新增需求 - 预置餐厅 & emoji 图标
- [x] 数据库预置9家餐厅（麻辣烫、烤鱼、肉夹駍、杀猪粉、南昌拌粉、跷脚牛肉、炒饭、KFC、沙拉）
- [x] 为每家餐厅设置 emoji 图标
- [x] 老虎机滚动时使用 emoji 图标展示

## 新增需求 - 账号系统 & 动画优化
- [x] 实现 Supabase Auth 用户名密码注册/登录
- [x] 实现 Supabase OAuth 第三方登录入口
- [x] 优化老虎机动画流畅度，移除"等待抽取"文字
- [x] 扩展老虎机高亮边框，包住上方 emoji 和下方餐厅名

## 新增需求 - GitHub Pages + Supabase 部署
- [x] 移除 Node/Express/tRPC/Drizzle 运行面
- [x] 使用 Supabase Postgres migrations + RLS 管理数据
- [x] 使用 Supabase Edge Functions 承载注册、用户名登录、OAuth profile sync 和随机抽取
- [x] 使用 GitHub Actions 部署 Supabase migrations/functions 与 GitHub Pages 静态站点
