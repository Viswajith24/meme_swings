from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from services.crypto_api import get_top_meme_coins
from services.social_simulator import generate_social_feed
from services.prediction import calculate_predictions
import uvicorn
import os
import random
import time

app = FastAPI(title="Meme-Swings API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

@app.get("/api/coins")
def get_coins():
    coins = get_top_meme_coins()
    predictions = calculate_predictions(coins)
    return predictions

@app.get("/api/social-feed")
def get_social_feed():
    return generate_social_feed()

@app.get("/api/signals")
def get_signals():
    """Returns enriched social signals with strength indicators."""
    feed = generate_social_feed(count=12)
    for post in feed:
        # Add signal strength based on engagement + sentiment
        engagement = post.get("engagement", 0)
        sentiment = abs(post.get("sentiment_score", 0))
        if engagement > 3000 and sentiment > 0.6:
            post["signal_strength"] = "STRONG"
        elif engagement > 1500 or sentiment > 0.5:
            post["signal_strength"] = "MODERATE"
        else:
            post["signal_strength"] = "WEAK"
        # Add time-ago string
        age = int(time.time()) - post.get("timestamp", int(time.time()))
        if age < 60:
            post["time_ago"] = f"{age}s ago"
        else:
            post["time_ago"] = f"{age // 60}m ago"
    return feed

@app.get("/api/predictions")
def get_predictions():
    """Returns per-coin prediction cards."""
    coins = get_top_meme_coins()
    predictions = calculate_predictions(coins)
    result = []
    for coin in predictions:
        hm = coin.get("hype_metrics", {})
        # Build a 24h price trajectory (simulated from sparkline)
        sparkline = coin.get("sparkline", [])
        trajectory = "rising" if coin.get("change_24h", 0) > 2 else ("falling" if coin.get("change_24h", 0) < -2 else "sideways")
        result.append({
            "symbol": coin["symbol"],
            "name": coin.get("name", coin["symbol"]),
            "price": coin.get("price", 0),
            "change_24h": coin.get("change_24h", 0),
            "market_cap": coin.get("market_cap", 0),
            "hype_score": hm.get("hype_score", 50),
            "signal": hm.get("signal", "Hold"),
            "confidence": hm.get("confidence", 50),
            "social_volume": hm.get("social_volume_24h", 0),
            "avg_sentiment": hm.get("avg_sentiment", 0),
            "trajectory": trajectory,
            "sparkline": sparkline[-20:] if len(sparkline) > 20 else sparkline,
        })
    return result

@app.get("/api/alerts")
def get_alerts():
    """Returns simulated alert events."""
    coins = get_top_meme_coins()
    predictions = calculate_predictions(coins)
    
    alert_types = [
        {"type": "whale_move", "icon": "🐋", "severity": "high", "template": "Whale wallet detected moving {amount} of {symbol}. Possible {action} incoming."},
        {"type": "sentiment_spike", "icon": "📈", "severity": "medium", "template": "Sentiment for {symbol} spiked {pct}% in the last hour across {platform}."},
        {"type": "volume_surge", "icon": "🔊", "severity": "high", "template": "{symbol} social volume surged to {volume} mentions. Unusual activity detected."},
        {"type": "price_alert", "icon": "💰", "severity": "critical", "template": "{symbol} moved {change}% in 24h. {direction} momentum confirmed by hype matrix."},
        {"type": "liquidity_warning", "icon": "⚠️", "severity": "low", "template": "DEX liquidity for {symbol} pool shifted. Monitor for potential rug vectors."},
        {"type": "trend_reversal", "icon": "🔄", "severity": "medium", "template": "{symbol} showing early signs of trend reversal. Sentiment divergence detected on {platform}."},
    ]
    
    alerts = []
    platforms = ["Twitter/X", "Reddit", "Telegram", "Discord"]
    
    for coin in predictions:
        # Generate 1-2 alerts per coin
        num_alerts = random.randint(1, 2)
        for _ in range(num_alerts):
            template_data = random.choice(alert_types)
            change = coin.get("change_24h", 0)
            text = template_data["template"].format(
                symbol=coin["symbol"],
                amount=f"${random.randint(50, 500)}K",
                action="accumulation" if change > 0 else "distribution",
                pct=random.randint(15, 85),
                platform=random.choice(platforms),
                volume=f"{random.randint(5, 50)}K",
                change=f"{abs(change):.1f}",
                direction="Bullish" if change > 0 else "Bearish",
            )
            alerts.append({
                "id": f"alert-{random.randint(1000, 9999)}",
                "coin": coin["symbol"],
                "type": template_data["type"],
                "icon": template_data["icon"],
                "severity": template_data["severity"],
                "text": text,
                "timestamp": int(time.time()) - random.randint(30, 3600),
                "acknowledged": False,
            })
    
    alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    return alerts

# Mount the frontend directory to serve static files
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
