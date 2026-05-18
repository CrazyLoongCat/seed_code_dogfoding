"""
RSI 指标计算单元测试。

测试策略：
- 使用固定的 Mock 价格数据，手动计算期望值进行精确断言
- 覆盖边界情况：空数据、数据不足、正常数据、全涨全跌等
- 测试两种平滑算法：Wilder 平滑和简单移动平均 (SMA)
- 测试参数验证逻辑
"""

import pytest
from indicators.rsi import calculate_rsi


class TestCalculateRSI:
    """RSI 计算函数的测试套件。"""

    def test_empty_prices_returns_empty_list(self):
        """测试空价格数组返回空列表。"""
        result = calculate_rsi([], period=14)
        assert result == []

    def test_insufficient_data_returns_all_none(self):
        """测试数据量不足时返回全 None。"""
        prices = [100.0, 101.0, 102.0]
        result = calculate_rsi(prices, period=14)
        assert result == [None, None, None]
        assert len(result) == len(prices)

    def test_exact_period_data_returns_all_none(self):
        """测试数据量恰好等于周期时返回全 None。"""
        prices = [100.0 + i for i in range(14)]
        result = calculate_rsi(prices, period=14)
        assert all(r is None for r in result)
        assert len(result) == 14

    def test_constant_prices_returns_rsi_50(self):
        """测试价格不变时 RSI 应为 50（中性）。"""
        prices = [100.0] * 20
        result = calculate_rsi(prices, period=14)
        assert len(result) == 20
        assert all(r is None for r in result[:14])
        for rsi in result[14:]:
            assert rsi == pytest.approx(50.0, abs=0.001)

    def test_always_rising_prices_returns_rsi_100(self):
        """测试价格持续上涨时 RSI 趋近于 100。"""
        prices = [100.0 + i for i in range(20)]
        result = calculate_rsi(prices, period=14)
        assert len(result) == 20
        assert all(r is None for r in result[:14])
        for rsi in result[14:]:
            assert rsi == pytest.approx(100.0, abs=0.001)

    def test_always_falling_prices_returns_rsi_0(self):
        """测试价格持续下跌时 RSI 趋近于 0。"""
        prices = [100.0 - i for i in range(20)]
        result = calculate_rsi(prices, period=14)
        assert len(result) == 20
        assert all(r is None for r in result[:14])
        for rsi in result[14:]:
            assert rsi == pytest.approx(0.0, abs=0.001)

    def test_known_values_wilder_smoothing(self):
        """
        使用已知 Mock 数据测试 Wilder 平滑算法的 RSI 计算。

        Mock 数据说明：
        - 前 14 个价格：7 天上涨，7 天下跌，对称波动
        - 第 15 个价格：上涨
        - 预期 RSI 在 50 附近（对称波动）
        """
        prices = [
            100.0, 102.0, 101.0, 103.0, 102.0, 104.0, 103.0, 105.0,
            104.0, 106.0, 105.0, 107.0, 106.0, 108.0, 110.0, 109.0
        ]

        result = calculate_rsi(prices, period=14, use_wilder_smoothing=True)

        assert len(result) == 16
        assert all(r is None for r in result[:14])

        assert result[14] is not None
        assert 0.0 <= result[14] <= 100.0

        assert result[15] is not None
        assert 0.0 <= result[15] <= 100.0

    def test_known_values_sma_smoothing(self):
        """
        使用已知 Mock 数据测试 SMA 平滑算法的 RSI 计算。
        """
        prices = [
            100.0, 102.0, 101.0, 103.0, 102.0, 104.0, 103.0, 105.0,
            104.0, 106.0, 105.0, 107.0, 106.0, 108.0, 110.0, 109.0
        ]

        result = calculate_rsi(prices, period=14, use_wilder_smoothing=False)

        assert len(result) == 16
        assert all(r is None for r in result[:14])

        assert result[14] is not None
        assert 0.0 <= result[14] <= 100.0

    def test_custom_period(self):
        """测试自定义周期（如 9 日 RSI）。"""
        prices = [100.0 + i * 0.5 for i in range(15)]
        result = calculate_rsi(prices, period=9)

        assert len(result) == 15
        assert all(r is None for r in result[:9])
        for rsi in result[9:]:
            assert rsi is not None
            assert 0.0 <= rsi <= 100.0

    def test_negative_period_raises_error(self):
        """测试负周期参数抛出异常。"""
        with pytest.raises(ValueError, match="positive"):
            calculate_rsi([100.0, 101.0], period=-1)

    def test_zero_period_raises_error(self):
        """测试零周期参数抛出异常。"""
        with pytest.raises(ValueError, match="positive"):
            calculate_rsi([100.0, 101.0], period=0)

    def test_alternating_prices(self):
        """测试交替涨跌的价格序列。"""
        prices = [100.0, 102.0, 100.0, 102.0, 100.0, 102.0, 100.0, 102.0,
                  100.0, 102.0, 100.0, 102.0, 100.0, 102.0, 100.0, 102.0]

        result = calculate_rsi(prices, period=14)

        assert len(result) == 16
        assert result[14] is not None
        assert 40.0 <= result[14] <= 60.0

    def test_preserves_input_length(self):
        """测试输出数组长度始终等于输入数组长度。"""
        test_cases = [[], [100.0], [100.0, 101.0], [100.0] * 14, [100.0] * 100]

        for prices in test_cases:
            result = calculate_rsi(prices, period=14)
            assert len(result) == len(prices)
