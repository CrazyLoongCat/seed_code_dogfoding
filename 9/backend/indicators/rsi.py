"""
RSI (Relative Strength Index) 技术指标计算模块。

设计原则：
- 纯函数（Pure Function）：相同输入永远产生相同输出，无副作用
- 无外部依赖：不读写数据库、不请求API、不依赖全局状态
- 依赖注入：所有数据通过参数传入，便于单元测试
- 数据驱动：测试时可通过固定Mock数据精确验证计算结果
"""

from typing import List, Optional


def calculate_rsi(
    prices: List[float],
    period: int = 14,
    use_wilder_smoothing: bool = True
) -> List[Optional[float]]:
    """
    计算 RSI (Relative Strength Index) 指标。

    RSI 计算公式：
    1. 计算价格变化 delta = close[i] - close[i-1]
    2. 分离上涨 (gain) 和下跌 (loss)
    3. 计算平均上涨 (avg_gain) 和平均下跌 (avg_loss)
    4. RS = avg_gain / avg_loss
    5. RSI = 100 - (100 / (1 + RS))

    Args:
        prices: 收盘价数组，按时间顺序排列（旧数据在前）
        period: RSI 周期，默认为 14
        use_wilder_smoothing: 是否使用 Wilder 平滑（True=Wilder, False=SMA）

    Returns:
        RSI 数组，长度与输入 prices 相同。
        前 period 个元素为 None（数据不足无法计算），
        后续元素为 0-100 之间的 RSI 值。

    为什么这样设计便于测试：
    1. 纯函数：无副作用，相同输入永远得到相同输出
    2. 边界明确：输入输出类型清晰，测试用例容易构造
    3. 无外部依赖：不需要 mock 任何外部资源
    4. 可预测性：可以手动计算期望值进行断言验证
    """
    if period <= 0:
        raise ValueError(f"RSI period must be positive, got {period}")

    n = len(prices)
    if n <= period:
        return [None] * n

    rsi_values: List[Optional[float]] = [None] * period

    deltas = [prices[i] - prices[i - 1] for i in range(1, n)]

    gains = [max(d, 0.0) for d in deltas]
    losses = [max(-d, 0.0) for d in deltas]

    if use_wilder_smoothing:
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period

        if avg_loss == 0:
            rsi_values.append(100.0 if avg_gain > 0 else 50.0)
        else:
            rs = avg_gain / avg_loss
            rsi_values.append(100.0 - (100.0 / (1.0 + rs)))

        for i in range(period, len(deltas)):
            gain = gains[i]
            loss = losses[i]

            avg_gain = (avg_gain * (period - 1) + gain) / period
            avg_loss = (avg_loss * (period - 1) + loss) / period

            if avg_loss == 0:
                rsi_values.append(100.0 if avg_gain > 0 else 50.0)
            else:
                rs = avg_gain / avg_loss
                rsi_values.append(100.0 - (100.0 / (1.0 + rs)))
    else:
        for i in range(period - 1, len(deltas)):
            start = i - period + 1
            avg_gain = sum(gains[start:i + 1]) / period
            avg_loss = sum(losses[start:i + 1]) / period

            if avg_loss == 0:
                rsi_values.append(100.0 if avg_gain > 0 else 50.0)
            else:
                rs = avg_gain / avg_loss
                rsi_values.append(100.0 - (100.0 / (1.0 + rs)))

    return rsi_values
