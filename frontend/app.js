document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    fetchData();
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
        const arrow = isUp ? '▴' : '▾';
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
        const res = await fetch('/api/predictions');
        const data = await res.json();
        
        grid.innerHTML = data.map((coin, i) => {
            const signalLower = coin.signal.toLowerCase().replace(' ', '-');
            const signalClass = coin.signal.includes('Buy') ? 'buy' : (coin.signal.includes('Sell') ? 'sell' : 'hold');
            const changeColor = coin.change_24h >= 0 ? 'text-green' : 'text-red';
            const changePrefix = coin.change_24h >= 0 ? '+' : '';
            const hypeClass = coin.hype_score > 70 ? 'hype-high' : (coin.hype_score > 40 ? 'hype-medium' : 'hype-low');
            
            let mcapStr = '$0';
            if (coin.market_cap > 1000000000) {
                mcapStr = '$' + (coin.market_cap / 1000000000).toFixed(1) + 'B';
            } else if (coin.market_cap > 1000000) {
                mcapStr = '$' + (coin.market_cap / 1000000).toFixed(1) + 'M';
            }
            
            const sentimentPct = Math.round((coin.avg_sentiment + 1) / 2 * 100);
            const trajectoryEmoji = coin.trajectory === 'rising' ? '📈' : (coin.trajectory === 'falling' ? '📉' : '➡️');
            
            return `
            <div class="prediction-card signal-${signalClass}" style="animation-delay: ${i * 0.08}s">
                <div class="pred-header">
                    <div class="pred-coin">
                        <span class="pred-symbol">${coin.symbol}</span>
                        <span class="pred-name">${coin.name}</span>
                    </div>
                    <span class="pred-signal-badge signal-badge-${signalClass}">${coin.signal.toUpperCase()}</span>
                </div>
                
                <div class="pred-price-row">
                    <span class="pred-price">$${coin.price}</span>
                    <span class="pred-change ${changeColor}">${changePrefix}${coin.change_24h.toFixed(2)}% ${trajectoryEmoji}</span>
                </div>
                
                <div class="pred-hype">
                    <div class="pred-hype-label">
                        <span>HYPE SCORE</span>
                        <span class="pred-hype-score ${coin.hype_score > 70 ? 'text-cyan' : (coin.hype_score > 40 ? 'text-orange' : 'text-red')}">${coin.hype_score}/100</span>
                    </div>
                    <div class="hype-bar">
                        <div class="hype-bar-fill ${hypeClass}" style="width: ${coin.hype_score}%"></div>
                    </div>
                </div>
                
                <div class="pred-confidence">
                    <div class="pred-hype-label">
                        <span>AI CONFIDENCE</span>
                        <span class="text-pink">${coin.confidence.toFixed(1)}%</span>
                    </div>
                    <div class="confidence-bar">
                        <div class="confidence-bar-fill" style="width: ${coin.confidence}%"></div>
                    </div>
                </div>
                
                <div class="pred-footer">
                    <div class="pred-footer-item">
                        <span class="pred-footer-label">SOCIAL VOL</span>
                        <span class="pred-footer-value">${coin.social_volume.toLocaleString()}</span>
                    </div>
                    <div class="pred-footer-item">
                        <span class="pred-footer-label">SENTIMENT</span>
                        <span class="pred-footer-value">${sentimentPct}%</span>
                    </div>
                    <div class="pred-footer-item">
                        <span class="pred-footer-label">MARKET CAP</span>
                        <span class="pred-footer-value">${mcapStr}</span>
                    </div>
                    <div class="pred-footer-item">
                        <span class="pred-footer-label">TRAJECTORY</span>
                        <span class="pred-footer-value">${coin.trajectory.toUpperCase()}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        pageLoaded.predictions = true;
        
    } catch (e) {
        console.error('Failed to load predictions:', e);
        grid.innerHTML = `<div class="loading-state"><p>⚠️ Failed to load predictions. Check backend connection.</p></div>`;
    }
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
