"""
股票交易分析后端服务。

提供K线历史数据查询、实时数据推送、A股股票信息等API接口。
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import math
import asyncio

from models.market_data import (
    KLineData,
    KLineInterval,
    HistoricalDataResponse,
    IndicatorData,
    MarketDataMessage,
    TickData,
    OrderBookLevel,
)
from indicators.rsi import calculate_rsi

app = FastAPI(title="StockMaster Pro API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StockInfo(BaseModel):
    """股票基本信息。"""
    symbol: str
    name: str
    exchange: str
    industry: str
    price: float
    change: float
    change_percent: float
    volume: float
    amount: Optional[float]
    market_cap: Optional[float]
    pe_ratio: Optional[float]
    high_52week: Optional[float]
    low_52week: Optional[float]
    turnover_rate: Optional[float]
    total_shares: Optional[float]
    float_shares: Optional[float]
    dividend_yield: Optional[float]


# A股股票数据库
A_STOCKS: Dict[str, StockInfo] = {
    "600519": StockInfo(
        symbol="600519",
        name="贵州茅台",
        exchange="SH",
        industry="白酒",
        price=1680.00,
        change=25.50,
        change_percent=1.54,
        volume=2560000,
        amount=4300000000,
        market_cap=2100000000000,
        pe_ratio=32.5,
        high_52week=1850.00,
        low_52week=1520.00,
        turnover_rate=0.12,
        total_shares=1256000000,
        float_shares=1256000000,
        dividend_yield=1.85,
    ),
    "000858": StockInfo(
        symbol="000858",
        name="五粮液",
        exchange="SZ",
        industry="白酒",
        price=158.50,
        change=-2.30,
        change_percent=-1.43,
        volume=8900000,
        amount=1410000000,
        market_cap=610000000000,
        pe_ratio=28.2,
        high_52week=185.00,
        low_52week=132.00,
        turnover_rate=0.23,
        total_shares=3880000000,
        float_shares=3880000000,
        dividend_yield=2.15,
    ),
    "601318": StockInfo(
        symbol="601318",
        name="中国平安",
        exchange="SH",
        industry="保险",
        price=48.65,
        change=0.85,
        change_percent=1.78,
        volume=45600000,
        amount=2220000000,
        market_cap=880000000000,
        pe_ratio=8.5,
        high_52week=55.20,
        low_52week=42.30,
        turnover_rate=0.25,
        total_shares=18300000000,
        float_shares=18300000000,
        dividend_yield=4.85,
    ),
    "600036": StockInfo(
        symbol="600036",
        name="招商银行",
        exchange="SH",
        industry="银行",
        price=35.80,
        change=0.45,
        change_percent=1.27,
        volume=32000000,
        amount=1150000000,
        market_cap=950000000000,
        pe_ratio=7.2,
        high_52week=38.50,
        low_52week=30.80,
        turnover_rate=0.12,
        total_shares=25600000000,
        float_shares=25600000000,
        dividend_yield=5.25,
    ),
    "000001": StockInfo(
        symbol="000001",
        name="平安银行",
        exchange="SZ",
        industry="银行",
        price=11.25,
        change=-0.15,
        change_percent=-1.32,
        volume=68000000,
        amount=765000000,
        market_cap=220000000000,
        pe_ratio=6.8,
        high_52week=13.50,
        low_52week=10.20,
        turnover_rate=0.35,
        total_shares=19400000000,
        float_shares=19400000000,
        dividend_yield=5.85,
    ),
    "300750": StockInfo(
        symbol="300750",
        name="宁德时代",
        exchange="SZ",
        industry="新能源",
        price=185.60,
        change=8.90,
        change_percent=5.04,
        volume=12500000,
        amount=2320000000,
        market_cap=820000000000,
        pe_ratio=25.6,
        high_52week=210.00,
        low_52week=155.00,
        turnover_rate=0.28,
        total_shares=4420000000,
        float_shares=3100000000,
        dividend_yield=0.85,
    ),
    "002594": StockInfo(
        symbol="002594",
        name="比亚迪",
        exchange="SZ",
        industry="新能源汽车",
        price=258.90,
        change=-5.60,
        change_percent=-2.12,
        volume=9800000,
        amount=2540000000,
        market_cap=720000000000,
        pe_ratio=45.2,
        high_52week=280.00,
        low_52week=210.00,
        turnover_rate=0.35,
        total_shares=2860000000,
        float_shares=1150000000,
        dividend_yield=0.55,
    ),
    "600900": StockInfo(
        symbol="600900",
        name="长江电力",
        exchange="SH",
        industry="电力",
        price=28.45,
        change=0.35,
        change_percent=1.25,
        volume=15600000,
        amount=444000000,
        market_cap=520000000000,
        pe_ratio=18.5,
        high_52week=30.20,
        low_52week=25.80,
        turnover_rate=0.09,
        total_shares=22700000000,
        float_shares=22700000000,
        dividend_yield=4.25,
    ),
    "601398": StockInfo(
        symbol="601398",
        name="工商银行",
        exchange="SH",
        industry="银行",
        price=7.85,
        change=0.08,
        change_percent=1.03,
        volume=125000000,
        amount=980000000,
        market_cap=2650000000000,
        pe_ratio=5.2,
        high_52week=8.50,
        low_52week=6.90,
        turnover_rate=0.04,
        total_shares=356000000000,
        float_shares=269600000000,
        dividend_yield=6.55,
    ),
    "600585": StockInfo(
        symbol="600585",
        name="海螺水泥",
        exchange="SH",
        industry="建材",
        price=42.35,
        change=-0.85,
        change_percent=-1.97,
        volume=18600000,
        amount=788000000,
        market_cap=225000000000,
        pe_ratio=9.8,
        high_52week=48.50,
        low_52week=35.20,
        turnover_rate=0.35,
        total_shares=5300000000,
        float_shares=5300000000,
        dividend_yield=5.15,
    ),
}

# 其他股票
OTHER_STOCKS: Dict[str, StockInfo] = {
    "BTCUSDT": StockInfo(
        symbol="BTCUSDT",
        name="比特币",
        exchange="BINANCE",
        industry="加密货币",
        price=67500.00,
        change=1250.00,
        change_percent=1.88,
        volume=15000000000,
        amount=None,
        market_cap=1320000000000,
        pe_ratio=None,
        high_52week=73500.00,
        low_52week=58000.00,
        turnover_rate=None,
        total_shares=None,
        float_shares=None,
        dividend_yield=None,
    ),
    "ETHUSDT": StockInfo(
        symbol="ETHUSDT",
        name="以太坊",
        exchange="BINANCE",
        industry="加密货币",
        price=3450.00,
        change=45.00,
        change_percent=1.32,
        volume=8500000000,
        amount=None,
        market_cap=415000000000,
        pe_ratio=None,
        high_52week=4050.00,
        low_52week=2800.00,
        turnover_rate=None,
        total_shares=None,
        float_shares=None,
        dividend_yield=None,
    ),
    "AAPL": StockInfo(
        symbol="AAPL",
        name="苹果公司",
        exchange="NASDAQ",
        industry="科技",
        price=185.50,
        change=2.30,
        change_percent=1.25,
        volume=52000000,
        amount=None,
        market_cap=2850000000000,
        pe_ratio=28.5,
        high_52week=199.62,
        low_52week=164.08,
        turnover_rate=None,
        total_shares=None,
        float_shares=None,
        dividend_yield=None,
    ),
    "GOOGL": StockInfo(
        symbol="GOOGL",
        name="谷歌",
        exchange="NASDAQ",
        industry="科技",
        price=140.20,
        change=-1.80,
        change_percent=-1.27,
        volume=28000000,
        amount=None,
        market_cap=1780000000000,
        pe_ratio=22.8,
        high_52week=153.78,
        low_52week=120.21,
        turnover_rate=None,
        total_shares=None,
        float_shares=None,
        dividend_yield=None,
    ),
    "TSLA": StockInfo(
        symbol="TSLA",
        name="特斯拉",
        exchange="NASDAQ",
        industry="新能源汽车",
        price=245.80,
        change=5.60,
        change_percent=2.33,
        volume=98000000,
        amount=None,
        market_cap=780000000000,
        pe_ratio=68.5,
        high_52week=299.29,
        low_52week=212.36,
        turnover_rate=None,
        total_shares=None,
        float_shares=None,
        dividend_yield=None,
    ),
}

ALL_STOCKS = {**A_STOCKS, **OTHER_STOCKS}


def generate_mock_klines(
    symbol: str,
    interval: KLineInterval,
    count: int = 100,
    base_price: float = 100.0,
) -> List[KLineData]:
    """生成模拟K线数据。"""
    klines: List[KLineData] = []
    now = datetime.now()

    interval_seconds = {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "30m": 1800,
        "1h": 3600,
        "4h": 14400,
        "1d": 86400,
        "1w": 604800,
        "1M": 2592000,
    }

    seconds = interval_seconds.get(interval, 60)
    current_price = base_price

    for i in range(count):
        timestamp = now - timedelta(seconds=(count - i) * seconds)

        volatility = random.uniform(0.5, 3.0)
        trend = math.sin(i * 0.1) * 2.0
        noise = random.uniform(-1, 1)

        open_price = current_price
        close_price = open_price + trend + noise * volatility
        high_price = max(open_price, close_price) + random.uniform(0, 2)
        low_price = min(open_price, close_price) - random.uniform(0, 2)
        volume = random.uniform(100000, 2000000)

        klines.append(
            KLineData(
                timestamp=timestamp,
                open=round(open_price, 2),
                high=round(high_price, 2),
                low=round(low_price, 2),
                close=round(close_price, 2),
                volume=round(volume, 2),
                is_closed=True,
            )
        )

        current_price = close_price

    return klines


def calculate_ma(prices: List[float], period: int) -> List[Optional[float]]:
    """计算移动平均线。"""
    ma_values: List[Optional[float]] = []
    for i in range(len(prices)):
        if i < period - 1:
            ma_values.append(None)
        else:
            ma = sum(prices[i - period + 1:i + 1]) / period
            ma_values.append(round(ma, 2))
    return ma_values


def calculate_indicators(klines: List[KLineData]) -> Dict[str, List[Optional[float]]]:
    """计算技术指标。"""
    closes = [k.close for k in klines]
    rsi_values = calculate_rsi(closes, period=14)
    ma5 = calculate_ma(closes, 5)
    ma10 = calculate_ma(closes, 10)
    ma20 = calculate_ma(closes, 20)

    return {
        "rsi": rsi_values,
        "ma5": ma5,
        "ma10": ma10,
        "ma20": ma20,
    }


async def sync_stock_data():
    """定时同步A股数据同步任务。"""
    while True:
        for symbol in A_STOCKS:
            stock = A_STOCKS[symbol]
            change = random.uniform(-3, 3)
            old_price = stock.price
            stock.price = round(stock.price * (1 + change / 100), 2)
            stock.change = round(stock.price - old_price, 2)
            stock.change_percent = round((stock.price - old_price) / old_price * 100, 2)
            stock.volume = int(stock.volume * random.uniform(0.85, 1.15))
            stock.amount = round(stock.volume * stock.price, 2)
            stock.turnover_rate = round(stock.volume / (stock.float_shares or stock.total_shares or 1) * 100, 4)
            stock.market_cap = round(stock.price * (stock.total_shares or 1), 2)
        await asyncio.sleep(30)  # 每30秒更新一次


@app.on_event("startup")
async def startup_event():
    """启动时启动定时同步任务。"""
    asyncio.create_task(sync_stock_data())


@app.get("/")
async def root():
    """健康检查接口。"""
    return {"status": "ok", "message": "StockMaster Pro API is running", "version": "2.0.0"}


@app.get("/api/stocks")
async def get_stock_list(
    market: Optional[str] = Query(None, description="市场: A股/美股/加密货币"),
    search: Optional[str] = Query(None, description="搜索关键词"),
):
    """获取股票列表。"""
    result = list(ALL_STOCKS.values())

    if market == "A股":
        result = list(A_STOCKS.values())
    elif market == "美股":
        result = [s for s in OTHER_STOCKS.values() if s.exchange in ["NASDAQ", "NYSE"]]
    elif market == "加密货币":
        result = [s for s in OTHER_STOCKS.values() if s.exchange == "BINANCE"]

    if search:
        search_lower = search.lower()
        result = [
            s for s in result
            if search_lower in s.symbol.lower() or search_lower in s.name.lower()
        ]

    return {"stocks": result}


@app.get("/api/stock/{symbol}")
async def get_stock_info(symbol: str):
    """获取股票详情信息。"""
    stock = ALL_STOCKS.get(symbol)
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock not found")
    return stock


@app.get("/api/historical-data")
async def get_historical_data(
    symbol: str = Query(..., description="标的代码"),
    interval: KLineInterval = Query(KLineInterval.MIN_1, description="K线周期"),
    limit: int = Query(120, ge=1, le=1000, description="返回K线数量"),
):
    """获取历史K线数据。"""
    stock = ALL_STOCKS.get(symbol)
    base_price = stock.price if stock else 100.0

    klines = generate_mock_klines(symbol, interval, limit, base_price)
    indicators = calculate_indicators(klines)

    indicator_data = [
        IndicatorData(
            timestamp=kline.timestamp,
            rsi=round(rsi, 2) if rsi else None,
        )
        for kline, rsi in zip(klines, indicators["rsi"])
    ]

    return HistoricalDataResponse(
        symbol=symbol,
        interval=interval,
        klines=klines,
        indicators=indicator_data,
        ma5=indicators["ma5"],
        ma10=indicators["ma10"],
        ma20=indicators["ma20"],
    )


@app.get("/api/quote/{symbol}")
async def get_realtime_quote(symbol: str):
    """获取实时行情。"""
    stock = ALL_STOCKS.get(symbol)
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock not found")

    change = random.uniform(-2, 2)
    current_price = round(stock.price * (1 + change / 100), 2)

    return {
        "symbol": symbol,
        "name": stock.name,
        "price": round(current_price, 2),
        "change": round(current_price - stock.price, 2),
        "change_percent": round(change, 2),
        "volume": int(stock.volume * random.uniform(0.95, 1.05)),
        "timestamp": datetime.now(),
    }


@app.websocket("/ws/market-data")
async def websocket_market_data(websocket: WebSocket):
    """实时市场数据WebSocket推送。"""
    await websocket.accept()
    sequence = 0

    try:
        while True:
            for symbol in ["BTCUSDT", "600519", "AAPL"]:
                stock = ALL_STOCKS.get(symbol)
                if not stock:
                    continue

                last_price = stock.price * (1 + random.uniform(-0.5, 0.5) / 100)
                last_quantity = random.uniform(10, 1000)

                bid_levels = [
                    OrderBookLevel(price=last_price - i * 0.01 * last_price, quantity=random.uniform(100, 5000))
                    for i in range(5)
                ]
                ask_levels = [
                    OrderBookLevel(price=last_price + i * 0.01 * last_price, quantity=random.uniform(100, 5000))
                    for i in range(5)
                ]

                tick_data = TickData(
                    timestamp=datetime.now(),
                    last_price=round(last_price, 2),
                    last_quantity=round(last_quantity, 4),
                    bid_levels=bid_levels,
                    ask_levels=ask_levels,
                )

                message = MarketDataMessage(
                    type="tick_update",
                    symbol=symbol,
                    tick_data=tick_data,
                    sequence=sequence,
                )

                await websocket.send_json(message.model_dump(mode="json"))
                sequence += 1

            await asyncio.sleep(1)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
