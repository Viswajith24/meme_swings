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
                loadAlerts();
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
        initChat();

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

function initChat() {
    const btn = document.getElementById('analyze-btn');
    const input = document.getElementById('ai-query');
    const output = document.getElementById('ai-output');

    const defaultCoin = state.coins.find(c => c.symbol === 'DOGE') || state.coins[0];
    if (defaultCoin) {
        output.innerHTML = generateResponse(defaultCoin);
    }

    btn.addEventListener('click', () => {
        const query = input.value.trim().toUpperCase();
        output.innerHTML = '<p>Analyzing signal matrix...</p>';
        
        setTimeout(() => {
            const foundCoin = state.coins.find(c => query.includes(c.symbol));
            
            if (foundCoin) {
                output.innerHTML = generateResponse(foundCoin);
            } else {
                output.innerHTML = `
                <p>🔮 <strong>${input.value}</strong> — Signal matrix updated.</p>
                <p>No direct live API tracking data available for this specific query.</p>
                <p>Generic social dimensions indicating a mild uptick in chatter across Telegram alpha groups. Hype algorithms are scanning for broader momentum.</p>
                `;
            }
        }, 800);
    });

    input.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') btn.click();
    });
}

function generateResponse(coin) {
    const isBull = coin.hype_metrics.avg_sentiment > 0.4;
    const sentimentPct = Math.round((coin.hype_metrics.avg_sentiment + 1) / 2 * 100);
    const signalLabel = coin.hype_metrics.signal;
    const hypeScore = coin.hype_metrics.hype_score;

    let sentimentDesc = isBull ? 'bullish' : 'bearish or neutral';
    let activityDesc = signalLabel.includes('Buy') 
        ? 'Early coordinated buying detected. Potential accumulation phase.' 
        : (signalLabel.includes('Sell') ? 'Distribution phase detected. Heavy resistance forming.' : 'Consolidation phase. No viral threat momentum yet.');

    return `
    <p>🤖 <strong>${coin.symbol}</strong> — current price <strong>$${coin.price}</strong> (${coin.change_24h > 0 ? '+' : ''}${coin.change_24h.toFixed(2)}%).</p>
    <p>Social mentions at <strong>${coin.hype_metrics.social_volume_24h.toLocaleString()}</strong> over the last 24 hours. Sentiment sits at <strong>${sentimentPct}% ${sentimentDesc}</strong> based on X, Reddit & Telegram scrapes.</p>
    <p>The algorithmic hype matrix generates a score of <strong>${hypeScore}/100</strong> resulting in a strict AI Verdict of: <strong style="color: ${signalLabel.includes('Buy') ? 'var(--color-green)' : (signalLabel.includes('Sell') ? 'var(--color-red)' : 'var(--color-orange)')}">${signalLabel.toUpperCase()}</strong>.</p>
    <p>${activityDesc}</p>
    `;
}

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

    tickerContent.innerHTML = htmlStr.repeat(6);
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
            <div class="prediction-card signal-${signalClass}" style="animation-delay: ${i * 0.1}s">
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
   ALERTS PAGE
   =============================================== */

async function loadAlerts() {
    const timeline = document.getElementById('alerts-timeline');
    
    try {
        const res = await fetch('/api/alerts');
        const data = await res.json();
        
        // Update mini-stats
        const critical = data.filter(a => a.severity === 'critical').length;
        const high = data.filter(a => a.severity === 'high').length;
        const medLow = data.filter(a => a.severity === 'medium' || a.severity === 'low').length;
        
        document.getElementById('alert-total').textContent = data.length;
        document.getElementById('alert-critical').textContent = critical;
        document.getElementById('alert-high').textContent = high;
        document.getElementById('alert-low').textContent = medLow;
        
        // Render alert cards
        timeline.innerHTML = data.map((alert, i) => {
            const age = Math.floor(Date.now() / 1000) - alert.timestamp;
            let timeStr;
            if (age < 60) timeStr = `${age}s ago`;
            else if (age < 3600) timeStr = `${Math.floor(age / 60)}m ago`;
            else timeStr = `${Math.floor(age / 3600)}h ago`;
            
            return `
            <div class="alert-card alert-${alert.severity}" style="animation-delay: ${i * 0.04}s">
                <div class="alert-icon">${alert.icon}</div>
                <div class="alert-body">
                    <div class="alert-top-row">
                        <span class="alert-coin">${alert.coin}</span>
                        <span class="alert-severity sev-${alert.severity}">${alert.severity}</span>
                    </div>
                    <div class="alert-text">${alert.text}</div>
                </div>
                <div class="alert-right">
                    <span class="alert-time">${timeStr}</span>
                    <button class="btn-ack" onclick="ackAlert(this, '${alert.id}')">ACK</button>
                </div>
            </div>
            `;
        }).join('');
        
        pageLoaded.alerts = true;
        
    } catch (e) {
        console.error('Failed to load alerts:', e);
        timeline.innerHTML = `<div class="loading-state"><p>⚠️ Failed to load alerts. Check backend connection.</p></div>`;
    }
}

function ackAlert(btn, alertId) {
    if (btn.classList.contains('acked')) return;
    btn.classList.add('acked');
    btn.textContent = '✓ ACK';
    // Fade the card slightly
    btn.closest('.alert-card').style.opacity = '0.5';
}
