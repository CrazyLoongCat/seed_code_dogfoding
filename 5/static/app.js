const state = {
    currentMode: 'single',
    batchResults: [],
    currentSingleResult: null,
    currentTrendData: null,
    currentDetailUrl: null
};

const elements = {
    modeTabs: document.querySelectorAll('.mode-tab'),
    singleMode: document.getElementById('singleMode'),
    batchMode: document.getElementById('batchMode'),
    trendMode: document.getElementById('trendMode'),
    urlInput: document.getElementById('urlInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    errorMessage: document.getElementById('errorMessage'),
    batchErrorMessage: document.getElementById('batchErrorMessage'),
    trendErrorMessage: document.getElementById('trendErrorMessage'),
    loadingSection: document.getElementById('loadingSection'),
    loadingText: document.getElementById('loadingText'),
    resultsSection: document.getElementById('resultsSection'),
    resultTitle: document.getElementById('resultTitle'),
    cacheIndicator: document.getElementById('cacheIndicator'),
    exportBtn: document.getElementById('exportBtn'),
    singleResultContent: document.getElementById('singleResultContent'),
    batchResultContent: document.getElementById('batchResultContent'),
    trendResultContent: document.getElementById('trendResultContent'),
    scoreValue: document.getElementById('scoreValue'),
    scoreCircle: document.getElementById('scoreCircle'),
    scoreLevel: document.getElementById('scoreLevel'),
    scoreDescription: document.getElementById('scoreDescription'),
    comparisonAlert: document.getElementById('comparisonAlert'),
    rulesContainer: document.getElementById('rulesContainer'),
    suggestionsContainer: document.getElementById('suggestionsContainer'),
    commonIssuesSection: document.getElementById('commonIssuesSection'),
    commonIssuesContainer: document.getElementById('commonIssuesContainer'),
    aggregateSuggestionsContainer: document.getElementById('aggregateSuggestionsContainer'),
    comparisonTableBody: document.getElementById('comparisonTableBody'),
    batchDetailSection: document.getElementById('batchDetailSection'),
    batchDetailTitle: document.getElementById('batchDetailTitle'),
    batchDetailContent: document.getElementById('batchDetailContent'),
    trendUrlInput: document.getElementById('trendUrlInput'),
    trendBtn: document.getElementById('trendBtn'),
    trendChart: document.getElementById('trendChart'),
    noTrendData: document.getElementById('noTrendData'),
    trendComparisonSection: document.getElementById('trendComparisonSection'),
    trendComparisonContainer: document.getElementById('trendComparisonContainer'),
    addUrlBtn: document.getElementById('addUrlBtn'),
    urlInputsWrapper: document.querySelector('.url-inputs-wrapper'),
    batchAnalyzeBtn: document.getElementById('batchAnalyzeBtn'),
    fileInput: document.getElementById('fileInput')
};

const CIRCUMFERENCE = 2 * Math.PI * 54;
elements.scoreCircle.style.strokeDasharray = CIRCUMFERENCE;
elements.scoreCircle.style.strokeDashoffset = CIRCUMFERENCE;

function switchMode(mode) {
    state.currentMode = mode;
    elements.modeTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    elements.singleMode.classList.toggle('hidden', mode !== 'single');
    elements.batchMode.classList.toggle('hidden', mode !== 'batch');
    elements.trendMode.classList.toggle('hidden', mode !== 'trend');
    elements.resultsSection.classList.add('hidden');
    elements.singleResultContent.classList.add('hidden');
    elements.batchResultContent.classList.add('hidden');
    elements.trendResultContent.classList.add('hidden');
    clearErrors();
}

function clearErrors() {
    elements.errorMessage.style.display = 'none';
    elements.batchErrorMessage.style.display = 'none';
    elements.trendErrorMessage.style.display = 'none';
}

function isValidUrl(string) {
    try { new URL(string); return true; } catch (_) { return false; }
}

function getStatusIcon(status) {
    return { pass: '✓', warning: '!', fail: '✕' }[status] || '?';
}

function getScoreLevel(score) {
    if (score >= 90) return { level: '优秀', class: 'excellent', color: '#4caf50', description: '您的网页在可访问性和SEO方面表现出色！' };
    if (score >= 70) return { level: '良好', class: 'good', color: '#8bc34a', description: '您的网页表现不错，但还有一些可以改进的地方。' };
    if (score >= 50) return { level: '一般', class: 'average', color: '#ff9800', description: '您的网页需要一些优化来提升可访问性和SEO表现。' };
    return { level: '较差', class: 'poor', color: '#f44336', description: '您的网页在可访问性和SEO方面有较大的提升空间。' };
}

function animateScore(score) {
    const duration = 1500;
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentScore = Math.floor(progress * score);
        elements.scoreValue.textContent = currentScore;
        const offset = CIRCUMFERENCE - (progress * score / 100) * CIRCUMFERENCE;
        elements.scoreCircle.style.strokeDashoffset = offset;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function renderRules(rules, container) {
    container.innerHTML = '';
    rules.forEach(rule => {
        const card = document.createElement('div');
        card.className = `rule-card ${rule.status}`;
        card.innerHTML = `
            <div class="rule-header">
                <div class="status-icon ${rule.status}">${getStatusIcon(rule.status)}</div>
                <div class="rule-name">${rule.name}</div>
            </div>
            <div class="rule-message">${rule.message}</div>
        `;
        container.appendChild(card);
    });
}

function renderSuggestions(suggestions, container) {
    container.innerHTML = '';
    if (suggestions.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">没有需要优化的建议</p>';
        return;
    }
    suggestions.forEach(suggestion => {
        const card = document.createElement('div');
        card.className = 'suggestion-card';
        const impactClass = suggestion.impact === '高' ? 'high' : suggestion.impact === '中' ? 'medium' : 'low';
        const diffClass = suggestion.difficulty === '高' ? 'high' : suggestion.difficulty === '中' ? 'medium' : 'low';
        card.innerHTML = `
            <div class="suggestion-header">
                <div class="priority-badge">${suggestion.priority}</div>
                <div class="suggestion-title">${suggestion.title}</div>
                <div class="badge-group">
                    <span class="impact-badge ${impactClass}">${suggestion.impact}影响</span>
                    <span class="difficulty-badge ${diffClass}">${suggestion.difficulty}难度</span>
                    <span class="improvement-badge">+${suggestion.expected_score_improvement}分</span>
                </div>
            </div>
            <div class="suggestion-description">${suggestion.description}</div>
        `;
        container.appendChild(card);
    });
}

function displaySingleResult(data) {
    state.currentSingleResult = data;
    if (data.from_cache) {
        elements.cacheIndicator.classList.remove('hidden');
    } else {
        elements.cacheIndicator.classList.add('hidden');
    }
    const scoreInfo = getScoreLevel(data.health_score);
    elements.scoreCircle.style.stroke = scoreInfo.color;
    elements.scoreLevel.textContent = scoreInfo.level;
    elements.scoreLevel.className = `score-level ${scoreInfo.class}`;
    elements.scoreDescription.textContent = scoreInfo.description;
    animateScore(data.health_score);
    renderRules(data.rules, elements.rulesContainer);
    renderSuggestions(data.suggestions, elements.suggestionsContainer);
    elements.singleResultContent.classList.remove('hidden');
    elements.resultsSection.classList.remove('hidden');
    elements.exportBtn.classList.remove('hidden');
    elements.resultTitle.textContent = '诊断结果';
    fetch(`/api/trend?url=${encodeURIComponent(data.url)}`)
        .then(res => res.json())
        .then(trendData => {
            if (trendData.comparisons && trendData.comparisons.length > 0) {
                const improved = trendData.comparisons.filter(c => c.improved).length;
                const regressed = trendData.comparisons.filter(c => c.regressed).length;
                if (improved > 0 || regressed > 0) {
                    let alertHtml = '';
                    if (improved > 0) {
                        alertHtml += `<strong>✓ 进步！</strong> 相比上次检测，修复了 ${improved} 个问题。`;
                    }
                    if (regressed > 0) {
                        alertHtml += `<strong>⚠ 注意：</strong> 相比上次检测，新增了 ${regressed} 个问题。`;
                    }
                    elements.comparisonAlert.innerHTML = alertHtml;
                    elements.comparisonAlert.className = `comparison-alert ${improved > regressed ? 'improved' : 'regressed'}`;
                    elements.comparisonAlert.classList.remove('hidden');
                }
            }
        }).catch(() => {});
}

async function analyzeUrl() {
    const url = elements.urlInput.value.trim();
    if (!url) { showError('请输入要检测的网页URL'); return; }
    if (!isValidUrl(url)) { showError('请输入有效的URL地址'); return; }
    clearErrors();
    elements.loadingText.textContent = '正在分析网页，请稍候...';
    elements.loadingSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.analyzeBtn.disabled = true;
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `请求失败 (${response.status})`);
        }
        const data = await response.json();
        displaySingleResult(data);
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        showError('分析失败: ' + error.message);
    } finally {
        elements.loadingSection.classList.add('hidden');
        elements.analyzeBtn.disabled = false;
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

function addUrlInput() {
    const inputCount = elements.urlInputsWrapper.querySelectorAll('.url-input-row').length;
    if (inputCount >= 5) return;
    const row = document.createElement('div');
    row.className = 'url-input-row';
    row.innerHTML = `
        <input type="url" class="batch-url-input" placeholder="URL ${inputCount + 1}" required>
        <button class="remove-url-btn">×</button>
    `;
    row.querySelector('.remove-url-btn').addEventListener('click', () => {
        row.remove();
        updateRemoveButtons();
    });
    elements.urlInputsWrapper.appendChild(row);
    updateRemoveButtons();
}

function updateRemoveButtons() {
    const rows = elements.urlInputsWrapper.querySelectorAll('.url-input-row');
    rows.forEach((row, index) => {
        const removeBtn = row.querySelector('.remove-url-btn');
        removeBtn.style.display = rows.length > 1 ? 'flex' : 'none';
        row.querySelector('.batch-url-input').placeholder = `URL ${index + 1}`;
    });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const urls = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
        const validUrls = urls.filter(u => isValidUrl(u)).slice(0, 5);
        if (validUrls.length === 0) {
            elements.batchErrorMessage.textContent = '文件中没有找到有效的URL';
            elements.batchErrorMessage.style.display = 'block';
            return;
        }
        elements.urlInputsWrapper.innerHTML = '';
        validUrls.forEach((url, index) => {
            const row = document.createElement('div');
            row.className = 'url-input-row';
            row.innerHTML = `
                <input type="url" class="batch-url-input" value="${url}" placeholder="URL ${index + 1}" required>
                <button class="remove-url-btn" style="${validUrls.length > 1 ? '' : 'display:none;'}">×</button>
            `;
            row.querySelector('.remove-url-btn').addEventListener('click', () => {
                row.remove();
                updateRemoveButtons();
            });
            elements.urlInputsWrapper.appendChild(row);
        });
    };
    reader.readAsText(file);
}

async function batchAnalyze() {
    const inputs = elements.urlInputsWrapper.querySelectorAll('.batch-url-input');
    const urls = Array.from(inputs).map(input => input.value.trim()).filter(u => u && isValidUrl(u));
    if (urls.length === 0) {
        elements.batchErrorMessage.textContent = '请至少输入一个有效的URL';
        elements.batchErrorMessage.style.display = 'block';
        return;
    }
    if (urls.length > 5) {
        elements.batchErrorMessage.textContent = '最多只能输入5个URL';
        elements.batchErrorMessage.style.display = 'block';
        return;
    }
    elements.batchErrorMessage.style.display = 'none';
    elements.loadingText.textContent = `正在分析 ${urls.length} 个页面，请稍候...`;
    elements.loadingSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.batchAnalyzeBtn.disabled = true;
    try {
        const response = await fetch('/api/batch-analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urls }),
        });
        if (!response.ok) throw new Error(`请求失败 (${response.status})`);
        const data = await response.json();
        state.batchResults = data.results;
        displayBatchResults(data);
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        elements.batchErrorMessage.textContent = '批量分析失败: ' + error.message;
        elements.batchErrorMessage.style.display = 'block';
    } finally {
        elements.loadingSection.classList.add('hidden');
        elements.batchAnalyzeBtn.disabled = false;
    }
}

function displayBatchResults(data) {
    elements.resultTitle.textContent = '多页面对比结果';
    elements.cacheIndicator.classList.add('hidden');
    elements.exportBtn.classList.add('hidden');
    if (data.common_issues && data.common_issues.length > 0) {
        elements.commonIssuesSection.classList.remove('hidden');
        elements.commonIssuesContainer.innerHTML = data.common_issues
            .map(issue => `<div class="common-issue-item">• ${issue}</div>`).join('');
        if (data.aggregate_suggestions && data.aggregate_suggestions.length > 0) {
            renderSuggestions(data.aggregate_suggestions, elements.aggregateSuggestionsContainer);
        }
    } else {
        elements.commonIssuesSection.classList.add('hidden');
    }
    elements.comparisonTableBody.innerHTML = '';
    data.results.forEach((result, index) => {
        const row = document.createElement('tr');
        if (result.success) {
            const r = result.result;
            const scoreInfo = getScoreLevel(r.health_score);
            row.innerHTML = `
                <td title="${r.url}">${r.url.substring(0, 40)}${r.url.length > 40 ? '...' : ''}</td>
                <td class="score-cell" style="color: ${scoreInfo.color}">${r.health_score}</td>
                ${r.rules.map(rule => `<td><span class="status-badge ${rule.status}">${getStatusIcon(rule.status)}</span></td>`).join('')}
                <td><button class="view-detail-btn" data-index="${index}">详情</button></td>
            `;
        } else {
            row.innerHTML = `
                <td title="${result.url}" class="error-row">${result.url.substring(0, 40)}${result.url.length > 40 ? '...' : ''}</td>
                <td colspan="9" class="error-row">分析失败: ${result.error}</td>
                <td>-</td>
            `;
        }
        elements.comparisonTableBody.appendChild(row);
    });
    document.querySelectorAll('.view-detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            showBatchDetail(index);
        });
    });
    elements.batchResultContent.classList.remove('hidden');
    elements.singleResultContent.classList.add('hidden');
    elements.trendResultContent.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');
}

function showBatchDetail(index) {
    const result = state.batchResults[index];
    if (!result || !result.success) return;
    const data = result.result;
    state.currentDetailUrl = data.url;
    elements.batchDetailTitle.textContent = `${data.url} 的详细分析`;
    const scoreInfo = getScoreLevel(data.health_score);
    elements.batchDetailContent.innerHTML = `
        <div class="score-card">
            <div class="score-circle">
                <svg viewBox="0 0 120 120" class="score-svg">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e0e0e0" stroke-width="12" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="${scoreInfo.color}" stroke-width="12"
                            stroke-dasharray="339.292" stroke-dashoffset="${339.292 - (data.health_score / 100) * 339.292}"
                            transform="rotate(-90 60 60)" class="score-progress" />
                </svg>
                <div class="score-text">
                    <span style="display:block;font-size:2.2rem;font-weight:700;color:#333;">${data.health_score}</span>
                    <span style="display:block;font-size:0.85rem;color:#666;">健康分</span>
                </div>
            </div>
            <div class="score-details">
                <div class="score-level ${scoreInfo.class}">${scoreInfo.level}</div>
                <p>${scoreInfo.description}</p>
            </div>
        </div>
        <div class="rules-section"><h3>检测指标</h3><div id="detailRules" class="rules-grid"></div></div>
        <div class="suggestions-section"><h3>AI 优化建议</h3><div id="detailSuggestions" class="suggestions-list"></div></div>
    `;
    renderRules(data.rules, elements.batchDetailContent.querySelector('#detailRules'));
    renderSuggestions(data.suggestions, elements.batchDetailContent.querySelector('#detailSuggestions'));
    elements.batchDetailSection.classList.remove('hidden');
    elements.batchDetailSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function showTrend() {
    const url = elements.trendUrlInput.value.trim();
    if (!url) {
        elements.trendErrorMessage.textContent = '请输入要查看趋势的URL';
        elements.trendErrorMessage.style.display = 'block';
        return;
    }
    if (!isValidUrl(url)) {
        elements.trendErrorMessage.textContent = '请输入有效的URL地址';
        elements.trendErrorMessage.style.display = 'block';
        return;
    }
    elements.trendErrorMessage.style.display = 'none';
    elements.loadingText.textContent = '正在获取趋势数据...';
    elements.loadingSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.trendBtn.disabled = true;
    try {
        const response = await fetch(`/api/trend?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`请求失败 (${response.status})`);
        const data = await response.json();
        state.currentTrendData = data;
        displayTrendResults(data, url);
        elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
        elements.trendErrorMessage.textContent = '获取趋势数据失败: ' + error.message;
        elements.trendErrorMessage.style.display = 'block';
    } finally {
        elements.loadingSection.classList.add('hidden');
        elements.trendBtn.disabled = false;
    }
}

function displayTrendResults(data, url) {
    elements.resultTitle.textContent = '趋势分析';
    elements.cacheIndicator.classList.add('hidden');
    elements.exportBtn.classList.add('hidden');
    if (!data.trends || data.trends.length === 0) {
        elements.noTrendData.classList.remove('hidden');
        elements.trendChart.classList.add('hidden');
        elements.trendComparisonSection.classList.add('hidden');
    } else {
        elements.noTrendData.classList.add('hidden');
        elements.trendChart.classList.remove('hidden');
        drawTrendChart(data.trends);
        if (data.comparisons && data.comparisons.length > 0) {
            elements.trendComparisonSection.classList.remove('hidden');
            elements.trendComparisonContainer.innerHTML = data.comparisons.map(comp => `
                <div class="comparison-item ${comp.improved ? 'improved' : 'regressed'}">
                    <span class="change-icon ${comp.improved ? 'up' : 'down'}">${comp.improved ? '↑' : '↓'}</span>
                    <span class="comparison-text">${comp.rule_name}: ${comp.previous} → ${comp.current}</span>
                    <span class="change-badge ${comp.improved ? 'improved' : 'regressed'}">${comp.improved ? '已修复' : '新问题'}</span>
                </div>
            `).join('');
        } else {
            elements.trendComparisonSection.classList.add('hidden');
        }
    }
    elements.trendResultContent.classList.remove('hidden');
    elements.singleResultContent.classList.add('hidden');
    elements.batchResultContent.classList.add('hidden');
    elements.resultsSection.classList.remove('hidden');
}

function drawTrendChart(trends) {
    const canvas = elements.trendChart;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.fillStyle = '#888';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(100 - i * 20, padding.left - 10, y + 4);
    }
    if (trends.length === 1) {
        const x = padding.left + chartWidth / 2;
        const y = padding.top + chartHeight - (trends[0].score / 100) * chartHeight;
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(trends[0].score + '分', x, y - 15);
        ctx.font = '11px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(trends[0].date_str, x, height - padding.bottom + 20);
    } else {
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const xStep = chartWidth / (trends.length - 1);
        trends.forEach((trend, i) => {
            const x = padding.left + xStep * i;
            const y = padding.top + chartHeight - (trend.score / 100) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        trends.forEach((trend, i) => {
            const x = padding.left + xStep * i;
            const y = padding.top + chartHeight - (trend.score / 100) * chartHeight;
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(0.4, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(trend.score + '分', x, y - 15);
            ctx.font = '11px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText(trend.date_str, x, height - padding.bottom + 20);
        });
    }
    ctx.fillStyle = '#555';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('检测时间', width / 2, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('健康分', 0, 0);
    ctx.restore();
}

function exportReport() {
    let data = state.currentSingleResult;
    if (!data && state.currentDetailUrl && state.batchResults.length > 0) {
        const result = state.batchResults.find(r => r.success && r.result.url === state.currentDetailUrl);
        if (result) data = result.result;
    }
    if (!data) return;
    const format = prompt('请输入导出格式 (json 或 csv):', 'json');
    if (!format) return;
    window.open(`/api/export?url=${encodeURIComponent(data.url)}&format=${format.toLowerCase()}`, '_blank');
}

elements.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
});
elements.analyzeBtn.addEventListener('click', analyzeUrl);
elements.urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') analyzeUrl(); });
elements.addUrlBtn.addEventListener('click', addUrlInput);
elements.batchAnalyzeBtn.addEventListener('click', batchAnalyze);
elements.fileInput.addEventListener('change', handleFileUpload);
elements.trendBtn.addEventListener('click', showTrend);
elements.trendUrlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') showTrend(); });
elements.exportBtn.addEventListener('click', exportReport);
updateRemoveButtons();
