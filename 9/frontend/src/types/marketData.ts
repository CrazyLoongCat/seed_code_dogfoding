/**
 * 市场数据类型定义。
 *
 * 设计原则：
 * - 与后端 Pydantic Model 保持 1:1 对应
 * - 统一历史 K 线数据与实时增量数据的结构
 * - 前端可以用同一套解析逻辑处理 REST API 和 WebSocket 数据
 * - 所有类型都是纯数据结构，无副作用，便于测试
 */

export type KLineInterval =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '4h'
  | '1d'
  | '1w'
  | '1M';

/**
 * 买卖盘深度档位数据。
 *
 * 为什么这样设计便于测试：
 * - 简单的数据结构，易于构造 Mock 数据
 * - 无方法、无状态，纯数据传输对象
 */
export interface OrderBookLevel {
  price: number;
  quantity: number;
}

/**
 * K 线数据接口。
 *
 * 设计说明：
 * - 同时适用于历史 K 线数据和实时增量 K 线数据
 * - `isClosed` 字段标识该 K 线是否已收盘
 * - 前端可以用同一套逻辑渲染历史数据和实时更新数据
 */
export interface KLineData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

/**
 * 实时 Tick 数据（成交明细）。
 */
export interface TickData {
  timestamp: Date;
  lastPrice: number;
  lastQuantity: number;
  bidLevels: OrderBookLevel[];
  askLevels: OrderBookLevel[];
}

/**
 * WebSocket 消息类型枚举。
 */
export type MarketMessageType = 'kline_history' | 'kline_update' | 'tick_update';

/**
 * 市场数据 WebSocket 消息统一包装。
 *
 * 设计说明：
 * - 与后端 MarketDataMessage 完全对应
 * - 使用判别联合类型（Discriminated Union）模式，便于 TypeScript 类型收窄
 * - 前端通过 type 字段进行类型安全的路由处理
 */
export interface MarketDataMessage {
  type: MarketMessageType;
  symbol: string;
  interval?: KLineInterval;
  klineData?: KLineData[];
  tickData?: TickData;
  sequence: number;
}

/**
 * 技术指标数据接口。
 *
 * 设计说明：
 * - 与 K 线数据通过 timestamp 关联
 * - 所有指标字段都是可选的，支持按需计算和传输
 */
export interface IndicatorData {
  timestamp: Date;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
}

/**
 * 历史数据 API 响应接口。
 */
export interface HistoricalDataResponse {
  symbol: string;
  interval: KLineInterval;
  klines: KLineData[];
  indicators?: IndicatorData[];
}

/**
 * ECharts 图表所需的格式化数据结构。
 *
 * 设计说明：
 * - 这是图表组件的输入格式，与业务数据结构解耦
 * - 数据转换层负责将 KLineData[] 转换为此格式
 * - 图表组件只关心此格式，不关心数据来源
 *
 * 为什么这样设计便于测试：
 * - 图表组件是纯展示型组件，输入输出明确
 * - 可以直接构造此格式的 Mock 数据测试组件渲染
 * - 数据转换逻辑可以单独测试
 */
export interface ChartFormattedData {
  times: string[];
  klineData: Array<[number, number, number, number]>; // [open, close, low, high]
  volumes: number[];
  volumeColors: string[];
  rsiData: (number | null)[];
}

/**
 * 将原始 K 线数据和指标数据转换为 ECharts 所需格式。
 *
 * 为什么这样设计便于测试：
 * - 纯函数：输入明确，输出可预测
 * - 无副作用：不依赖外部状态
 * - 可以用固定输入验证输出格式正确性
 *
 * @param klines K 线数据数组
 * @param indicators 指标数据数组（可选）
 * @returns ECharts 格式化数据
 */
export function formatChartData(
  klines: KLineData[],
  indicators?: IndicatorData[]
): ChartFormattedData {
  const times: string[] = [];
  const klineData: Array<[number, number, number, number]> = [];
  const volumes: number[] = [];
  const volumeColors: string[] = [];
  const rsiData: (number | null)[] = [];

  const indicatorMap = new Map<string, IndicatorData>();
  if (indicators) {
    indicators.forEach((ind) => {
      indicatorMap.set(ind.timestamp.toISOString(), ind);
    });
  }

  klines.forEach((kline) => {
    const timeStr = kline.timestamp.toISOString();
    times.push(timeStr);
    klineData.push([kline.open, kline.close, kline.low, kline.high]);
    volumes.push(kline.volume);
    volumeColors.push(kline.close >= kline.open ? '#ef5350' : '#26a69a');

    const indicator = indicatorMap.get(timeStr);
    rsiData.push(indicator?.rsi ?? null);
  });

  return {
    times,
    klineData,
    volumes,
    volumeColors,
    rsiData,
  };
}
