let currentNewsData = [];
let source1NameGlobal = '';
let source2NameGlobal = '';

document.addEventListener('DOMContentLoaded', function() {
    const compareBtn = document.getElementById('compareBtn');
    const simulateAICheckbox = document.getElementById('simulateAI');
    const apiKeySection = document.getElementById('apiKeySection');
    const sortSelect = document.getElementById('sortSelect');
    const quickBtns = document.querySelectorAll('.quick-btn');

    simulateAICheckbox.addEventListener('change', function() {
        apiKeySection.style.display = this.checked ? 'none' : 'block';
    });

    compareBtn.addEventListener('click', handleCompare);
    sortSelect.addEventListener('change', handleSort);

    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('url1').value = this.dataset.url1;
            document.getElementById('source1Name').value = this.dataset.name1;
            document.getElementById('url2').value = this.dataset.url2;
            document.getElementById('source2Name').value = this.dataset.name2;
        });
    });

    checkHealth();
});

async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        if (!response.ok) {
            showError('后端服务未正常运行，请检查服务器状态');
        }
    } catch (e) {
        console.warn('健康检查失败:', e);
    }
}

function showError(message) {
    const container = document.getElementById('errorContainer');
    container.style.display = 'block';
    container.innerHTML = `<strong>⚠️ 出错了:</strong> ${message}`;
}

function showErrors(errors) {
    const container = document.getElementById('errorContainer');
    container.style.display = 'block';
    container.innerHTML = `
        <strong>⚠️ 部分请求出现问题:</strong>
        <ul>
            ${errors.map(e => `<li>${e}</li>`).join('')}
        </ul>
    `;
}

function clearErrors() {
    document.getElementById('errorContainer').style.display = 'none';
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    const btn = document.getElementById('compareBtn');
    const btnText = document.getElementById('btnText');
    const spinner = document.getElementById('spinner');

    if (show) {
        overlay.style.display = 'flex';
        btn.disabled = true;
        btnText.textContent = '分析中...';
        spinner.style.display = 'inline-block';
    } else {
        overlay.style.display = 'none';
        btn.disabled = false;
        btnText.textContent = '🔍 开始对比分析';
        spinner.style.display = 'none';
    }
}

async function handleCompare() {
    clearErrors();
    
    const url1 = document.getElementById('url1').value.trim();
    const url2 = document.getElementById('url2').value.trim();
    const source1Name = document.getElementById('source1Name').value.trim() || '来源1';
    const source2Name = document.getElementById('source2Name').value.trim() || '来源2';
    const useSimulateAI = document.getElementById('simulateAI').checked;
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!url1 || !url2) {
        showError('请输入两个URL');
        return;
    }

    source1NameGlobal = source1Name;
    source2NameGlobal = source2Name;

    showLoading(true);

    try {
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url1,
                url2,
                source1_name: source1Name,
                source2_name: source2Name,
                use_simulate_ai: useSimulateAI,
                ai_api_key: apiKey
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || '请求失败');
        }

        if (data.error_messages && data.error_messages.length > 0) {
            showErrors(data.error_messages);
        }

        currentNewsData = data.merged_news;
        renderResults(data);

    } catch (error) {
        console.error('请求失败:', error);
        showError(error.message || '网络请求失败，请检查后端服务是否运行');
    } finally {
        showLoading(false);
    }
}

function renderResults(data) {
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';

    const cacheBadge = document.getElementById('cacheBadge');
    cacheBadge.style.display = data.cached ? 'block' : 'none';

    document.getElementById('source1Count').textContent = data.source1_count;
    document.getElementById('source2Count').textContent = data.source2_count;
    document.getElementById('mergedCount').textContent = data.merged_news.length;
    document.getElementById('source1StatName').textContent = source1NameGlobal;
    document.getElementById('source2StatName').textContent = source2NameGlobal;

    const analysis = data.ai_analysis;
    const analysisMode = document.getElementById('analysisMode');
    const modeMap = {
        'simulated_ai': '🤖 模拟AI',
        'openai_gpt': '🧠 OpenAI GPT',
        'rule_based': '📋 规则分析',
        'rule_based_fallback': '📋 规则分析(降级)'
    };
    analysisMode.textContent = modeMap[analysis.analysis_mode] || analysis.analysis_mode;

    document.getElementById('comparisonText').textContent = analysis.comparison;

    renderThemes('commonThemes', analysis.common_themes || [], true);
    renderThemes('source1Topics', analysis.source1_topics || []);
    renderThemes('source2Topics', analysis.source2_topics || []);

    document.getElementById('source1TopicsTitle').textContent = `${source1NameGlobal}热门话题`;
    document.getElementById('source2TopicsTitle').textContent = `${source2NameGlobal}热门话题`;

    renderNewsTable(currentNewsData);

    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderThemes(containerId, themes, isCommon = false) {
    const container = document.getElementById(containerId);
    if (!themes || themes.length === 0) {
        container.innerHTML = '<span style="color: #999; font-size: 0.9rem;">暂无数据</span>';
        return;
    }
    container.innerHTML = themes.map(theme => 
        `<span class="theme-tag ${isCommon ? 'common' : ''}">${theme}</span>`
    ).join('');
}

function renderNewsTable(newsList) {
    const tbody = document.getElementById('newsTableBody');
    tbody.innerHTML = newsList.map((item, index) => {
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
        
        let sourceHtml = '';
        if (item.source.includes(',') || (item.source.includes(source1NameGlobal) && item.source.includes(source2NameGlobal))) {
            sourceHtml = `<span class="source-tag both">双方共有</span>`;
        } else if (item.source.includes(source1NameGlobal)) {
            sourceHtml = `<span class="source-tag source1">${source1NameGlobal}</span>`;
        } else if (item.source.includes(source2NameGlobal)) {
            sourceHtml = `<span class="source-tag source2">${source2NameGlobal}</span>`;
        } else {
            sourceHtml = `<span class="source-tag">${item.source}</span>`;
        }

        const hotDisplay = formatHotValue(item.hot_value);

        return `
            <tr>
                <td><div class="rank-badge ${rankClass}">${index + 1}</div></td>
                <td class="title-cell">${escapeHtml(item.title)}</td>
                <td>
                    <div class="hot-value">${hotDisplay}</div>
                    <div class="hot-original">${escapeHtml(item.original_hot)}</div>
                </td>
                <td>${sourceHtml}</td>
            </tr>
        `;
    }).join('');
}

function formatHotValue(value) {
    if (value >= 100000000) {
        return (value / 100000000).toFixed(1) + '亿';
    } else if (value >= 10000) {
        return (value / 10000).toFixed(1) + '万';
    } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'k';
    }
    return Math.round(value).toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function handleSort() {
    const sortBy = document.getElementById('sortSelect').value;
    let sorted = [...currentNewsData];

    switch (sortBy) {
        case 'hot_desc':
            sorted.sort((a, b) => b.hot_value - a.hot_value);
            break;
        case 'hot_asc':
            sorted.sort((a, b) => a.hot_value - b.hot_value);
            break;
        case 'title_asc':
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
            break;
        case 'title_desc':
            sorted.sort((a, b) => b.title.localeCompare(a.title, 'zh-CN'));
            break;
    }

    renderNewsTable(sorted);
}
