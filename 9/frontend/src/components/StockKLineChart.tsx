import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export interface StockKLineChartProps {
  times: string[];
  klineData: Array<[number, number, number, number]>;
  volumes: number[];
  volumeColors: string[];
  rsiData: (number | null)[];
  ma5Data?: (number | null)[];
  ma10Data?: (number | null)[];
  ma20Data?: (number | null)[];
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  height?: number | string;
  width?: number | string;
  showMA?: boolean;
  showRSI?: boolean;
}

export const StockKLineChart: React.FC<StockKLineChartProps> = ({
  times,
  klineData,
  volumes,
  volumeColors,
  rsiData,
  ma5Data,
  ma10Data,
  ma20Data,
  loading = false,
  error = false,
  errorMessage = '数据加载失败',
  height = 600,
  width = '100%',
  showMA = true,
  showRSI = true,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  const chartOption = useMemo<EChartsOption>(() => {
    const hasData = times.length > 0 && klineData.length > 0;
    const hasRsiData = showRSI && rsiData.some((v) => v !== null);
    const hasMAData = showMA && (ma5Data || ma10Data || ma20Data);

    const upColor = '#ef4444';
    const downColor = '#22c55e';

    const series: EChartsOption['series'] = [
      {
        name: 'K线',
        type: 'candlestick',
        data: klineData,
        itemStyle: {
          color: upColor,
          color0: downColor,
          borderColor: upColor,
          borderColor0: downColor,
        },
      },
    ];

    if (hasMAData && ma5Data) {
      series.push({
        name: 'MA5',
        type: 'line',
        data: ma5Data,
        smooth: true,
        lineStyle: { color: '#f59e0b', width: 1 },
        symbol: 'none',
      });
    }

    if (hasMAData && ma10Data) {
      series.push({
        name: 'MA10',
        type: 'line',
        data: ma10Data,
        smooth: true,
        lineStyle: { color: '#3b82f6', width: 1 },
        symbol: 'none',
      });
    }

    if (hasMAData && ma20Data) {
      series.push({
        name: 'MA20',
        type: 'line',
        data: ma20Data,
        smooth: true,
        lineStyle: { color: '#a855f7', width: 1 },
        symbol: 'none',
      });
    }

    const gridTop = hasRsiData ? '5%' : '5%';
    const gridHeight = hasRsiData ? '45%' : '60%';
    const volumeTop = hasRsiData ? '52%' : '68%';
    const volumeHeight = hasRsiData ? '15%' : '22%';
    const rsiTop = hasRsiData ? '70%' : '0%';
    const rsiHeight = hasRsiData ? '20%' : '0%';

    const yAxes: EChartsOption['yAxis'] = [
      {
        scale: true,
        splitLine: { lineStyle: { color: '#374151' } },
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { color: '#9ca3af' },
      },
    ];

    const xAxes: EChartsOption['xAxis'] = [
      {
        type: 'category',
        data: times,
        boundaryGap: true,
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { show: false },
        splitLine: { show: false },
        gridIndex: 0,
      },
    ];

    const grids: EChartsOption['grid'] = [
      { left: '10%', right: '10%', top: gridTop, height: gridHeight },
    ];

    grids.push({ left: '10%', right: '10%', top: volumeTop, height: volumeHeight });
    xAxes.push({
      type: 'category',
      data: times,
      gridIndex: 1,
      axisLine: { lineStyle: { color: '#6b7280' } },
      axisLabel: { show: !hasRsiData, color: '#9ca3af' },
      splitLine: { show: false },
    });
    yAxes.push({
      scale: true,
      gridIndex: 1,
      splitLine: { lineStyle: { color: '#374151' } },
      axisLine: { lineStyle: { color: '#6b7280' } },
      axisLabel: { color: '#9ca3af' },
    });
    series.push({
      name: '成交量',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: volumes.map((vol, idx) => ({
        value: vol,
        itemStyle: { color: volumeColors[idx] || '#6b7280' },
      })),
    });

    if (hasRsiData) {
      grids.push({ left: '10%', right: '10%', top: rsiTop, height: rsiHeight });
      xAxes.push({
        type: 'category',
        data: times,
        gridIndex: 2,
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { color: '#9ca3af' },
        splitLine: { show: false },
      });
      yAxes.push({
        scale: true,
        gridIndex: 2,
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#374151' } },
        axisLine: { lineStyle: { color: '#6b7280' } },
        axisLabel: { color: '#9ca3af' },
      });
      series.push({
        name: 'RSI',
        type: 'line',
        xAxisIndex: 2,
        yAxisIndex: 2,
        data: rsiData,
        smooth: true,
        lineStyle: { color: '#f97316', width: 1.5 },
        symbol: 'none',
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', width: 1 },
          data: [
            { yAxis: 70, lineStyle: { color: '#ef4444' } },
            { yAxis: 30, lineStyle: { color: '#22c55e' } },
            { yAxis: 50, lineStyle: { color: '#6b7280', type: 'dotted' } },
          ],
        },
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        borderColor: '#374151',
        borderWidth: 1,
        textStyle: { color: '#f3f4f6' },
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        lineStyle: { color: '#6b7280', type: 'dashed' },
      },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      dataZoom: hasData
        ? [
            {
              type: 'inside',
              xAxisIndex: hasRsiData ? [0, 1, 2] : [0, 1],
              start: Math.max(0, times.length - 60) / times.length * 100,
              end: 100,
            },
            {
              type: 'slider',
              xAxisIndex: hasRsiData ? [0, 1, 2] : [0, 1],
              start: Math.max(0, times.length - 60) / times.length * 100,
              end: 100,
              height: 20,
              bottom: 5,
              borderColor: '#374151',
              fillerColor: 'rgba(59, 130, 246, 0.2)',
              textStyle: { color: '#9ca3af' },
            },
          ]
        : undefined,
      series,
      animation: hasData,
      animationDuration: 300,
    };
  }, [times, klineData, volumes, volumeColors, rsiData, ma5Data, ma10Data, ma20Data, showMA, showRSI]);

  useEffect(() => {
    if (!chartRef.current) return;

    const instance = echarts.init(chartRef.current, 'dark');
    chartInstanceRef.current = instance;

    const handleResize = () => {
      instance.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      instance.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartInstanceRef.current) return;

    chartInstanceRef.current.setOption(chartOption, true);

    if (loading) {
      chartInstanceRef.current.showLoading({
        text: '加载中...',
        color: '#3b82f6',
        textColor: '#f3f4f6',
        maskColor: 'rgba(17, 24, 39, 0.8)',
      });
    } else {
      chartInstanceRef.current.hideLoading();
    }
  }, [chartOption, loading]);

  if (loading && times.length === 0) {
    return (
      <div
        data-testid="chart-loading"
        className="flex items-center justify-center bg-gray-800 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-testid="chart-error"
        className="flex items-center justify-center bg-gray-800 rounded-lg border border-red-900"
        style={{ width, height }}
      >
        <div className="text-center text-red-400">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p>{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (times.length === 0 || klineData.length === 0) {
    return (
      <div
        data-testid="chart-empty"
        className="flex items-center justify-center bg-gray-800 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-center text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p>暂无数据</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      data-testid="chart-container"
      style={{ width, height }}
      className="rounded-lg"
    />
  );
};

export default StockKLineChart;
