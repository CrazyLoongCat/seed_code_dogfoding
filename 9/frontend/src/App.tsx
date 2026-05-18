import React, { useState, useEffect, useCallback } from 'react';
import StockKLineChart from './components/StockKLineChart';
import { formatChartData, KLineData, IndicatorData, KLineInterval } from './types/marketData';

interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  amount?: number;
  market_cap?: number;
  pe_ratio?: number;
  high_52week?: number;
  low_52week?: number;
  turnover_rate?: number;
  total_shares?: number;
  float_shares?: number;
  dividend_yield?: number;
}

interface OrderBookItem {
  price: number;
  quantity: number;
}

interface TickData {
  price: number;
  quantity: number;
  time: string;
  direction: 'buy' | 'sell' | 'neutral';
}

const App: React.FC = () => {
  const [symbol, setSymbol] = useState<string>('600519');
  const [interval, setInterval] = useState<KLineInterval>('1d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [stockList, setStockList] = useState<StockInfo[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(['600519', '000858', '601318']);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('A股');
  const [showMA, setShowMA] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [activeTab, setActiveTab] = useState<'kline' | 'timeline'>('kline');
  const [timelineData, setTimelineData] = useState<{ time: string; price: number; volume: number }[]>([]);
  const [orderBook, setOrderBook] = useState<{
    bids: OrderBookItem[];
    asks: OrderBookItem[];
  }>({
    bids: [],
    asks: [],
  });
  const [ticks, setTicks] = useState<TickData[]>([]);
  const [chartData, setChartData] = useState<{
    times: string[];
    klineData: Array<[number, number, number, number]>;
    volumes: number[];
    volumeColors: string[];
    rsiData: (number | null)[];
    ma5Data: (number | null)[];
    ma10Data: (number | null)[];
    ma20Data: (number | null)[];
  }>({
    times: [],
    klineData: [],
    volumes: [],
    volumeColors: [],
    rsiData: [],
    ma5Data: [],
    ma10Data: [],
    ma20Data: [],
  });

  const fetchStockList = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/stocks?market=${selectedMarket}`);
      const data = await response.json();
      setStockList(data.stocks || []);
    } catch (err) {
      console.error('Error fetching stock list:', err);
    }
  }, [selectedMarket]);

  const fetchStockInfo = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/stock/${symbol}`);
      const data = await response.json();
      setStockInfo(data);
    } catch (err) {
      console.error('Error fetching stock info:', err);
    }
  }, [symbol]);

  const fetchKLineData = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      if (!symbol || !interval) {
        return;
      }

      const response = await fetch(
        `http://localhost:8000/api/historical-data?symbol=${symbol}&interval=${interval}&limit=150`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();

      const klines: KLineData[] = data.klines.map((k: any) => ({
        ...k,
        timestamp: new Date(k.timestamp),
      }));
      const indicators: IndicatorData[] = data.indicators?.map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      })) || [];

      const formatted = formatChartData(klines, indicators);
      setChartData({
        ...formatted,
        ma5Data: data.ma5 || [],
        ma10Data: data.ma10 || [],
        ma20Data: data.ma20 || [],
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  const generateMockOrderBook = useCallback((basePrice: number) => {
    const bids: OrderBookItem[] = [];
    const asks: OrderBookItem[] = [];
    for (let i = 0; i < 5; i++) {
      bids.push({
        price: Number((basePrice * (1 - (i + 1) * 0.001)).toFixed(2)),
        quantity: Math.floor(Math.random() * 100000) + 10000,
      });
      asks.push({
        price: Number((basePrice * (1 + (i + 1) * 0.001)).toFixed(2)),
        quantity: Math.floor(Math.random() * 100000) + 10000,
      });
    }
    return { bids, asks };
  }, []);

  const generateMockTimeline = useCallback((basePrice: number) => {
    const data: { time: string; price: number; volume: number }[] = [];
    let price = basePrice;
    const now = new Date();
    for (let i = 240; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      price = price * (1 + (Math.random() - 0.5) * 0.002);
      data.push({
        time: time.toTimeString().slice(0, 5),
        price: Number(price.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000),
      });
    }
    return data;
  }, []);

  const generateMockTicks = useCallback((basePrice: number) => {
    const data: TickData[] = [];
    const now = new Date();
    for (let i = 0; i < 20; i++) {
      const time = new Date(now.getTime() - i * 3000);
      const direction = Math.random() > 0.5 ? 'buy' : 'sell';
      data.push({
        price: Number((basePrice * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2)),
        quantity: Math.floor(Math.random() * 10000) + 100,
        time: time.toTimeString().slice(0, 8),
        direction,
      });
    }
    return data;
  }, []);

  useEffect(() => {
    fetchStockList();
  }, [fetchStockList]);

  useEffect(() => {
    fetchStockInfo();
    fetchKLineData();
  }, [symbol, interval, fetchStockInfo, fetchKLineData]);

  useEffect(() => {
    if (stockInfo) {
      setOrderBook(generateMockOrderBook(stockInfo.price));
      setTimelineData(generateMockTimeline(stockInfo.price));
      setTicks(generateMockTicks(stockInfo.price));
    }
  }, [stockInfo, generateMockOrderBook, generateMockTimeline, generateMockTicks]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchStockInfo();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [fetchStockInfo]);

  useEffect(() => {
    if (stockInfo) {
      const intervalId = setInterval(() => {
        setOrderBook(generateMockOrderBook(stockInfo.price));
        setTicks(prev => {
          const newTicks = generateMockTicks(stockInfo.price).slice(0, 5);
          return [...newTicks, ...prev].slice(0, 20);
        });
      }, 3000);
      return () => clearInterval(intervalId);
    }
  }, [stockInfo, generateMockOrderBook, generateMockTicks]);

  const toggleWatchlist = (sym: string) => {
    if (watchlist.includes(sym)) {
      setWatchlist(watchlist.filter(s => s !== sym));
    } else {
      setWatchlist([...watchlist, sym]);
    }
  };

  const filteredStocks = stockList.filter(s =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const intervals: { value: KLineInterval; label: string }[] = [
    { value: '1m', label: '1分钟' },
    { value: '5m', label: '5分钟' },
    { value: '15m', label: '15分钟' },
    { value: '1h', label: '1小时' },
    { value: '1d', label: '日线' },
    { value: '1w', label: '周线' },
  ];

  const markets = [
    { value: 'A股', label: 'A股' },
    { value: '美股', label: '美股' },
    { value: '加密货币', label: '加密货币' },
  ];

  const formatNumber = (num: number | undefined | null, decimals = 2) => {
    if (num === undefined || num === null) return '--';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + '万亿';
    if (num >= 1e8) return (num / 1e8).toFixed(2) + '亿';
    if (num >= 1e4) return (num / 1e4).toFixed(2) + '万';
    return num.toFixed(decimals);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              StockMaster Pro
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-800 rounded-lg p-1">
              {markets.map(m => (
                <button
                  key={m.value}
                  onClick={() => setSelectedMarket(m.value)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    selectedMarket === m.value
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {showSearch && (
                <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-800">
                    <input
                      type="text"
                      placeholder="搜索股票代码或名称..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {filteredStocks.slice(0, 10).map(stock => (
                      <div
                        key={stock.symbol}
                        onClick={() => {
                          setSymbol(stock.symbol);
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="font-medium">{stock.name}</p>
                          <p className="text-sm text-gray-400">{stock.symbol} · {stock.industry}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${stock.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {stock.price.toFixed(2)}
                          </p>
                          <p className={`text-sm ${stock.change_percent >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              实时行情
            </div>
          </div>
        </div>
      </header>

      <main className="flex">
        <aside className="w-72 bg-gray-900 border-r border-gray-800 min-h-[calc(100vh-73px)] p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">自选股</h2>
            <span className="text-sm text-gray-500">{watchlist.length}只</span>
          </div>
          <div className="space-y-2">
            {watchlist.map(sym => {
              const stock = stockList.find(s => s.symbol === sym);
              if (!stock) return null;
              return (
                <div
                  key={sym}
                  onClick={() => setSymbol(sym)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${
                    symbol === sym
                      ? 'bg-gradient-to-r from-emerald-900/50 to-blue-900/50 border border-emerald-700/50'
                      : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{stock.name}</p>
                      <p className="text-xs text-gray-400">{stock.symbol} · {stock.exchange}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWatchlist(sym);
                      }}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className={`text-lg font-bold ${stock.change_percent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {stock.price.toFixed(2)}
                    </p>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      stock.change_percent >= 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 p-6">
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-center gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold">{stockInfo?.name || '--'}</h2>
                    <span className="text-gray-500 text-lg">{stockInfo?.symbol}</span>
                    <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
                      {stockInfo?.exchange} · {stockInfo?.industry}
                    </span>
                    <button
                      onClick={() => toggleWatchlist(symbol)}
                      className={`p-2 rounded-lg transition-colors ${
                        watchlist.includes(symbol) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                      }`}
                    >
                      <svg className="w-6 h-6" fill={watchlist.includes(symbol) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-4xl font-bold ${
                      (stockInfo?.change_percent || 0) >= 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {stockInfo?.price?.toFixed(2) || '--'}
                    </span>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                      (stockInfo?.change_percent || 0) >= 0 ? 'bg-red-500/20' : 'bg-green-500/20'
                    }`}>
                      <span className={`font-medium ${
                        (stockInfo?.change_percent || 0) >= 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {(stockInfo?.change || 0) >= 0 ? '+' : ''}{stockInfo?.change?.toFixed(2) || '--'}
                      </span>
                      <span className={`font-medium ${
                        (stockInfo?.change_percent || 0) >= 0 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {(stockInfo?.change_percent || 0) >= 0 ? '+' : ''}{stockInfo?.change_percent?.toFixed(2) || '--'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {intervals.map(iv => (
                  <button
                    key={iv.value}
                    onClick={() => setInterval(iv.value)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      interval === iv.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {iv.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mt-6 pt-6 border-t border-gray-800">
              <div>
                <p className="text-gray-500 text-sm">成交量</p>
                <p className="text-lg font-semibold">{formatNumber(stockInfo?.volume)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">成交额</p>
                <p className="text-lg font-semibold">{formatNumber(stockInfo?.amount || (stockInfo?.price || 0) * (stockInfo?.volume || 0))}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">市值</p>
                <p className="text-lg font-semibold">{formatNumber(stockInfo?.market_cap)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">市盈率</p>
                <p className="text-lg font-semibold">{stockInfo?.pe_ratio?.toFixed(2) || '--'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">换手率</p>
                <p className="text-lg font-semibold">{stockInfo?.turnover_rate?.toFixed(2) || '--'}%</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">52周最高</p>
                <p className="text-lg font-semibold text-red-400">{stockInfo?.high_52week?.toFixed(2) || '--'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">52周最低</p>
                <p className="text-lg font-semibold text-green-400">{stockInfo?.low_52week?.toFixed(2) || '--'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">股息率</p>
                <p className="text-lg font-semibold">{stockInfo?.dividend_yield?.toFixed(2) || '--'}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('kline')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'kline'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  K线图
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'timeline'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  分时图
                </button>
                <div className="flex items-center gap-4 ml-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMA}
                      onChange={(e) => setShowMA(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-400">MA均线</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRSI}
                      onChange={(e) => setShowRSI(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-400">RSI指标</span>
                  </label>
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                {activeTab === 'kline' ? (
                  <StockKLineChart
                    {...chartData}
                    loading={loading}
                    error={error}
                    height={550}
                    showMA={showMA}
                    showRSI={showRSI}
                  />
                ) : (
                  <div className="h-[550px] flex flex-col">
                    <div className="flex-1 relative">
                      <svg className="w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="none">
                        {timelineData.length > 0 && (
                          <>
                            {(() => {
                              const prices = timelineData.map(d => d.price);
                              const minPrice = Math.min(...prices) * 0.999;
                              const maxPrice = Math.max(...prices) * 1.001;
                              const priceRange = maxPrice - minPrice;
                              const points = timelineData.map((d, i) => {
                                const x = (i / (timelineData.length - 1)) * 800;
                                const y = 500 - ((d.price - minPrice) / priceRange) * 450 - 25;
                                return `${x},${y}`;
                              }).join(' ');
                              const baseY = timelineData.length > 0 
                                ? 500 - ((timelineData[0].price - minPrice) / priceRange) * 450 - 25 
                                : 250;
                              const isUp = timelineData.length > 1 && timelineData[timelineData.length - 1].price >= timelineData[0].price;
                              return (
                                <>
                                  <line x1="0" y1={baseY} x2="800" y2={baseY} stroke="#374151" strokeWidth="1" strokeDasharray="4" />
                                  <polyline
                                    points={points}
                                    fill="none"
                                    stroke={isUp ? '#ef4444' : '#22c55e'}
                                    strokeWidth="2"
                                  />
                                  <polygon
                                    points={`0,${baseY} ${points} 800,${baseY}`}
                                    fill={isUp ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}
                                  />
                                </>
                              );
                            })()}
                          </>
                        )}
                      </svg>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 px-2">
                      <span>09:30</span>
                      <span>11:30</span>
                      <span>13:00</span>
                      <span>15:00</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  上涨
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  下跌
                </span>
                {showMA && activeTab === 'kline' && (
                  <>
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-0.5 bg-amber-500"></span>
                      MA5
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-0.5 bg-blue-500"></span>
                      MA10
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-6 h-0.5 bg-purple-500"></span>
                      MA20
                    </span>
                  </>
                )}
                {showRSI && activeTab === 'kline' && (
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-0.5 bg-orange-500"></span>
                    RSI
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">买卖盘</h3>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 grid grid-cols-3 mb-2">
                    <span>卖盘</span>
                    <span className="text-right">价格</span>
                    <span className="text-right">数量</span>
                  </div>
                  {[...orderBook.asks].reverse().map((ask, i) => (
                    <div key={`ask-${i}`} className="grid grid-cols-3 text-sm relative py-1">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-red-500/10"
                        style={{ width: `${Math.min((ask.quantity / 100000) * 100, 100)}%` }}
                      />
                      <span className="relative z-10 text-red-400">卖{5 - i}</span>
                      <span className="relative z-10 text-right text-red-400">{ask.price.toFixed(2)}</span>
                      <span className="relative z-10 text-right text-gray-300">{formatNumber(ask.quantity, 0)}</span>
                    </div>
                  ))}
                  <div className="my-2 py-2 text-center bg-gray-800/50 rounded-lg">
                    <span className={`text-2xl font-bold ${
                      (stockInfo?.change_percent || 0) >= 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {stockInfo?.price.toFixed(2) || '--'}
                    </span>
                  </div>
                  {orderBook.bids.map((bid, i) => (
                    <div key={`bid-${i}`} className="grid grid-cols-3 text-sm relative py-1">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-green-500/10"
                        style={{ width: `${Math.min((bid.quantity / 100000) * 100, 100)}%` }}
                      />
                      <span className="relative z-10 text-green-400">买{i + 1}</span>
                      <span className="relative z-10 text-right text-green-400">{bid.price.toFixed(2)}</span>
                      <span className="relative z-10 text-right text-gray-300">{formatNumber(bid.quantity, 0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                <h3 className="text-lg font-semibold mb-4">分笔成交</h3>
                <div className="text-xs text-gray-500 grid grid-cols-3 mb-2">
                  <span>时间</span>
                  <span className="text-right">价格</span>
                  <span className="text-right">数量</span>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {ticks.map((tick, i) => (
                    <div key={i} className="grid grid-cols-3 text-sm py-1 border-b border-gray-800/50">
                      <span className="text-gray-400">{tick.time}</span>
                      <span className={`text-right ${
                        tick.direction === 'buy' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {tick.price.toFixed(2)}
                      </span>
                      <span className={`text-right ${
                        tick.direction === 'buy' ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {formatNumber(tick.quantity, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-900/30 to-blue-900/30 rounded-2xl p-4 border border-emerald-700/30">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  A股信息
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">交易所</span>
                    <span className="text-white">{stockInfo?.exchange || '--'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">总股本</span>
                    <span className="text-white">{formatNumber(stockInfo?.total_shares)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">流通股本</span>
                    <span className="text-white">{formatNumber(stockInfo?.float_shares)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">数据更新</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      实时同步
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
