# 小猫宝宝小菜单 · 本地效果预览

这是“小猫宝宝小菜单”的浏览器设计稿与交互原型。它先用于快速确认界面和体验，稳定后再把相同的数据、视觉变量与交互迁回微信小程序。

## 当前内容

- 当前家常菜 31 道、减脂餐 17 道、22 种带上市月份和吃法的水果，以及 24 类带店铺收藏页的狗狗大餐；以后可用正式内容库继续增加
- 普通菜品采用“主图 + 用料 + 分步骤做法”，水果采用“主图 + 上市季节 + 不同吃法”，狗狗大餐采用“主图 + 好吃的店铺”；旧做法长图仅作兼容
- 系列、分类、搜索、随机推荐、去重选菜
- 今晚菜单、保存历史、再次选择
- 浏览器草稿支持普通菜品的新增、编辑、下架、恢复与删除；水果和狗狗大餐只通过正式 Excel 内容库维护
- 正式菜品库一键更新，浏览器草稿不会上传网络

## 以后自己增加正式菜品

正式内容都放在：`X:\Codex\project_2\yibao-menu-content`

1. 封面放入对应系列的 `covers` 文件夹。
2. 用 Excel 打开 `菜品内容库.xlsx`：普通菜品填写“菜品/用料/步骤”，水果填写“菜品/水果吃法”，狗狗大餐的餐厅填写到“好吃的店铺”。
3. 只有需要兼容旧做法长图的普通菜品才在同系列 `details` 放入同名图片；水果和狗狗大餐不需要详情长图。
4. 双击 `更新菜单.cmd`，成功后刷新预览页。

脚本会自动校验、生成稳定 ID、将封面处理为 360×360、按需处理旧做法图，并更新网页与微信小程序数据。`recipes.csv` 是生成快照，请勿手改。完整说明见 [正式菜品库说明](../yibao-menu-content/使用说明.md)。

## 本地运行

```powershell
cd X:\Codex\project_2\yibao-menu-preview
npm.cmd run dev
```

打开 `http://localhost:3000/`。

也可以在项目根目录运行 `npm run dev` 启动本地预览。

## 常用修改位置

- 全局颜色、圆角、间距：`app/globals.css` 顶部的 `:root`
- 页面与交互：`app/components/MenuApp.tsx`
- 自动生成的菜品数据：`app/data/recipes.generated.ts`（不要手改）
- 正式内容工作簿：`..\yibao-menu-content\菜品内容库.xlsx`
- 筛选与本机存储：`app/lib/menu-state.ts`
- 封面与做法图：`public/recipes/covers`、`public/recipes/details`
- 自动卡片小狗：`public/decorations/dogs`；分配逻辑在 `app/components/MenuApp.tsx`
- Magic 随机头像：根目录 `..\头像` 保存原图，优化副本在 `public/avatars`，抽取清单在 `app/data/avatars.js`

## 校验

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run content:check
node ..\tools\validate-web-preview.mjs
```

本地图片上传目前使用浏览器存储，特别大的详情图可能超过容量；迁入微信小程序时会替换为微信文件沙箱或云存储。

