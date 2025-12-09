import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Info,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  StepForward,
  X,
} from 'lucide-react';

const SET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#f43f5e', '#64748b', '#a16207', '#be123c',
];

const GRAPH_READY_MESSAGE = '图已生成。边已按权重排序。';

const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(i) {
    if (this.parent[i] === i) return i;
    this.parent[i] = this.find(this.parent[i]);
    return this.parent[i];
  }

  union(i, j) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
      return true;
    }
    return false;
  }
}

const EdgeListItem = ({ edge, isCurrent, state }) => {
  const itemRef = useRef(null);

  useEffect(() => {
    if (isCurrent && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrent]);

  let itemClass = 'flex items-center justify-between p-3 rounded-md border text-sm transition-all duration-300 ';

  if (isCurrent) {
    itemClass += 'border-yellow-400 bg-yellow-50 shadow-md transform scale-105 z-10';
  } else if (state === 'accepted') {
    itemClass += 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-80';
  } else if (state === 'rejected') {
    itemClass += 'border-red-100 bg-red-50 text-red-400 opacity-50 line-through decoration-red-400';
  } else {
    itemClass += 'border-slate-100 bg-white text-slate-500 hover:bg-slate-50';
  }

  return (
    <div ref={itemRef} className={itemClass}>
      <div className="flex items-center gap-3">
        <span className={`font-mono font-bold ${isCurrent ? 'text-yellow-600' : ''}`}>
          {edge.weight}
        </span>
        <span className="text-xs text-slate-400">
          {edge.u} ↔ {edge.v}
        </span>
      </div>
      <div>
        {state === 'accepted' && <Check size={14} className="text-emerald-500" />}
        {state === 'rejected' && <X size={14} className="text-red-400" />}
        {isCurrent && <Loader2 size={14} className="text-yellow-600 animate-spin" />}
      </div>
    </div>
  );
};

export default function App() {
  const buildGraph = useCallback(() => {
    const width = 800;
    const height = 500;
    const nodeCount = 12;
    const newNodes = [];

    for (let i = 0; i < nodeCount; i += 1) {
      let x;
      let y;
      let tooClose;
      let attempts = 0;
      do {
        x = 50 + Math.random() * (width - 100);
        y = 50 + Math.random() * (height - 100);
        tooClose = newNodes.some((n) => distance(n, { x, y }) < 80);
        attempts += 1;
      } while (tooClose && attempts < 100);
      newNodes.push({ id: i, x, y });
    }

    const possibleEdges = [];
    for (let i = 0; i < nodeCount; i += 1) {
      for (let j = i + 1; j < nodeCount; j += 1) {
        const dist = Math.floor(distance(newNodes[i], newNodes[j]));
        if (dist < 350) {
          possibleEdges.push({
            id: `${i}-${j}`,
            u: i,
            v: j,
            weight: Math.floor(dist / 5),
          });
        }
      }
    }

    const finalEdges = possibleEdges.filter(() => Math.random() > 0.3);
    const sorted = [...finalEdges].sort((a, b) => a.weight - b.weight);

    const initialColors = {};
    newNodes.forEach((n, idx) => {
      initialColors[n.id] = idx % SET_COLORS.length;
    });

    const initialEdgeStates = {};
    finalEdges.forEach((e) => {
      initialEdgeStates[e.id] = 'pending';
    });

    return {
      nodes: newNodes,
      edges: finalEdges,
      sortedEdges: sorted,
      nodeSetColors: initialColors,
      edgeStates: initialEdgeStates,
      uf: new UnionFind(nodeCount),
    };
  }, []);

  const initialGraph = useMemo(() => buildGraph(), [buildGraph]);

  const [nodes, setNodes] = useState(initialGraph.nodes);
  const [edges, setEdges] = useState(initialGraph.edges);
  const [sortedEdges, setSortedEdges] = useState(initialGraph.sortedEdges);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mstWeight, setMstWeight] = useState(0);
  const [statusMessage, setStatusMessage] = useState(GRAPH_READY_MESSAGE);
  const [nodeSetColors, setNodeSetColors] = useState(initialGraph.nodeSetColors);
  const [edgeStates, setEdgeStates] = useState(initialGraph.edgeStates);
  const ufRef = useRef(initialGraph.uf);

  const generateGraph = useCallback(() => {
    const newGraph = buildGraph();

    setIsPlaying(false);
    setCurrentStep(-1);
    setMstWeight(0);
    setStatusMessage(GRAPH_READY_MESSAGE);

    setNodes(newGraph.nodes);
    setEdges(newGraph.edges);
    setSortedEdges(newGraph.sortedEdges);
    setNodeSetColors(newGraph.nodeSetColors);
    setEdgeStates(newGraph.edgeStates);
    ufRef.current = newGraph.uf;
  }, [buildGraph]);

  const nextStep = useCallback(() => {
    if (currentStep >= sortedEdges.length - 1) {
      setIsPlaying(false);
      setStatusMessage('算法完成！最小生成树已构建。');
      return;
    }

    const nextIdx = currentStep + 1;
    const edge = sortedEdges[nextIdx];
    const { u, v, id, weight } = edge;

    const rootU = ufRef.current.find(u);
    const rootV = ufRef.current.find(v);

    const newEdgeStates = { ...edgeStates };

    let msg = '';

    if (rootU !== rootV) {
      ufRef.current.union(u, v);
      newEdgeStates[id] = 'accepted';
      setMstWeight((prev) => prev + weight);
      msg = `选中边 ${u}-${v} (权重: ${weight})。节点 ${u} 和 ${v} 属于不同集合，合并。`;
    } else {
      newEdgeStates[id] = 'rejected';
      msg = `丢弃边 ${u}-${v} (权重: ${weight})。它们已在同一集合中，会形成环路。`;
    }

    setEdgeStates(newEdgeStates);
    setCurrentStep(nextIdx);
    setStatusMessage(msg);

    setNodeSetColors(() => {
      const nextColors = {};
      nodes.forEach((n) => {
        const root = ufRef.current.find(n.id);
        nextColors[n.id] = root % SET_COLORS.length;
      });
      return nextColors;
    });
  }, [currentStep, edgeStates, nodes, sortedEdges]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = setInterval(() => {
      nextStep();
    }, 800);

    return () => clearInterval(timer);
  }, [isPlaying, nextStep]);

  const getEdgeColor = (state) => {
    if (state === 'accepted') return '#10b981';
    if (state === 'rejected') return '#ef4444';
    if (state === 'scanning') return '#eab308';
    return '#94a3b8';
  };

  const getEdgeWidth = (state) => {
    if (state === 'accepted') return 4;
    if (state === 'scanning') return 4;
    return 2;
  };

  const getEdgeOpacity = (state) => {
    if (state === 'rejected') return 0.2;
    return 1;
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden text-slate-800 bg-slate-50 font-sans">
      <style>{`
        .canvas-bg {
          background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
          background-size: 20px 20px;
        }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .node-transition { transition: fill 0.5s ease, stroke 0.5s ease; }
        .edge-transition { transition: stroke 0.3s ease, stroke-width 0.3s ease; }
      `}
      </style>

      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kruskal 最小生成树算法</h1>
            <p className="text-xs text-slate-500">使用并查集 (Union-Find) 贪心构建 MST</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">总权重</span>
            <span className="text-lg font-mono font-bold text-indigo-600">{mstWeight}</span>
          </div>

          <button
            onClick={generateGraph}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium transition-colors"
            type="button"
          >
            <RefreshCw size={16} /> 生成随机图
          </button>

          <div className="h-8 w-px bg-slate-200 mx-2" />

          <button
            onClick={() => {
              setIsPlaying(false);
              setMstWeight(0);
              setCurrentStep(-1);
              const resetStates = {};
              edges.forEach((e) => {
                resetStates[e.id] = 'pending';
              });
              setEdgeStates(resetStates);
              ufRef.current = new UnionFind(nodes.length);
              const resetColors = {};
              nodes.forEach((n, idx) => {
                resetColors[n.id] = idx % SET_COLORS.length;
              });
              setNodeSetColors(resetColors);
              setStatusMessage('已重置状态');
            }}
            className="p-2 hover:bg-slate-100 rounded-md text-slate-600"
            title="重置算法"
            type="button"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={() => !isPlaying && nextStep()}
            disabled={isPlaying || currentStep >= sortedEdges.length - 1}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-md text-sm font-medium disabled:opacity-50 transition-colors"
            type="button"
          >
            <StepForward size={16} /> 单步
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentStep >= sortedEdges.length - 1}
            className={`flex items-center gap-2 px-6 py-2 rounded-md text-sm font-bold text-white shadow-md transition-all ${
              isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'
            } disabled:opacity-50 disabled:shadow-none`}
            type="button"
          >
            {isPlaying ? <><Pause size={16} /> 暂停</> : <><Play size={16} /> 开始运行</>}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-slate-50 canvas-bg overflow-hidden flex items-center justify-center">
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-slate-200 shadow-sm text-xs space-y-2 z-10 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-400" />
              <span>未处理边</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span>当前扫描</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>已选 (MST)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-50" />
              <span>拒绝 (环路)</span>
            </div>
          </div>

          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-slate-200 text-sm font-medium text-slate-700 flex items-center gap-3 z-10 max-w-2xl text-center">
            <Info size={18} className="text-indigo-500 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>

          <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" className="max-w-full max-h-full">
            {edges.map((edge) => {
              const u = nodes[edge.u];
              const v = nodes[edge.v];
              const state = edgeStates[edge.id] || 'pending';
              const isScanning = sortedEdges[currentStep]?.id === edge.id;
              const displayState = isScanning ? 'scanning' : state;

              return (
                <g key={edge.id}>
                  <line
                    x1={u?.x}
                    y1={u?.y}
                    x2={v?.x}
                    y2={v?.y}
                    stroke={getEdgeColor(displayState)}
                    strokeWidth={getEdgeWidth(displayState)}
                    strokeOpacity={getEdgeOpacity(displayState)}
                    strokeLinecap="round"
                    className="edge-transition"
                  />
                  <rect
                    x={((u?.x ?? 0) + (v?.x ?? 0)) / 2 - 10}
                    y={((u?.y ?? 0) + (v?.y ?? 0)) / 2 - 8}
                    width="20"
                    height="16"
                    fill="white"
                    opacity="0.8"
                    rx="4"
                  />
                  <text
                    x={((u?.x ?? 0) + (v?.x ?? 0)) / 2}
                    y={((u?.y ?? 0) + (v?.y ?? 0)) / 2 + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={displayState === 'scanning' ? '#ca8a04' : '#64748b'}
                  >
                    {edge.weight}
                  </text>
                </g>
              );
            })}

            {nodes.map((node) => (
              <g key={node.id} className="node-group">
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="18"
                  fill="white"
                  stroke={SET_COLORS[nodeSetColors[node.id]] || '#94a3b8'}
                  strokeWidth="4"
                  className="node-transition shadow-sm"
                />
                <text
                  x={node.x}
                  y={node.y}
                  dy="4"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#334155"
                  pointerEvents="none"
                >
                  {node.id}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-700 flex items-center justify-between">
              边列表 (按权重排序)
              <span className="text-xs font-normal text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                {currentStep + 1} / {sortedEdges.length}
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
            {sortedEdges.map((edge, idx) => {
              const isCurrent = idx === currentStep;
              const state = edgeStates[edge.id];

              return (
                <EdgeListItem
                  key={edge.id}
                  edge={edge}
                  isCurrent={isCurrent}
                  state={state}
                />
              );
            })}

            {sortedEdges.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-sm">
                暂无数据
                <br />
                请点击生成随机图
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
            <div className="flex justify-between mb-1">
              <span>节点数 (V):</span>
              <span className="font-mono">{nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span>边总数 (E):</span>
              <span className="font-mono">{sortedEdges.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
