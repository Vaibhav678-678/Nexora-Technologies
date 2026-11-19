import React, { useState } from 'react';
import { formatCompactINR, formatINR } from '../utils/formatters';

export interface SeriesItem {
  label: string;
  primary: number;
  secondary?: number;
  tertiary?: number;
}

export const RevenueExpenseChart: React.FC<{
  data: SeriesItem[];
  primaryLabel?: string;
  secondaryLabel?: string;
  tertiaryLabel?: string;
}> = ({
  data,
  primaryLabel = 'Revenue',
  secondaryLabel = 'Operating Cost',
  tertiaryLabel = 'Operating Surplus',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-500">
        No monthly financial data available.
      </div>
    );
  }

  const width = 640;
  const height = 250;
  const padLeft = 58;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.primary, d.secondary ?? 0, d.tertiary ?? 0])
  );
  const niceMax = Math.ceil(maxVal / 100000) * 100000 || maxVal * 1.15;

  const yFor = (val: number) => padTop + plotH - (Math.max(0, val) / niceMax) * plotH;
  const groupW = plotW / data.length;
  const barW = Math.min(22, groupW * 0.28);

  const linePoints = data
    .map((d, i) => {
      const cx = padLeft + groupW * i + groupW / 2;
      const cy = yFor(d.tertiary ?? 0);
      return `${cx},${cy}`;
    })
    .join(' ');

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-slate-600">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#0B192C] inline-block" />
            <span>{primaryLabel}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" />
            <span>{secondaryLabel}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
            <span>{tertiaryLabel}</span>
          </span>
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="font-mono tabular-nums text-xs text-slate-800">
            <span>{data[hoveredIdx].label}: </span>
            <span className="font-semibold text-[#0B192C]">
              {formatCompactINR(data[hoveredIdx].primary)}
            </span>
            <span className="text-slate-400 mx-1.5">·</span>
            <span className="text-slate-600">
              Cost {formatCompactINR(data[hoveredIdx].secondary ?? 0)}
            </span>
            <span className="text-slate-400 mx-1.5">·</span>
            <span className="text-emerald-700 font-semibold">
              Surplus {formatCompactINR(data[hoveredIdx].tertiary ?? 0)}
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Revenue versus Operating Expenses and Surplus chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = niceMax * t;
          const y = yFor(val);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray={t === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {formatCompactINR(val)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padLeft + groupW * i + groupW / 2;
          const yRev = yFor(d.primary);
          const hRev = padTop + plotH - yRev;
          const yExp = yFor(d.secondary ?? 0);
          const hExp = padTop + plotH - yExp;

          return (
            <g
              key={d.label}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              {hoveredIdx === i && (
                <rect
                  x={padLeft + groupW * i + 2}
                  y={padTop}
                  width={groupW - 4}
                  height={plotH}
                  fill="#f1f5f9"
                  rx={4}
                />
              )}
              <rect
                x={cx - barW - 2}
                y={yRev}
                width={barW}
                height={Math.max(0, hRev)}
                fill="#0B192C"
                rx={2}
              />
              <rect
                x={cx + 2}
                y={yExp}
                width={barW}
                height={Math.max(0, hExp)}
                fill="#cbd5e1"
                rx={2}
              />
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-600 text-[11px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {data.length > 1 && (
          <polyline
            fill="none"
            stroke="#16a34a"
            strokeWidth={2.25}
            points={linePoints}
          />
        )}
        {data.map((d, i) => {
          const cx = padLeft + groupW * i + groupW / 2;
          const cy = yFor(d.tertiary ?? 0);
          return (
            <circle
              key={`pt-${d.label}`}
              cx={cx}
              cy={cy}
              r={hoveredIdx === i ? 4.5 : 3}
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const TrendLineChart: React.FC<{
  data: { label: string; value: number; secondaryValue?: number }[];
  color?: string;
  isCurrency?: boolean;
  unitSuffix?: string;
  primaryName?: string;
  secondaryName?: string;
}> = ({
  data,
  color = '#2563eb',
  isCurrency = true,
  unitSuffix = '',
  primaryName = 'Value',
  secondaryName,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) return null;

  const width = 560;
  const height = 210;
  const padLeft = 54;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxVal = Math.max(
    1,
    ...data.flatMap((d) => [d.value, d.secondaryValue ?? 0])
  );
  const niceMax = maxVal * 1.15;

  const xFor = (i: number) =>
    data.length === 1 ? padLeft + plotW / 2 : padLeft + (i / (data.length - 1)) * plotW;
  const yFor = (v: number) => padTop + plotH - (Math.max(0, v) / niceMax) * plotH;

  const points = data.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(' ');
  const areaPoints = `${xFor(0)},${padTop + plotH} ${points} ${xFor(data.length - 1)},${
    padTop + plotH
  }`;
  const secPoints = secondaryName
    ? data.map((d, i) => `${xFor(i)},${yFor(d.secondaryValue ?? 0)}`).join(' ')
    : '';

  const fmt = (v: number) =>
    isCurrency ? formatCompactINR(v) : `${Math.round(v)}${unitSuffix}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2 text-xs min-h-[20px]">
        <div className="flex items-center gap-4 text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs inline-block" style={{ backgroundColor: color }} />
            <span>{primaryName}</span>
          </span>
          {secondaryName && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
              <span>{secondaryName}</span>
            </span>
          )}
        </div>
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="font-mono tabular-nums text-slate-800">
            {data[hoveredIdx].label}:{' '}
            <span className="font-semibold">
              {isCurrency ? formatINR(data[hoveredIdx].value) : `${data[hoveredIdx].value}${unitSuffix}`}
            </span>
            {secondaryName && data[hoveredIdx].secondaryValue !== undefined && (
              <span className="text-slate-500 ml-2">
                ({secondaryName}: {fmt(data[hoveredIdx].secondaryValue!)})
              </span>
            )}
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {[0, 0.33, 0.66, 1].map((t) => {
          const val = niceMax * t;
          const y = yFor(val);
          return (
            <g key={t}>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray={t === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {fmt(val)}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill={color} fillOpacity={0.08} />
        <polyline fill="none" stroke={color} strokeWidth={2.25} points={points} />
        {secondaryName && (
          <polyline
            fill="none"
            stroke="#64748b"
            strokeWidth={1.75}
            strokeDasharray="4 3"
            points={secPoints}
          />
        )}

        {data.map((d, i) => (
          <g
            key={d.label}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="cursor-pointer"
          >
            <circle
              cx={xFor(i)}
              cy={yFor(d.value)}
              r={hoveredIdx === i ? 5 : 3.2}
              fill={color}
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            {secondaryName && (
              <circle
                cx={xFor(i)}
                cy={yFor(d.secondaryValue ?? 0)}
                r={3}
                fill="#64748b"
                stroke="#ffffff"
                strokeWidth={1}
              />
            )}
            <text
              x={xFor(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-slate-600 text-[10px]"
            >
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const HorizontalBarBreakdown: React.FC<{
  items: { label: string; value: number; formattedValue?: string; sublabel?: string; color?: string }[];
}> = ({ items }) => {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = Math.min(100, Math.round((item.value / max) * 100));
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <div className="truncate">
                <span className="font-medium text-slate-800">{item.label}</span>
                {item.sublabel && (
                  <span className="text-slate-500 ml-2">{item.sublabel}</span>
                )}
              </div>
              <span className="font-mono tabular-nums font-medium text-slate-900 shrink-0">
                {item.formattedValue ?? formatINR(item.value)}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-xs overflow-hidden">
              <div
                className="h-full rounded-xs transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color || '#1d4ed8',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const BreakEvenChart: React.FC<{
  fixedCost: number;
  sellingPrice: number;
  variableCost: number;
  currentCustomers: number;
  maxCustomers?: number;
}> = ({
  fixedCost,
  sellingPrice,
  variableCost,
  currentCustomers,
  maxCustomers = 30,
}) => {
  const width = 580;
  const height = 240;
  const padLeft = 60;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxCust = Math.max(maxCustomers, currentCustomers + 5, 25);
  const maxY = Math.max(fixedCost + variableCost * maxCust, sellingPrice * maxCust);

  const xFor = (n: number) => padLeft + (n / maxCust) * plotW;
  const yFor = (val: number) => padTop + plotH - (val / maxY) * plotH;

  const contrib = sellingPrice - variableCost;
  const breakEvenN = contrib > 0 ? fixedCost / contrib : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-600 inline-block" />
            <span>Total Revenue</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-red-600 inline-block" />
            <span>Total Cost (Fixed + Variable)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 border-b border-dashed inline-block" />
            <span>Fixed Cost ({formatCompactINR(fixedCost)})</span>
          </span>
        </div>
        <span className="font-mono tabular-nums text-slate-800">
          Break-Even: <strong className="text-[#0B192C]">{Math.ceil(breakEvenN)} customers</strong> · Current:{' '}
          <strong className="text-emerald-700">{currentCustomers}</strong>
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = maxY * t;
          const y = yFor(val);
          return (
            <g key={t}>
              <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={t === 0 ? undefined : '3 3'} />
              <text x={padLeft - 8} y={y + 3} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                {formatCompactINR(val)}
              </text>
            </g>
          );
        })}

        {/* Fixed cost line */}
        <line
          x1={xFor(0)}
          y1={yFor(fixedCost)}
          x2={xFor(maxCust)}
          y2={yFor(fixedCost)}
          stroke="#94a3b8"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />

        {/* Total cost line */}
        <line
          x1={xFor(0)}
          y1={yFor(fixedCost)}
          x2={xFor(maxCust)}
          y2={yFor(fixedCost + variableCost * maxCust)}
          stroke="#dc2626"
          strokeWidth={2}
        />

        {/* Total revenue line */}
        <line
          x1={xFor(0)}
          y1={yFor(0)}
          x2={xFor(maxCust)}
          y2={yFor(sellingPrice * maxCust)}
          stroke="#2563eb"
          strokeWidth={2.25}
        />

        {/* Break-even point */}
        {breakEvenN > 0 && breakEvenN <= maxCust && (
          <g>
            <line
              x1={xFor(breakEvenN)}
              y1={yFor(sellingPrice * breakEvenN)}
              x2={xFor(breakEvenN)}
              y2={padTop + plotH}
              stroke="#0B192C"
              strokeDasharray="2 2"
            />
            <circle
              cx={xFor(breakEvenN)}
              cy={yFor(sellingPrice * breakEvenN)}
              r={4.5}
              fill="#0B192C"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <text
              x={xFor(breakEvenN)}
              y={yFor(sellingPrice * breakEvenN) - 10}
              textAnchor="middle"
              className="fill-slate-900 text-[10px] font-semibold"
            >
              BEP ({Math.ceil(breakEvenN)})
            </text>
          </g>
        )}

        {/* Current customers marker */}
        {currentCustomers <= maxCust && (
          <g>
            <circle
              cx={xFor(currentCustomers)}
              cy={yFor(sellingPrice * currentCustomers)}
              r={4.5}
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <text
              x={xFor(currentCustomers)}
              y={yFor(sellingPrice * currentCustomers) - 10}
              textAnchor="middle"
              className="fill-emerald-700 text-[10px] font-semibold"
            >
              Now ({currentCustomers})
            </text>
          </g>
        )}

        {[0, 5, 10, 15, 20, 25, maxCust]
          .filter((v, idx, arr) => arr.indexOf(v) === idx && v <= maxCust)
          .map((n) => (
            <text
              key={n}
              x={xFor(n)}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-600 text-[10px] font-mono"
            >
              {n}
            </text>
          ))}
      </svg>
    </div>
  );
};
