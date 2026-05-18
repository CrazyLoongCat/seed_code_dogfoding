"""
市场数据模型定义。

设计原则：
- 统一历史 K 线数据与实时增量数据的 JSON Schema 契约
- 前端可以用同一套解析逻辑处理历史数据和实时推送数据
- 使用 Pydantic 进行类型安全的序列化/反序列化
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class KLineInterval(str, Enum):
    """K 线时间周期枚举。"""
    MIN_1 = "1m"
    MIN_5 = "5m"
    MIN_15 = "15m"
    MIN_30 = "30m"
    HOUR_1 = "1h"
    HOUR_4 = "4h"
    DAY_1 = "1d"
    WEEK_1 = "1w"
    MONTH_1 = "1M"


class OrderBookLevel(BaseModel):
    """
    买卖盘深度档位数据。

    为什么这样设计便于测试：
    - 结构简单，字段类型明确
    - 可以轻松构造 Mock 数据进行测试
    - 不可变数据结构，无副作用
    """
    price: float = Field(description="档位价格")
    quantity: float = Field(description="挂单数量")


class KLineData(BaseModel):
    """
    K 线数据模型。

    设计说明：
    - 同时适用于历史 K 线数据和实时增量 K 线数据
    - 前端可以用同一套解析逻辑处理两种数据
    - `is_closed` 字段标识该 K 线是否已收盘（历史数据均为 True，实时数据可能为 False）
    """
    timestamp: datetime = Field(description="K 线开始时间戳")
    open: float = Field(description="开盘价")
    high: float = Field(description="最高价")
    low: float = Field(description="最低价")
    close: float = Field(description="收盘价（最新价）")
    volume: float = Field(description="成交量")
    is_closed: bool = Field(
        default=True,
        description="该 K 线是否已收盘。历史数据为 True，实时增量数据可能为 False"
    )


class TickData(BaseModel):
    """
    实时 Tick 数据（成交明细）。

    设计说明：
    - 包含最新成交价、成交量、买卖盘深度
    - 与 KLineData 共享 timestamp 字段，便于时间轴对齐
    """
    timestamp: datetime = Field(description="成交时间戳")
    last_price: float = Field(description="最新成交价")
    last_quantity: float = Field(description="最新成交量")
    bid_levels: List[OrderBookLevel] = Field(
        default_factory=list,
        description="买盘档位（从高到低排序）"
    )
    ask_levels: List[OrderBookLevel] = Field(
        default_factory=list,
        description="卖盘档位（从低到高排序）"
    )


class MarketDataMessage(BaseModel):
    """
    市场数据 WebSocket 消息统一包装。

    设计说明：
    - 统一消息格式：type + payload
    - 前端通过 type 字段路由到不同的处理逻辑
    - payload 结构由 type 决定，保持灵活性
    - 历史 K 线批量数据和实时增量数据使用相同的 payload 结构
    """
    type: str = Field(description="消息类型: kline_history, kline_update, tick_update")
    symbol: str = Field(description="标的代码，如 BTCUSDT, AAPL")
    interval: Optional[KLineInterval] = Field(
        default=None,
        description="K 线周期（仅 K 线相关消息需要）"
    )
    kline_data: Optional[List[KLineData]] = Field(
        default=None,
        description="K 线数据数组（历史数据或更新数据）"
    )
    tick_data: Optional[TickData] = Field(
        default=None,
        description="实时 Tick 数据（仅 tick_update 消息）"
    )
    sequence: int = Field(
        default=0,
        description="消息序列号，用于检测丢包和乱序"
    )


class IndicatorData(BaseModel):
    """
    技术指标数据模型。

    设计说明：
    - 与 K 线数据通过 timestamp 关联
    - 支持多种指标类型，前端可按需渲染
    """
    timestamp: datetime = Field(description="对应 K 线时间戳")
    rsi: Optional[float] = Field(default=None, description="RSI 指标值")
    macd: Optional[float] = Field(default=None, description="MACD 指标值")
    macd_signal: Optional[float] = Field(default=None, description="MACD 信号线值")
    macd_histogram: Optional[float] = Field(default=None, description="MACD 柱形图值")


class HistoricalDataResponse(BaseModel):
    """
    历史数据 API 响应模型。

    设计说明：
    - 与 WebSocket 推送的 KLineData 结构完全一致
    - 前端可复用数据解析逻辑
    """
    symbol: str
    interval: KLineInterval
    klines: List[KLineData]
    indicators: Optional[List[IndicatorData]] = None
    ma5: Optional[List[Optional[float]]] = None
    ma10: Optional[List[Optional[float]]] = None
    ma20: Optional[List[Optional[float]]] = None
