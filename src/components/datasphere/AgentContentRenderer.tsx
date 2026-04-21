'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Play,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  ZoomIn,
  X,
  ChevronUp,
  ChevronDown,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ReactMarkdown from 'react-markdown';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ─── Marker Parsing ──────────────────────────────────────────────────

interface TableData {
  headers: string[];
  rows: string[][];
}

interface CodeData {
  language: string;
  code: string;
}

interface TaskData {
  title: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
}

interface ChartData {
  type: 'bar' | 'line' | 'pie';
  data: any[];
}

interface SearchData {
  query: string;
}

interface ImageData {
  url: string;
}

type ContentBlock =
  | { type: 'markdown'; content: string }
  | { type: 'table'; data: TableData }
  | { type: 'code'; data: CodeData }
  | { type: 'task'; data: TaskData }
  | { type: 'chart'; data: ChartData }
  | { type: 'search'; data: SearchData }
  | { type: 'image'; data: ImageData };

function parseContent(raw: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let remaining = raw;

  const markerPatterns = [
    { regex: /<<<TABLE>>>([\s\S]*?)<<<END_TABLE>>>/, type: 'table' as const },
    { regex: /<<<CODE\s+lang="([^"]*)">>>([\s\S]*?)<<<END_CODE>>>/, type: 'code' as const },
    { regex: /<<<TASK>>>([\s\S]*?)<<<END_TASK>>>/, type: 'task' as const },
    { regex: /<<<CHART\s+type="(bar|line|pie)">>>([\s\S]*?)<<<END_CHART>>>/, type: 'chart' as const },
    { regex: /<<<SEARCH>>>([\s\S]*?)<<<END_SEARCH>>>/, type: 'search' as const },
    { regex: /<<<IMAGE>>>([\s\S]*?)<<<END_IMAGE>>>/, type: 'image' as const },
  ];

  while (remaining.length > 0) {
    let earliestMatch: { index: number; length: number; block: ContentBlock } | null = null;

    for (const pattern of markerPatterns) {
      const match = remaining.match(new RegExp(pattern.regex.source, pattern.regex.flags));
      if (match && match.index !== undefined) {
        if (!earliestMatch || match.index < earliestMatch.index) {
          let block: ContentBlock;

          if (pattern.type === 'table') {
            block = { type: 'table', data: parseTableData(match[1]) };
          } else if (pattern.type === 'code') {
            block = { type: 'code', data: { language: match[1], code: match[2].trim() } };
          } else if (pattern.type === 'task') {
            block = { type: 'task', data: parseTaskData(match[1]) };
          } else if (pattern.type === 'chart') {
            block = { type: 'chart', data: parseChartData(match[1], match[2]) };
          } else if (pattern.type === 'search') {
            block = { type: 'search', data: { query: match[1].trim() } };
          } else {
            block = { type: 'image', data: { url: match[1].trim() } };
          }

          earliestMatch = { index: match.index, length: match[0].length, block };
        }
      }
    }

    if (earliestMatch) {
      // Add markdown before the marker
      if (earliestMatch.index > 0) {
        const md = remaining.slice(0, earliestMatch.index).trim();
        if (md) blocks.push({ type: 'markdown', content: md });
      }
      blocks.push(earliestMatch.block);
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // No more markers, add remaining as markdown
      const md = remaining.trim();
      if (md) blocks.push({ type: 'markdown', content: md });
      break;
    }
  }

  return blocks;
}

function parseTableData(raw: string): TableData {
  const lines = raw.trim().split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string) =>
    line.split('|').map((c) => c.trim()).filter((c) => c !== '');

  const headers = parseRow(lines[0]);

  // Skip separator line (---|---|---)
  const dataStart = lines[1]?.includes('---') ? 2 : 1;
  const rows = lines.slice(dataStart).map(parseRow);

  return { headers, rows };
}

function parseTaskData(raw: string): TaskData {
  try {
    const json = JSON.parse(raw.trim());
    return {
      title: json.title || 'Tâche',
      status: json.status || 'running',
      progress: typeof json.progress === 'number' ? json.progress : 0,
    };
  } catch {
    return { title: raw.trim(), status: 'running', progress: 0 };
  }
}

function parseChartData(chartType: string, raw: string): ChartData {
  try {
    const data = JSON.parse(raw.trim());
    return { type: chartType as 'bar' | 'line' | 'pie', data: Array.isArray(data) ? data : [] };
  } catch {
    return { type: chartType as 'bar' | 'line' | 'pie', data: [] };
  }
}

// ─── Sub-Renderers ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function RenderTable({ data }: { data: TableData }) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedRows = useMemo(() => {
    if (sortCol === null) return data.rows;
    return [...data.rows].sort((a, b) => {
      const va = a[sortCol] || '';
      const vb = b[sortCol] || '';
      const numA = Number(va);
      const numB = Number(vb);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [data.rows, sortCol, sortDir]);

  const toggleSort = (col: number) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  if (data.headers.length === 0) return null;

  return (
    <Card className="overflow-hidden my-3 border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              {data.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => toggleSort(i)}
                >
                  <div className="flex items-center gap-1">
                    <span>{h}</span>
                    {sortCol === i ? (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )
                    ) : (
                      <ChevronUp className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <tr
                key={ri}
                className="border-b last:border-0 hover:bg-accent/50 transition-colors"
              >
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RenderCode({ data }: { data: CodeData }) {
  return (
    <Card className="my-3 overflow-hidden border shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {data.language || 'text'}
          </Badge>
        </div>
        <CopyButton text={data.code} />
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-[13px] leading-relaxed font-mono">
          <code>
            {data.code.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="select-none text-muted-foreground/40 w-8 text-right mr-4 flex-shrink-0 text-[11px] leading-relaxed">
                  {i + 1}
                </span>
                <span className="flex-1">{line}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </Card>
  );
}

function RenderTask({ data }: { data: TaskData }) {
  const statusConfig = {
    running: {
      icon: Play,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      label: 'En cours',
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      label: 'Terminé',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      label: 'Échoué',
    },
  };

  const config = statusConfig[data.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`my-3 border ${config.border} ${config.bg} shadow-sm`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Icon className={`h-5 w-5 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{data.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className={`text-[10px] ${config.bg} ${config.color}`}>
                  {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{data.progress}%</span>
              </div>
            </div>
          </div>
          <Progress
            value={data.progress}
            className={`h-2 ${
              data.status === 'completed'
                ? '[&>div]:bg-emerald-500'
                : data.status === 'failed'
                ? '[&>div]:bg-red-500'
                : '[&>div]:bg-amber-500'
            }`}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6', '#f97316'];

function RenderChart({ data }: { data: ChartData }) {
  if (!data.data || data.data.length === 0) {
    return (
      <Card className="my-3 p-4 text-center text-sm text-muted-foreground border shadow-sm">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
        Données du graphique non disponibles
      </Card>
    );
  }

  const keys = Object.keys(data.data[0]).filter((k) => typeof data.data[0][k] === 'number');

  return (
    <Card className="my-3 p-4 border shadow-sm">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {data.type === 'bar' ? (
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey={Object.keys(data.data[0])[0]} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              {keys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          ) : data.type === 'line' ? (
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey={Object.keys(data.data[0])[0]} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
              {keys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[i % CHART_COLORS.length], r: 4 }}
                />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data.data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey={keys[0] || 'value'}
                nameKey={Object.keys(data.data[0])[0]}
              >
                {data.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RenderSearch({ data }: { data: SearchData }) {
  return (
    <Card className="my-3 border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Recherche web</p>
            <p className="text-xs text-muted-foreground truncate">{data.query}</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <ExternalLink className="h-3 w-3" />
            Rechercher
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RenderImage({ data }: { data: ImageData }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <Card className="my-3 overflow-hidden border shadow-sm">
        <CardContent className="p-2">
          <div className="relative group cursor-pointer" onClick={() => setZoomed(true)}>
            <img
              src={data.url}
              alt="Image générée par l'agent"
              className="w-full rounded-lg object-cover max-h-80"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
              <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setZoomed(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 h-10 w-10"
              onClick={() => setZoomed(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={data.url}
              alt="Image agrandie"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Main Renderer ───────────────────────────────────────────────────

interface AgentContentRendererProps {
  content: string;
  isStreaming?: boolean;
}

export default function AgentContentRenderer({ content, isStreaming }: AgentContentRendererProps) {
  const blocks = useMemo(() => parseContent(content), [content]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'markdown':
            return <ReactMarkdown key={i}>{block.content}</ReactMarkdown>;
          case 'table':
            return <RenderTable key={i} data={block.data} />;
          case 'code':
            return <RenderCode key={i} data={block.data} />;
          case 'task':
            return <RenderTask key={i} data={block.data} />;
          case 'chart':
            return <RenderChart key={i} data={block.data} />;
          case 'search':
            return <RenderSearch key={i} data={block.data} />;
          case 'image':
            return <RenderImage key={i} data={block.data} />;
          default:
            return null;
        }
      })}
      {isStreaming && (
        <motion.span
          className="inline-flex gap-0.5 ml-1 align-middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </motion.span>
      )}
    </div>
  );
}
