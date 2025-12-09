# Kruskal MST Visualizer

一个基于 React、Vite 与 Tailwind CSS 的 Kruskal 最小生成树算法可视化工具。应用会随机生成连通图，使用并查集 (Union-Find) 展示每条边的筛选与合并过程，并以颜色和列表高亮同步呈现当前状态。

## 开发与运行

```bash
npm install
npm run dev      # 开发模式，默认端口 5173
npm run build    # 生产构建
npm run lint     # 代码检查
```

## 主要功能

- 随机生成节点与边，并按权重排序展示。
- 单步或自动播放 Kruskal 算法过程，实时更新最小生成树权重。
- 使用颜色区分并查集集合，列表与画布同步高亮当前扫描/接受/拒绝的边。
- 支持重新生成图或重置当前算法状态。
