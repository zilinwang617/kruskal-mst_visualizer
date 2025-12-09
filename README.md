# Kruskal MST Visualizer

An interactive visualizer for Kruskal 的最小生成树算法，使用 React、Vite 和 Tailwind CSS 构建。应用通过随机生成连通图，展示并查集 (Union-Find) 的合并过程，并以颜色和列表高亮的形式演示每一步的边选择。

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
