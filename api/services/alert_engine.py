import time
import random
from services.crypto_api import get_top_meme_coins

# Simulated historical baselines
_baselines = {}

def get_latest_alerts():
    """
    Analyzes current metrics vs baselines to trigger dynamic alerts.
    """
    coins = get_top_meme_coins()
    alerts = []
    
    for coin in coins:
        symbol = coin["symbol"]
        if symbol not in _baselines:
            # Initialize baseline
            _baselines[symbol] = {
                "avg_vol": coin["volume_24h"],
                "last_price": coin["price"],
                "last_sentiment": random.uniform(0.2, 0.6)
            }
            continue
            
        baseline = _baselines[symbol]
        
        # 1. Price Anomaly
        price_change = abs(coin["price"] - baseline["last_price"]) / baseline["last_price"] if baseline["last_price"] != 0 else 0
        if price_change > 0.15: # 15% flash move
            alerts.append({
                "id": f"alert-{int(time.time())}-{symbol}-price",
                "coin": symbol,
                "type": "Price Breakout" if coin["price"] > baseline["last_price"] else "Flash Crash",
                "severity": "critical",
                "metric_change": f"{'+' if coin['price'] > baseline['last_price'] else '-'}{price_change*100:.1f}%",
                "text": f"Sudden {price_change*100:.1f}% price movement detected for {symbol}.",
                "timestamp": int(time.time()),
                "icon": "💰"
            })
            
        # 2. Volume Anomaly
        vol_change = coin["volume_24h"] / baseline["avg_vol"] if baseline["avg_vol"] != 0 else 1
        if vol_change > 3.0: # 3x baseline
            alerts.append({
                "id": f"alert-{int(time.time())}-{symbol}-vol",
                "coin": symbol,
                "type": "Volume Surge",
                "severity": "high",
                "metric_change": f"{vol_change:.1f}x baseline",
                "text": f"Significant volume surge ({vol_change:.1f}x) detected for {symbol}.",
                "timestamp": int(time.time()),
                "icon": "🔊"
            })
            
        # 3. Sentiment Shift (Simulated)
        current_sentiment = random.uniform(-1.0, 1.0)
        sent_diff = abs(current_sentiment - baseline["last_sentiment"])
        if sent_diff > 0.6:
            alerts.append({
                "id": f"alert-{int(time.time())}-{symbol}-sent",
                "coin": symbol,
                "type": "Sentiment Shift",
                "severity": "pink" if current_sentiment > baseline["last_sentiment"] else "red",
                "metric_change": f"{'+' if current_sentiment > baseline['last_sentiment'] else '-'}{sent_diff*100:.0f} pts",
                "text": f"Sharp shift in {symbol} sentiment detected across social channels.",
                "timestamp": int(time.time()),
                "icon": "📈" if current_sentiment > baseline.get("last_sentiment", 0) else "📉"
            })
            
        # Update baseline (damped)
        baseline["last_price"] = coin["price"]
        baseline["avg_vol"] = (baseline["avg_vol"] * 0.9) + (coin["volume_24h"] * 0.1)
        baseline["last_sentiment"] = (baseline["last_sentiment"] * 0.8) + (current_sentiment * 0.2)
        
    # Sort by timestamp
    alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    return alerts[:10]
