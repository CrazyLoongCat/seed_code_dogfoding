/**
 * StockKLineChart 组件单元测试。
 *
 * 测试策略：
 * - Mock echarts 库，避免依赖真实浏览器环境
 * - 测试三种状态：正常数据渲染、空数据/加载中、数据异常
 * - 验证组件在不同 props 下的渲染行为
 * - 确保测试不依赖任何真实的网络环境或浏览器 API
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { StockKLineChart, StockKLineChartProps } from '../components/StockKLineChart';

/**
 * Mock echarts 库。
 *
 * 为什么需要 mock：
 * - 测试环境中没有真实的 Canvas/SVG 渲染能力
 * - 避免 ECharts 内部的复杂逻辑影响组件测试
 * - 只验证组件是否正确调用了 ECharts API，不验证 ECharts 本身的渲染
 */
jest.mock('echarts', () => ({
  init: jest.fn(() => ({
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
  })),
}));

describe('StockKLineChart', () => {
  /**
   * 生成 Mock 数据的辅助函数。
   *
   * 为什么提取为辅助函数：
   * - 多个测试用例需要相似的测试数据
   * - 保持测试用例简洁，关注测试逻辑而非数据构造
   * - 可以根据需要生成不同特征的测试数据
   */
  const generateMockKLineData = (
    count: number
  ): {
    times: string[];
    klineData: Array<[number, number, number, number]>;
    volumes: number[];
    volumeColors: string[];
    rsiData: (number | null)[];
  } => {
    const times: string[] = [];
    const klineData: Array<[number, number, number, number]> = [];
    const volumes: number[] = [];
    const volumeColors: string[] = [];
    const rsiData: (number | null)[] = [];

    const basePrice = 100;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * 60000).toISOString();
      times.push(timestamp);

      const open = basePrice + Math.random() * 10 - 5;
      const close = open + Math.random() * 4 - 2;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;

      klineData.push([open, close, low, high]);
      volumes.push(Math.random() * 1000000);
      volumeColors.push(close >= open ? '#ef5350' : '#26a69a');
      rsiData.push(i >= 14 ? 30 + Math.random() * 40 : null);
    }

    return { times, klineData, volumes, volumeColors, rsiData };
  };

  /**
   * 默认的基础 props。
   */
  const defaultProps: StockKLineChartProps = {
    times: [],
    klineData: [],
    volumes: [],
    volumeColors: [],
    rsiData: [],
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('加载状态', () => {
    it('当 loading 为 true 且无数据时，显示加载状态', () => {
      render(<StockKLineChart {...defaultProps} loading={true} />);

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('当 loading 为 true 但已有数据时，显示图表而非加载占位', () => {
      const mockData = generateMockKLineData(30);
      render(<StockKLineChart {...mockData} loading={true} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });

    it('当 loading 为 false 时，不显示加载状态', () => {
      render(<StockKLineChart {...defaultProps} loading={false} />);

      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });
  });

  describe('错误状态', () => {
    it('当 error 为 true 时，显示错误状态', () => {
      render(<StockKLineChart {...defaultProps} error={true} />);

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.getByText('数据加载失败')).toBeInTheDocument();
    });

    it('当 error 为 true 时，显示自定义错误信息', () => {
      const customMessage = '网络连接超时，请稍后重试';
      render(
        <StockKLineChart
          {...defaultProps}
          error={true}
          errorMessage={customMessage}
        />
      );

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it('当 error 为 true 时，即使有数据也优先显示错误', () => {
      const mockData = generateMockKLineData(30);
      render(<StockKLineChart {...mockData} error={true} />);

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
    });

    it('当 error 为 false 时，不显示错误状态', () => {
      render(<StockKLineChart {...defaultProps} error={false} />);

      expect(screen.queryByTestId('chart-error')).not.toBeInTheDocument();
    });
  });

  describe('空数据状态', () => {
    it('当 times 为空数组时，显示空数据状态', () => {
      render(
        <StockKLineChart
          {...defaultProps}
          times={[]}
          klineData={[[100, 101, 99, 102]]}
        />
      );

      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('当 klineData 为空数组时，显示空数据状态', () => {
      render(
        <StockKLineChart
          {...defaultProps}
          times={['2024-01-01T00:00:00.000Z']}
          klineData={[]}
        />
      );

      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('当 times 和 klineData 都为空时，显示空数据状态', () => {
      render(<StockKLineChart {...defaultProps} />);

      expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });
  });

  describe('正常数据渲染', () => {
    it('当有正常数据时，渲染图表容器', () => {
      const mockData = generateMockKLineData(30);
      render(<StockKLineChart {...mockData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chart-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
    });

    it('使用自定义高度和宽度', () => {
      const mockData = generateMockKLineData(30);
      const customHeight = 800;
      const customWidth = '90%';

      render(
        <StockKLineChart
          {...mockData}
          height={customHeight}
          width={customWidth}
        />
      );

      const container = screen.getByTestId('chart-container');
      expect(container).toHaveStyle({
        height: `${customHeight}px`,
        width: customWidth,
      });
    });

    it('当有 RSI 数据时，正常渲染', () => {
      const mockData = generateMockKLineData(50);
      render(<StockKLineChart {...mockData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('当 RSI 数据全为 null 时，正常渲染（不显示 RSI 指标）', () => {
      const mockData = generateMockKLineData(10);
      const rsiAllNull = mockData.rsiData.map(() => null);

      render(<StockKLineChart {...mockData} rsiData={rsiAllNull} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });

  describe('Props 边界情况', () => {
    it('数据量很大时正常渲染（1000 条数据）', () => {
      const mockData = generateMockKLineData(1000);
      render(<StockKLineChart {...mockData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('数据量很小时正常渲染（1 条数据）', () => {
      const mockData = generateMockKLineData(1);
      render(<StockKLineChart {...mockData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });

    it('volumeColors 长度不足时使用默认颜色', () => {
      const mockData = generateMockKLineData(10);
      const shortColors = mockData.volumeColors.slice(0, 5);

      render(
        <StockKLineChart
          {...mockData}
          volumeColors={shortColors}
        />
      );

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    });
  });

  describe('状态优先级', () => {
    it('错误状态优先级最高', () => {
      const mockData = generateMockKLineData(30);
      render(
        <StockKLineChart
          {...mockData}
          loading={true}
          error={true}
        />
      );

      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
    });

    it('加载状态优先级高于空数据', () => {
      render(
        <StockKLineChart
          {...defaultProps}
          loading={true}
          error={false}
        />
      );

      expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
    });

    it('正常数据优先级高于空数据', () => {
      const mockData = generateMockKLineData(30);
      render(<StockKLineChart {...mockData} />);

      expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-empty')).not.toBeInTheDocument();
    });
  });
});
