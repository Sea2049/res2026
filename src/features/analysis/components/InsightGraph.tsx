import { useMemo, useState, useCallback } from "react";
import type { Insight } from "@/lib/types";

/**
 * InsightGraph 组件 Props 接口
 */
interface InsightGraphProps {
  /**
   * 洞察列表
   */
  insights: Insight[];
  /**
   * 高度
   */
  height?: number;
  /**
   * 额外的类名
   */
  className?: string;
  /**
   * 节点点击事件
   */
  onNodeClick?: (insight: Insight) => void;
}

/**
 * 洞察关系类型
 */
interface InsightRelation {
  source: Insight;
  target: Insight;
  type: "similar" | "opposite" | "related";
  strength: number;
}

/**
 * 图节点
 */
interface GraphNode {
  id: string;
  insight: Insight;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * 图边
 */
interface GraphEdge {
  source: string;
  target: string;
  type: InsightRelation["type"];
  strength: number;
}

/**
 * 洞察类型颜色映射
 */
const TYPE_COLORS: Record<Insight["type"], string> = {
  pain_point: "#ef4444",
  feature_request: "#3b82f6",
  praise: "#22c55e",
  question: "#eab308",
};

/**
 * 洞察类型图标
 */
const TYPE_ICONS: Record<Insight["type"], string> = {
  pain_point: "🔴",
  feature_request: "🔵",
  praise: "🟢",
  question: "🟡",
};

/**
 * 洞察关系图组件
 * 使用力导向布局展示洞察之间的关系
 */
export function InsightGraph({
  insights,
  height = 500,
  className,
  onNodeClick,
}: InsightGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 计算洞察之间的关系
  const relations = useMemo((): InsightRelation[] => {
    const result: InsightRelation[] = [];

    for (let i = 0; i < insights.length; i++) {
      for (let j = i + 1; j < insights.length; j++) {
        const insight1 = insights[i];
        const insight2 = insights[j];

        // 计算相似度
        let similarity = 0;
        let type: InsightRelation["type"] = "related";

        // 相同类型
        if (insight1.type === insight2.type) {
          similarity += 0.5;
          type = "similar";
        } else if (
          (insight1.type === "pain_point" && insight2.type === "praise") ||
          (insight1.type === "praise" && insight2.type === "pain_point")
        ) {
          similarity += 0.3;
          type = "opposite";
        }

        // 相同关键词
        if (
          insight1.keyword &&
          insight2.keyword &&
          insight1.keyword === insight2.keyword
        ) {
          similarity += 0.5;
        }

        // 置信度接近
        if (Math.abs(insight1.confidence - insight2.confidence) < 0.2) {
          similarity += 0.2;
        }

        if (similarity > 0.3) {
          result.push({
            source: insight1,
            target: insight2,
            type,
            strength: Math.min(similarity, 1),
          });
        }
      }
    }

    return result;
  }, [insights]);

  // 简单的力导向布局计算
  const layout = useMemo(() => {
    const width = 600;
    const padding = 50;
    const nodeCount = insights.length;

    if (nodeCount === 0) {
      return { nodes: [], edges: [] };
    }

    // 初始化节点位置（圆形布局）
    const nodes: GraphNode[] = insights.map((insight, index) => {
      const angle = (index / nodeCount) * 2 * Math.PI;
      const radius = Math.min(width, height) / 2 - padding;
      return {
        id: insight.id,
        insight,
        x: width / 2 + Math.cos(angle) * radius,
        y: height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
    });

    // 创建边
    const edges: GraphEdge[] = relations.map((rel) => ({
      source: rel.source.id,
      target: rel.target.id,
      type: rel.type,
      strength: rel.strength,
    }));

    // 简化的力导向迭代
    const iterations = 50;
    const repulsion = 5000;
    const attraction = 0.01;

    for (let iter = 0; iter < iterations; iter++) {
      // 计算排斥力
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = repulsion / (dist * dist);

          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      // 计算吸引力
      for (const edge of edges) {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) continue;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const force = (dist - 100) * attraction * edge.strength;

        sourceNode.vx += (dx / dist) * force;
        sourceNode.vy += (dy / dist) * force;
        targetNode.vx -= (dx / dist) * force;
        targetNode.vy -= (dy / dist) * force;
      }

      // 应用速度并限制位置
      for (const node of nodes) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;

        // 边界限制
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
      }
    }

    return { nodes, edges };
  }, [insights, relations, height]);

  // 处理节点点击
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      const node = layout.nodes.find((n) => n.id === nodeId);
      if (node) {
        setSelectedNode(nodeId);
        onNodeClick?.(node.insight);
      }
    },
    [layout.nodes, onNodeClick]
  );

  // 获取边的颜色
  const getEdgeColor = (type: InsightRelation["type"], strength: number) => {
    const baseColor =
      type === "similar"
        ? "#3b82f6"
        : type === "opposite"
        ? "#ef4444"
        : "#9ca3af";
    const alpha = Math.max(0.2, strength * 0.8);
    return `${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
  };

  // 获取边的线型
  const getEdgeStrokeDasharray = (type: InsightRelation["type"]) => {
    return type === "opposite" ? "5,5" : type === "related" ? "3,3" : "none";
  };

  if (insights.length === 0) {
    return (
      <div
        className={`p-8 text-center text-gray-500 bg-gray-50 rounded-lg ${className || ""}`}
        style={{ height }}
      >
        <p>暂无洞察数据</p>
        <p className="text-sm mt-2">请先执行分析以生成洞察关系图</p>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white rounded-lg shadow-sm overflow-hidden ${className || ""}`}
      style={{ height }}
    >
      {/* 图例 */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 p-2 rounded-lg shadow-sm hidden sm:block">
        <div className="text-xs font-medium text-gray-700 mb-2">洞察类型</div>
        <div className="space-y-1">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span>{TYPE_ICONS[type as Insight["type"]]}</span>
              <span className="text-xs text-gray-600">
                {type === "pain_point"
                  ? "用户痛点"
                  : type === "feature_request"
                  ? "功能需求"
                  : type === "praise"
                  ? "用户赞美"
                  : "用户问题"}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs font-medium text-gray-700 mb-2">关系类型</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-reddit-orange"></div>
            <span className="text-xs text-gray-600">相似</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-red-500"></div>
            <span className="text-xs text-gray-600">对立</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-gray-400"></div>
            <span className="text-xs text-gray-600">相关</span>
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
          aria-label="放大"
          className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-reddit-orange"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
          aria-label="缩小"
          className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-reddit-orange"
        >
          -
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setOffset({ x: 0, y: 0 });
          }}
          aria-label="重置缩放"
          className="px-3 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-600 text-xs hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-reddit-orange"
        >
          重置
        </button>
      </div>

      {/* SVG 图 */}
      <svg
        className="w-full h-full"
        viewBox={`${-offset.x} ${-offset.y} ${600 / zoom} ${height / zoom}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="洞察关系图"
      >
        {/* 边 */}
        {layout.edges.map((edge, index) => {
          const sourceNode = layout.nodes.find((n) => n.id === edge.source);
          const targetNode = layout.nodes.find((n) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          return (
            <line
              key={index}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={getEdgeColor(edge.type, edge.strength)}
              strokeWidth={edge.strength * 3}
              strokeDasharray={getEdgeStrokeDasharray(edge.type)}
              className="transition-all duration-300"
            />
          );
        })}

        {/* 节点 */}
        {layout.nodes.map((node) => {
          const isSelected = selectedNode === node.id;
          const color = TYPE_COLORS[node.insight.type];
          const radius = isSelected ? 24 : 20;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => handleNodeClick(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNodeClick(node.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`洞察节点: ${node.insight.title}, 置信度 ${Math.round(node.insight.confidence * 100)}%`}
              className="cursor-pointer"
            >
              {/* 节点光晕 */}
              <circle
                r={radius + 4}
                fill={color}
                opacity={0.2}
                className="transition-all duration-300"
              />
              {/* 节点主体 */}
              <circle
                r={radius}
                fill="white"
                stroke={color}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-300 hover:stroke-width-3"
              />
              {/* 节点标签 */}
              <text
                y={radius + 16}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                style={{ fontSize: "10px" }}
              >
                {node.insight.title.length > 15
                  ? node.insight.title.substring(0, 15) + "..."
                  : node.insight.title}
              </text>
              {/* 置信度 */}
              <text
                y={-radius - 8}
                textAnchor="middle"
                className="text-xs fill-gray-500"
                style={{ fontSize: "9px" }}
              >
                {Math.round(node.insight.confidence * 100)}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* 选中节点详情 */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 p-4 rounded-lg shadow-sm">
          {(() => {
            const node = layout.nodes.find((n) => n.id === selectedNode);
            if (!node) return null;

            return (
              <div>
                <div className="flex items-center gap-2">
                  <span>{TYPE_ICONS[node.insight.type]}</span>
                  <h4 className="font-semibold text-gray-900">
                    {node.insight.title}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {node.insight.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>置信度: {Math.round(node.insight.confidence * 100)}%</span>
                  <span>评论数: {node.insight.count || 0}</span>
                  {node.insight.keyword && (
                    <span>关键词: {node.insight.keyword}</span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
