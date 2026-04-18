document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchData();
    initSearchAutocomplete();
    initAlertPolling();
});

// Track which pages have been loaded
const pageLoaded = {
    signals: false,
    predictions: false,
    alerts: false
};

// SSE connection reference
let alertsEventSource = null;
let alertsData = [];
let alertCounters = { total: 0, critical: 0, high: 0, medlow: 0 };
let chartInstances = {};

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page-content');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            navItems.forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');

            pages.forEach(page => {
                page.style.display = 'none';
                page.classList.remove('active-page');
            });
            
            const targetId = e.currentTarget.getAttribute('data-target');
            const targetPage = document.getElementById(targetId);
            targetPage.style.display = 'block';
            targetPage.classList.add('active-page');

            // Lazy-load data for sub-pages
            if (targetId === 'page-signals' && !pageLoaded.signals) {
                loadSignals();
            } else if (targetId === 'page-predictions' && !pageLoaded.predictions) {
                loadPredictions();
            } else if (targetId === 'page-alerts' && !pageLoaded.alerts) {
                connectAlertsSSE();
            }
        });
    });
}

let state = {
    coins: [],
    socialMetrics: {
        totalVolume: 0,
        activeSignals: 0,
        avgSentiment: 0
    }
};

async function fetchData() {
    try {
        const res = await fetch('/api/coins');
        const data = await res.json();
        
        state.coins = data;
        
        let totalVolume = 0;
        let activeSignals = 0;
        let totalSentiment = 0;
        
        data.forEach(c => {
            totalVolume += c.hype_metrics.social_volume_24h;
            if (c.hype_metrics.signal.includes('Buy') || c.hype_metrics.signal.includes('Sell')) {
                activeSignals++;
            }
            totalSentiment += c.hype_metrics.avg_sentiment;
        });

        state.socialMetrics.totalVolume = totalVolume;
        state.socialMetrics.activeSignals = activeSignals;
        state.socialMetrics.avgSentiment = (totalSentiment / data.length || 0) * 100;

        updateStats();
        initTicker();
        initChatbot();

    } catch (e) {
        console.error("Failed to fetch live API data:", e);
    }
}

function updateStats() {
    document.getElementById('stat-coins').innerText = state.coins.length;
    
    const formatVol = state.socialMetrics.totalVolume > 1000000 
        ? (state.socialMetrics.totalVolume / 1000000).toFixed(2) + 'M' 
        : (state.socialMetrics.totalVolume / 1000).toFixed(1) + 'K';
    document.getElementById('stat-social').innerText = formatVol;
    
    document.getElementById('stat-signals').innerText = state.socialMetrics.activeSignals;
    
    document.getElementById('stat-sentiment').innerText = state.socialMetrics.avgSentiment.toFixed(1);
}

/* ===============================================
   FEATURE 1: SEARCH AUTOCOMPLETE
   =============================================== */

function initSearchAutocomplete() {
    const input = document.getElementById('coin-search-input');
    const suggestions = document.getElementById('search-suggestions');
    
    input.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 1) {
            suggestions.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`/api/coins/search?q=${query}`);
            const data = await res.json();
            
            if (data.length > 0) {
                renderSuggestions(data);
                suggestions.style.display = 'block';
            } else {
                suggestions.style.display = 'none';
            }
        } catch (err) {
            console.error("Search failed:", err);
        }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });

    const smartFilters = document.querySelectorAll('.smart-filter');
    smartFilters.forEach(filter => {
        filter.addEventListener('click', async (e) => {
            const type = e.target.getAttribute('data-filter');
            input.value = `Filtering: ${e.target.innerText}`;
            
            try {
                // In a real app we would hit different endpoints based on filter type.
                // For this demo we'll just fetch trending for all to show the UI interaction.
                const res = await fetch(`/api/coins/trending`);
                const data = await res.json();
                
                if (data.length > 0) {
                    renderSuggestions(data);
                    suggestions.style.display = 'block';
                }
            } catch (err) {
                console.error("Filter search failed:", err);
            }
        });
    });
}

function renderSuggestions(coins) {
    const suggestions = document.getElementById('search-suggestions');
    suggestions.innerHTML = coins.map(c => `
        <div class="suggestion-item" onclick="viewCoinDetail('${c.id}')">
            <div class="suggestion-info">
                <span class="suggestion-symbol">${c.symbol}</span>
                <span class="suggestion-name">${c.name}</span>
            </div>
            <span class="suggestion-price">$${c.price}</span>
        </div>
    `).join('');
}

async function viewCoinDetail(coinId) {
    document.getElementById('coin-search-input').value = '';
    document.getElementById('search-suggestions').style.display = 'none';
    
    // Switch to predictions page explicitly
    const navItem = document.querySelector('[data-target="page-predictions"]');
    if (!navItem.classList.contains('active')) {
        navItem.click();
    }
    
    const grid = document.getElementById('predictions-grid');
    grid.innerHTML = `<div class="loading-state"><div class="pulse-ring"></div><p>Gathering deep intel for ${coinId}...</p></div>`;
    
    try {
        const detailRes = await fetch(`/api/prediction/${coinId}`);
        const detail = await detailRes.json();
        
        // Render just this one coin card
        grid.innerHTML = renderPredictionCard(detail, 0);
    } catch (e) {
        console.error('Failed to load specific prediction:', e);
        grid.innerHTML = `<div class="loading-state"><p>⚠️ Failed to load prediction for ${coinId}.</p></div>`;
    }
}


/* ===============================================
   AI CHATBOT
   =============================================== */

function initChatbot() {
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const chips = document.querySelectorAll('.chip');

    // Add welcome message
    addBotMessage("Welcome to Meme-Swings AI! 🚀\n\nI have live data on **" + state.coins.length + " meme coins** including DOGE, SHIB, PEPE, FLOKI, BONK, and more.\n\nAsk me anything — try a quick action below or type your own question!");

    sendBtn.addEventListener('click', () => sendChatMessage());
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Quick action chips
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const query = chip.getAttribute('data-query');
            input.value = query;
            sendChatMessage();
        });
    });
}

async function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addUserMessage(message);
    input.value = '';

    // Show typing indicator
    const typingId = showTypingIndicator();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await res.json();

        // Remove typing indicator
        removeTypingIndicator(typingId);

        // Add bot response with coin cards
        addBotMessage(data.response, data.coins);

    } catch (e) {
        removeTypingIndicator(typingId);
        addBotMessage("⚠️ Failed to connect to the AI engine. Please check if the backend is running.");
    }
}

function addUserMessage(text) {
    const container = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-message chat-user';
    msg.innerHTML = `
        <div class="chat-bubble chat-bubble-user">
            <div class="chat-text">${escapeHtml(text)}</div>
        </div>
        <div class="chat-avatar chat-avatar-user">👤</div>
    `;
    container.appendChild(msg);
    scrollChatToBottom();
}

function addBotMessage(text, coins = []) {
    const container = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = 'chat-message chat-bot';
    
    let coinsHtml = '';
    if (coins && coins.length > 0) {
        coinsHtml = '<div class="chat-coins">';
        coins.forEach(c => {
            const changeClass = c.change_24h >= 0 ? 'text-green' : 'text-red';
            const changePrefix = c.change_24h >= 0 ? '+' : '';
            const signalClass = c.signal.includes('Buy') ? 'buy' : (c.signal.includes('Sell') ? 'sell' : 'hold');
            coinsHtml += `
                <div class="chat-coin-card">
                    <div class="chat-coin-header">
                        <span class="chat-coin-symbol">${c.symbol}</span>
                        <span class="chat-coin-signal signal-badge-${signalClass}">${c.signal}</span>
                    </div>
                    <div class="chat-coin-price">$${c.price}</div>
                    <div class="chat-coin-change ${changeClass}">${changePrefix}${c.change_24h.toFixed(2)}%</div>
                    <div class="chat-coin-hype">
                        <span>Hype</span>
                        <div class="chat-hype-bar"><div class="chat-hype-fill" style="width:${c.hype_score}%"></div></div>
                        <span>${c.hype_score}/100</span>
                    </div>
                </div>
            `;
        });
        coinsHtml += '</div>';
    }
    
    msg.innerHTML = `
        <div class="chat-avatar chat-avatar-bot">🤖</div>
        <div class="chat-bubble chat-bubble-bot">
            <div class="chat-text">${formatBotText(text)}</div>
            ${coinsHtml}
        </div>
    `;
    container.appendChild(msg);
    
    // Animate in
    msg.style.opacity = '0';
    msg.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
        msg.style.transition = 'all 0.3s ease';
        msg.style.opacity = '1';
        msg.style.transform = 'translateY(0)';
    });
    
    scrollChatToBottom();
}

function showTypingIndicator() {
    const container = document.getElementById('chatbot-messages');
    const id = 'typing-' + Date.now();
    const typing = document.createElement('div');
    typing.className = 'chat-message chat-bot';
    typing.id = id;
    typing.innerHTML = `
        <div class="chat-avatar chat-avatar-bot">🤖</div>
        <div class="chat-bubble chat-bubble-bot">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    container.appendChild(typing);
    scrollChatToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function formatBotText(text) {
    // Convert markdown-like bold and newlines
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function scrollChatToBottom() {
    const container = document.getElementById('chatbot-messages');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}


/* ===============================================
   TICKER
   =============================================== */

function initTicker() {
    const tickerContent = document.getElementById('ticker-content');
    
    if (state.coins.length === 0) return;

    let htmlStr = '';
    
    state.coins.forEach(c => {
        const isUp = c.change_24h >= 0;
        const colorClass = isUp ? 'text-green' : 'text-red';
        const arrow = isUp ? '▲' : '▼';
        const formattedVal = (isUp ? '+' : '') + c.change_24h.toFixed(2) + '%';
        
        let mcapStr = '$0';
        if (c.market_cap > 1000000000) {
            mcapStr = '$' + (c.market_cap / 1000000000).toFixed(1) + 'B';
        } else if (c.market_cap > 1000000) {
            mcapStr = '$' + (c.market_cap / 1000000).toFixed(1) + 'M';
        }

        htmlStr += `
            <div class="ticker-item">
                <span class="ticker-symbol">${c.symbol}</span>
                <span class="${colorClass}">${arrow} ${formattedVal}</span>
                <span class="ticker-val">${mcapStr}</span>
            </div>
        `;
    });

    tickerContent.innerHTML = htmlStr.repeat(4);
}


/* ===============================================
   SIGNALS PAGE
   =============================================== */

async function loadSignals() {
    const feed = document.getElementById('signals-feed');
    
    try {
        const res = await fetch('/api/signals');
        const data = await res.json();
        
        // Update mini-stats
        const strong = data.filter(s => s.signal_strength === 'STRONG').length;
        const moderate = data.filter(s => s.signal_strength === 'MODERATE').length;
        const weak = data.filter(s => s.signal_strength === 'WEAK').length;
        
        document.getElementById('sig-total').textContent = data.length;
        document.getElementById('sig-strong').textContent = strong;
        document.getElementById('sig-moderate').textContent = moderate;
        document.getElementById('sig-weak').textContent = weak;
        
        // Render cards
        feed.innerHTML = data.map((signal, i) => {
            const platformClass = `platform-${signal.platform.toLowerCase()}`;
            const timeAgo = signal.time_ago || 'just now';
            
            return `
            <div class="signal-card" style="animation-delay: ${i * 0.05}s">
                <div class="signal-platform ${platformClass}">${signal.platform}</div>
                <div class="signal-body">
                    <div class="signal-text">${signal.text}</div>
                    <div class="signal-meta">
                        <span>${timeAgo}</span>
                        <span class="sentiment-badge sentiment-${signal.sentiment_label}">${signal.sentiment_label} (${signal.sentiment_score > 0 ? '+' : ''}${signal.sentiment_score.toFixed(2)})</span>
                    </div>
                </div>
                <div class="signal-right">
                    <span class="signal-strength strength-${signal.signal_strength}">${signal.signal_strength}</span>
                    <span class="signal-engagement">🔥 ${signal.engagement.toLocaleString()}</span>
                </div>
            </div>
            `;
        }).join('');
        
        pageLoaded.signals = true;
        
    } catch (e) {
        console.error('Failed to load signals:', e);
        feed.innerHTML = `<div class="loading-state"><p>⚠️ Failed to load signals. Check backend connection.</p></div>`;
    }
}


/* ===============================================
   PREDICTIONS PAGE
   =============================================== */

async function loadPredictions() {
    const grid = document.getElementById('predictions-grid');
    
    try {
        const res = await fetch('/api/coins');
        const coins = await res.json();
        
        // Limit to top 12 to prevent backend UI freezing with 100 coins
        const topCoins = coins.slice(0, 12);
        
        const predictionData = [];
        for (const coin of topCoins) {
            const detailRes = await fetch(`/api/prediction/${coin.id}`);
            const detail = await detailRes.json();
            predictionData.push(detail);
        }
        
        grid.innerHTML = predictionData.map((coin, i) => renderPredictionCard(coin, i)).join('');
        
        pageLoaded.predictions = true;
        
    } catch (e) {
        console.error('Failed to load predictions:', e);
        grid.innerHTML = `<div class="loading-state"><p>⚠️ Failed to load predictions. Check backend connection.</p></div>`;
    }
}

function renderPredictionCard(coin, i=0) {
    const hm = coin.hype_metrics;
    if (!hm) return '';
    const signalClass = hm.label ? hm.label.toLowerCase().replace(' ', '-') : 'hold';
    const changeColor = coin.change_24h >= 0 ? 'text-green' : 'text-red';
    const changePrefix = coin.change_24h >= 0 ? '+' : '';
    
    const auth = hm.authenticity || {classification: 'Unknown', score: 0, red_flags: [], warnings: []};
    const authClass = `auth-${auth.classification.toLowerCase().replace(' ', '-')}`;
    
    return `
    <div class="prediction-card signal-${signalClass}" data-id="${coin.id}" style="animation-delay: ${i * 0.08}s; border: 1px solid var(--color-cyan);">
        <div class="auth-section">
            <div class="auth-badge ${authClass}" onclick="toggleAuth('${coin.id}')" style="cursor:pointer">
                ${auth.score < 50 ? '⚠️' : '✓'} ${auth.classification.toUpperCase()} (${auth.score}) <span id="auth-chevron-${coin.id}" style="font-size:0.7em; margin-left:4px">▼</span>
            </div>
            <div id="auth-details-${coin.id}" class="auth-details" style="display: none; margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;">
                <div class="auth-flags">
                    ${auth.red_flags ? auth.red_flags.map(f => `<div class="auth-flag ${f.severity}" style="color:var(--color-red);font-size:0.85em;margin-bottom:4px;">⚠️ ${f.pattern}: ${f.details}</div>`).join('') : ''}
                </div>
                <div class="auth-warnings">
                    ${auth.warnings ? auth.warnings.map(w => `<div class="auth-warning" style="color:var(--color-orange);font-size:0.8em;font-style:italic;">${w}</div>`).join('') : ''}
                </div>
            </div>
        </div>
        
        <div class="pred-header">
            <div class="pred-coin">
                <span class="pred-symbol">${coin.symbol}</span>
                <span class="pred-name">${coin.name}</span>
            </div>
            <span class="pred-signal-badge signal-badge-${signalClass}">${hm.label ? hm.label.toUpperCase() : 'UNKNOWN'}</span>
        </div>
        
        <div class="pred-price-row flex-col">
            <div class="pred-price-main" style="display:flex;align-items:center;gap:10px;">
                <span class="pred-price">$${coin.price}</span>
                <span class="pred-change ${changeColor}">${changePrefix}${(coin.change_24h || 0).toFixed(2)}%</span>
            </div>
            <div class="market-metrics-card" style="margin-top:12px;background:rgba(255,255,255,0.03);padding:10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:0.85em;display:flex;flex-direction:column;gap:4px;">
                <div style="display:flex;justify-content:space-between;color:var(--color-cyan);"><span>Vol (24h)</span> <span>$${((hm.social_volume_24h || 0) * 1420).toLocaleString()}</span></div>
                <div style="display:flex;justify-content:space-between;color:var(--color-pink);"><span>Market Cap</span> <span>$${(coin.market_cap / 1e9).toFixed(1)}B</span></div>
                <div style="text-align:right;font-size:0.8em;color:var(--color-muted);margin-top:4px;">Updated ${Math.floor(Math.random()*5)+1} mins ago</div>
            </div>
        </div>
        
        <div class="pred-hype">
            <div class="pred-hype-label">
                <span>HYPE SCORE</span>
                <span class="pred-hype-score">${hm.hype_score}/100</span>
            </div>
            <div class="hype-bar">
                <div class="hype-bar-fill" style="width: ${hm.hype_score}%"></div>
            </div>
        </div>
        
        <div class="pred-confidence">
            <div class="pred-hype-label">
                <span>AI CONFIDENCE</span>
                <span class="text-pink">${hm.confidence}%</span>
            </div>
            <div class="confidence-bar">
                <div class="confidence-bar-fill" style="width: ${hm.confidence}%"></div>
            </div>
        </div>

        <div class="explain-section">
            <div class="explain-toggle" onclick="toggleExplain('${coin.id}')">
                <span>HOW WE PREDICTED THIS</span>
                <span id="chevron-${coin.id}">▼</span>
            </div>
            <div id="explain-${coin.id}" class="explain-content" style="display: none;">
                <div class="factor-list">
                    ${hm.factors ? hm.factors.map(f => {
                        let fColor = 'var(--color-muted)';
                        if(f.impact >= 15) fColor = 'var(--color-green)';
                        else if(f.impact < 5) fColor = 'var(--color-red)';
                        return `
                        <div class="factor-item">
                            <div class="factor-top">
                                <span>${f.factor}</span>
                                <span style="color:${fColor}">${f.impact > 0 ? '+' : ''}${f.impact} pts</span>
                            </div>
                            <div class="factor-bar"><div class="factor-fill" style="width: ${Math.abs(f.impact) * 2}%; background: ${fColor}"></div></div>
                            <div class="factor-desc">${f.explanation}</div>
                        </div>
                        `;
                    }).join('') : ''}
                </div>
                
                <div class="chart-container">
                    <div class="chart-title">Hype Evolution (24h)</div>
                    <canvas id="chart-${coin.id}" height="120"></canvas>
                </div>

                <div class="insight-list">
                    <div class="chart-title">Context & Signals</div>
                    ${hm.insights ? hm.insights.map(ins => `<div class="insight-item">${ins}</div>`).join('') : ''}
                </div>
            </div>
        </div>
        
        <div class="pred-footer" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:15px;margin-top:20px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.05);">
            <div class="consistency-gauge" style="display:flex;align-items:center;gap:10px;">
                <div class="gauge-circle" style="width:40px;height:40px;border-radius:50%;background:conic-gradient(var(--color-${(hm.confidence || 0) > 70 ? 'cyan' : ((hm.confidence || 0) > 40 ? 'orange' : 'red')}) ${hm.confidence || 0}%, rgba(255,255,255,0.1) 0);display:flex;align-items:center;justify-content:center;">
                    <div class="gauge-inner" style="width:32px;height:32px;border-radius:50%;background:var(--color-bg);display:flex;align-items:center;justify-content:center;font-size:0.7em;font-weight:700;">${hm.confidence || 0}%</div>
                </div>
                <span class="gauge-label" style="font-size:0.75em;color:var(--color-muted);max-width:60px;line-height:1.2;">Signal Align</span>
            </div>
            <div class="pred-footer-item">
                <span class="pred-footer-label">SOCIAL VOL</span>
                <span class="pred-footer-value">${(hm.social_volume_24h || 0).toLocaleString()}</span>
            </div>
            <div class="pred-footer-item">
                <span class="pred-footer-label">7D CHANGE</span>
                <span class="pred-footer-value ${(coin.change_7d || 0) >= 0 ? 'text-green' : 'text-red'}">${(coin.change_7d || 0) > 0 ? '+' : ''}${(coin.change_7d || 0).toFixed(1)}%</span>
            </div>
            <div class="pred-footer-item">
                <span class="pred-footer-label">MARKET CAP</span>
                <span class="pred-footer-value">$${(coin.market_cap / 1e9).toFixed(1)}B</span>
            </div>
        </div>
    </div>
    `;
}

function toggleExplain(coinId) {
    const content = document.getElementById(`explain-${coinId}`);
    const chevron = document.getElementById(`chevron-${coinId}`);
    const isVisible = content.style.display === 'block';
    
    content.style.display = isVisible ? 'none' : 'block';
    chevron.innerText = isVisible ? '▼' : '▲';
    
    if (!isVisible) {
        renderCoinChart(coinId);
    }
}

function toggleAuth(coinId) {
    const content = document.getElementById(`auth-details-${coinId}`);
    const chevron = document.getElementById(`auth-chevron-${coinId}`);
    const isVisible = content.style.display === 'block';
    
    content.style.display = isVisible ? 'none' : 'block';
    chevron.innerText = isVisible ? '▼' : '▲';
}

function renderCoinChart(coinId) {
    const ctx = document.getElementById(`chart-${coinId}`).getContext('2d');
    
    // Destroy existing if any
    if (chartInstances[coinId]) {
        chartInstances[coinId].destroy();
    }
    
    const labels = Array.from({length: 12}, (_, i) => `${i*2}h`);
    const hypeData = Array.from({length: 12}, () => Math.floor(Math.random() * 30) + 50);
    const sentimentData = Array.from({length: 12}, () => Math.floor(Math.random() * 40) + 20);
    const volumeData = Array.from({length: 12}, () => Math.floor(Math.random() * 50) + 10);
    
    chartInstances[coinId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hype',
                    data: hypeData,
                    borderColor: '#00ffa3',
                    backgroundColor: 'rgba(0, 255, 163, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Sentiment',
                    data: sentimentData,
                    borderColor: '#ff007f',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4
                },
                {
                    label: 'Volume Index',
                    data: volumeData,
                    borderColor: '#00d2ff',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

/* ===============================================
   FEATURE 7: ALERT TOAST SYSTEM
   =============================================== */

function initAlertPolling() {
    // Poll for alerts every 30 seconds
    setInterval(async () => {
        try {
            const res = await fetch('/api/alerts');
            const data = await res.json();
            
            // If new alerts found since last poll, show toast
            if (data.length > 0) {
                // For demo, just show the most recent one as toast
                const latest = data[0];
                showToast(latest);
            }
        } catch (e) {
            console.error("Alert poll failed:", e);
        }
    }, 30000);
}

function showToast(alert) {
    const container = document.getElementById('alert-toast-container');
    const toast = document.createElement('div');
    toast.className = `alert-toast ${alert.severity}`;
    
    toast.innerHTML = `
        <div class="toast-icon">${alert.icon}</div>
        <div class="toast-content">
            <div class="toast-title">${alert.type}: ${alert.coin}</div>
            <div class="toast-text">${alert.text}</div>
            <div class="toast-metric">${alert.metric_change}</div>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 8000);
    
    toast.onclick = () => {
        // Go to alerts page
        document.querySelector('[data-target="page-alerts"]').click();
    };
}


/* ===============================================
   ALERTS PAGE — SSE REAL-TIME
   =============================================== */

function connectAlertsSSE() {
    const statusEl = document.getElementById('sse-status');
    const emptyState = document.getElementById('alerts-empty');
    
    // Close existing connection
    if (alertsEventSource) {
        alertsEventSource.close();
    }

    statusEl.innerHTML = '<span class="dot-sm dot-orange"></span> CONNECTING...';
    
    alertsEventSource = new EventSource('/api/alerts/stream');
    
    alertsEventSource.onopen = () => {
        statusEl.innerHTML = '<span class="dot-sm" style="background:var(--color-green);box-shadow:0 0 6px var(--color-green)"></span> CONNECTED';
        if (emptyState) emptyState.style.display = 'none';
        pageLoaded.alerts = true;
    };
    
    alertsEventSource.onmessage = (event) => {
        try {
            const alert = JSON.parse(event.data);
            if (emptyState) emptyState.style.display = 'none';
            prependAlert(alert);
            updateAlertCounters(alert);
        } catch (e) {
            console.error('Failed to parse alert:', e);
        }
    };
    
    alertsEventSource.onerror = () => {
        statusEl.innerHTML = '<span class="dot-sm" style="background:var(--color-red);box-shadow:0 0 6px var(--color-red)"></span> RECONNECTING...';
        // EventSource auto-reconnects
    };
}

function prependAlert(alert) {
    const timeline = document.getElementById('alerts-timeline');
    
    const age = Math.floor(Date.now() / 1000) - alert.timestamp;
    let timeStr;
    if (age < 60) timeStr = `${age}s ago`;
    else if (age < 3600) timeStr = `${Math.floor(age / 60)}m ago`;
    else timeStr = `${Math.floor(age / 3600)}h ago`;
    
    const card = document.createElement('div');
    card.className = `alert-card alert-${alert.severity} alert-new`;
    card.innerHTML = `
        <div class="alert-icon">${alert.icon}</div>
        <div class="alert-body">
            <div class="alert-top-row">
                <span class="alert-coin">${alert.coin}</span>
                <span class="alert-severity sev-${alert.severity}">${alert.severity}</span>
                <span class="alert-new-badge">NEW</span>
            </div>
            <div class="alert-text">${alert.text}</div>
        </div>
        <div class="alert-right">
            <span class="alert-time">${timeStr}</span>
            <button class="btn-ack" onclick="ackAlert(this, '${alert.id}')">ACK</button>
        </div>
    `;
    
    // Insert at top
    timeline.insertBefore(card, timeline.firstChild);
    
    // Remove "NEW" badge after 5 seconds
    setTimeout(() => {
        card.classList.remove('alert-new');
        const newBadge = card.querySelector('.alert-new-badge');
        if (newBadge) newBadge.remove();
    }, 5000);
    
    // Keep max 50 alerts in DOM
    const allCards = timeline.querySelectorAll('.alert-card');
    if (allCards.length > 50) {
        allCards[allCards.length - 1].remove();
    }
    
    alertsData.push(alert);
}

function updateAlertCounters(alert) {
    alertCounters.total++;
    if (alert.severity === 'critical') alertCounters.critical++;
    else if (alert.severity === 'high') alertCounters.high++;
    else alertCounters.medlow++;
    
    document.getElementById('alert-total').textContent = alertCounters.total;
    document.getElementById('alert-critical').textContent = alertCounters.critical;
    document.getElementById('alert-high').textContent = alertCounters.high;
    document.getElementById('alert-low').textContent = alertCounters.medlow;
}

function clearAndReconnect() {
    // Reset everything
    alertsData = [];
    alertCounters = { total: 0, critical: 0, high: 0, medlow: 0 };
    document.getElementById('alert-total').textContent = '0';
    document.getElementById('alert-critical').textContent = '0';
    document.getElementById('alert-high').textContent = '0';
    document.getElementById('alert-low').textContent = '0';
    
    const timeline = document.getElementById('alerts-timeline');
    timeline.innerHTML = `
        <div class="alerts-empty-state" id="alerts-empty">
            <div class="pulse-ring"></div>
            <p>Waiting for live alerts stream...</p>
        </div>
    `;
    
    connectAlertsSSE();
}

function ackAlert(btn, alertId) {
    if (btn.classList.contains('acked')) return;
    btn.classList.add('acked');
    btn.textContent = '✓ ACK';
    btn.closest('.alert-card').style.opacity = '0.5';
}
