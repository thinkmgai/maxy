import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  type ApiErrorChartResponse,
  type ApiErrorListItem,
  type HitmapResponse,
  type LogListItem,
  type PerformanceQuery,
  getApiErrorChart,
  getApiErrorList,
  getHitmap,
  getLogListByTime,
} from "../../api/PerformanceAnalysis";

type NetworkAnalysisProps = {
  filters: PerformanceQuery;
};

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function formatDuration(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "-";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }
  return `${numberFormatter.format(value)} ms`;
}

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function calculateInterval(from: number, to: number) {
  const hours = (to - from) / (1000 * 60 * 60);
  if (hours <= 2) return 1;
  if (hours <= 10) return 5;
  if (hours <= 24) return 10;
  return 30;
}

function summariseSeries(series: Array<[number, number]>) {
  const total = series.reduce((sum, [, value]) => sum + value, 0);
  const peak = series.reduce((max, [, value]) => Math.max(max, value), 0);
  return { total, peak };
}

/** Network analysis section of the performance dashboard. */
export default function NetworkAnalysis({ filters }: NetworkAnalysisProps) {
  const [chart, setChart] = useState<ApiErrorChartResponse | null>(null);
  const [errorList, setErrorList] = useState<ApiErrorListItem[]>([]);
  const [apiLogs, setApiLogs] = useState<LogListItem[]>([]);
  const [hitmap, setHitmap] = useState<HitmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const interval = calculateInterval(filters.from, filters.to);

    Promise.all([
      getApiErrorChart(filters, controller.signal),
      getApiErrorList(filters, controller.signal),
      getLogListByTime(
        {
          ...filters,
          type: "API",
        },
        controller.signal
      ),
      getHitmap(
        {
          ...filters,
          type: "api",
          interval,
          durationStep: interval,
        },
        controller.signal
      ),
    ])
      .then(([chartData, listData, logData, hitmapData]) => {
        setChart(chartData);
        setErrorList(listData);
        setApiLogs(logData);
        setHitmap(hitmapData);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "네트워크 데이터를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [filters]);

  const errorLineData = useMemo(() => {
    if (!chart) return [];
    type Point = {
      timestamp: number;
      status3xx?: number;
      status4xx?: number;
      status5xx?: number;
    };
    const map = new Map<number, Point>();
    const append = (series: Array<[number, number]>, key: keyof Omit<Point, "timestamp">) => {
      series?.forEach(([timestamp, value]) => {
        const entry = map.get(timestamp) ?? { timestamp };
        entry[key] = value;
        map.set(timestamp, entry);
      });
    };
    append(chart["3xx"] ?? [], "status3xx");
    append(chart["4xx"] ?? [], "status4xx");
    append(chart["5xx"] ?? [], "status5xx");
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [chart]);

  const chartSummary = useMemo(() => {
    if (!chart) return null;
    return {
      "3xx": summariseSeries(chart["3xx"]),
      "4xx": summariseSeries(chart["4xx"]),
      "5xx": summariseSeries(chart["5xx"]),
    };
  }, [chart]);

  const hitmapHighlights = useMemo(() => {
    if (!hitmap) return [];
    return [...hitmap.datas].sort((a, b) => b[2] - a[2]).slice(0, 5);
  }, [hitmap]);

  const apiHitmapData = useMemo(() => {
    if (!hitmap) return [];
    return hitmap.datas.map(([timestamp, duration, count]) => ({
      timestamp,
      duration,
      count,
    }));
  }, [hitmap]);

  const timeTickFormatter = (value: number) => new Date(value).toLocaleTimeString();
  const heatmapTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }
    const { duration, count } = payload[0].payload as { duration: number; count: number };
    return (
      <div className="pa_tooltip">
        <strong>{new Date(label as number).toLocaleString()}</strong>
        <div>Duration: {formatDuration(duration)}</div>
        <div>Count: {formatCount(count)}</div>
      </div>
    );
  };

  return (
    <section>
      <h1 className="bot_title" data-t="common.text.ajaxAnalysis">
        Network Analysis
      </h1>
      {loading && <p className="pa_state_text">Loading network data…</p>}
      {error && <p className="pa_state_text pa_state_error">{error}</p>}

      <div className="pa_section">
        <header className="pa_section_header">
          <h2>API Error Summary</h2>
        </header>
        {chartSummary ? (
          <div className="pa_cards">
            {(["3xx", "4xx", "5xx"] as const).map((bucket) => (
              <article key={bucket} className="pa_card">
                <h3>{bucket}</h3>
                <p className="pa_card_value">{formatCount(chartSummary[bucket].total)}</p>
                <p className="pa_card_hint">peak {formatCount(chartSummary[bucket].peak)}</p>
              </article>
            ))}
          </div>
        ) : (
          !loading && <p className="pa_state_text">No error chart data available.</p>
        )}
        {errorLineData.length > 0 && (
          <div className="pa_chart_container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errorLineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={timeTickFormatter}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value as number).toLocaleString()}
                  formatter={(value: number, name: string) => [formatCount(value), name.toUpperCase()]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="status3xx"
                  name="3xx"
                  stroke="#8884d8"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="status4xx"
                  name="4xx"
                  stroke="#82ca9d"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="status5xx"
                  name="5xx"
                  stroke="#ff7300"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pa_section">
        <header className="pa_section_header">
          <h2>API Error List</h2>
          <span className="pa_section_hint">{errorList.length} endpoints</span>
        </header>
        <div className="pa_table_scroll">
          <table className="pa_table">
            <thead>
              <tr>
                <th>Request URL</th>
                <th>Status</th>
                <th>Error Count</th>
                <th>Ratio</th>
              </tr>
            </thead>
            <tbody>
              {errorList.map((item, index) => (
                <tr key={`${item.reqUrl}-${index}`}>
                  <td className="pa_table_url">{item.reqUrl}</td>
                  <td>{item.statusCode}</td>
                  <td>{formatCount(item.count)}</td>
                  <td>{item.ratio.toFixed(2)}%</td>
                </tr>
              ))}
              {errorList.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="pa_table_empty">
                    No API errors detected in the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pa_section">
        <header className="pa_section_header">
          <h2>API Hitmap Highlights</h2>
          <span className="pa_section_hint">Top 5 by volume</span>
        </header>
        {apiHitmapData.length > 0 && (
          <div className="pa_chart_container">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={timeTickFormatter}
                />
                <YAxis dataKey="duration" tickFormatter={formatDuration} />
                <ZAxis dataKey="count" range={[60, 400]} name="Count" />
                <Tooltip content={heatmapTooltip} />
                <Scatter data={apiHitmapData} fill="#8884d8" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="pa_table_scroll">
          <table className="pa_table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Duration</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {hitmapHighlights.map(([timestamp, duration, count], index) => (
                <tr key={`${timestamp}-${duration}-${index}`}>
                  <td>{new Date(timestamp).toLocaleString()}</td>
                  <td>{formatDuration(duration)}</td>
                  <td>{formatCount(count)}</td>
                </tr>
              ))}
              {hitmapHighlights.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="pa_table_empty">
                    No hitmap records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pa_section">
        <header className="pa_section_header">
          <h2>Slow API Calls</h2>
          <span className="pa_section_hint">{apiLogs.length} records</span>
        </header>
        <div className="pa_table_scroll">
          <table className="pa_table">
            <thead>
              <tr>
                <th>Request URL</th>
                <th>Average Duration</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {apiLogs.map((item, index) => (
                <tr key={`${item.reqUrl}-${index}`}>
                  <td className="pa_table_url">{item.reqUrl}</td>
                  <td>{formatDuration(item.durationAvg)}</td>
                  <td>{formatCount(item.count)}</td>
                </tr>
              ))}
              {apiLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="pa_table_empty">
                    No API latency data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
