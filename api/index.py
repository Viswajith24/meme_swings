from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from services.crypto_api import get_top_meme_coins
from services.social_simulator import generate_social_feed
from services.prediction import calculate_predictions
from services.rag_insights import get_rag_insights
from services.security import calculate_authenticity
from services.alert_engine import get_latest_alerts
import uvicorn
import os
import random
import time
import asyncio
import json

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
    print("--- [FETCHING ENRICHED COINS] ---")
    coins = get_top_meme_coins()
    enriched = calculate_predictions(coins)
    print(f"Enriched count: {len(enriched)}, First coin has hype: {'hype_metrics' in enriched[0] if enriched else 'N/A'}")
    return enriched

@app.get("/api/market/{coin_id}")
def get_market(coin_id: str):
    """Returns detailed market metrics for a specific coin."""
    from services.crypto_api import get_coin_market_data
    data = get_coin_market_data(coin_id)
    if not data:
        return {"error": "Coin not found"}, 404
    return data

@app.get("/api/coins/trending")
def get_trending():
    """Returns coins with high social momentum spikes."""
    coins = get_top_meme_coins()
    predictions = calculate_predictions(coins)
    # Trending = high 24h change + high hype
    trending = sorted(predictions, key=lambda c: (c["change_24h"] * 0.5 + c["hype_metrics"]["hype_score"] * 0.5), reverse=True)
    return trending[:5]

@app.get("/api/coins/search")
def search_coins(q: str):
    """Search tracked coins by name or symbol."""
    coins = get_top_meme_coins()
    q = q.lower()
    results = [c for c in coins if q in c["name"].lower() or q in c["symbol"].lower()]
    return results[:5]

@app.get("/api/social-feed")
def get_social_feed():
    return generate_social_feed()

@app.get("/api/signals")
def get_signals():
    """Returns enriched social signals with strength indicators."""
    feed = generate_social_feed(count=50)
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

@app.get("/api/prediction/{coin_id}")
def get_detailed_prediction(coin_id: str):
    """Enhanced prediction endpoint with explainability and security checks."""
    from services.crypto_api import get_coin_market_data
    coin = get_coin_market_data(coin_id)
    if not coin:
        return {"error": "Coin not found"}, 404
        
    predictions = calculate_predictions([coin])
    prediction = predictions[0]
    
    # 1. Get Pseudo-RAG Insights
    insights = get_rag_insights(coin["id"])
    
    # 2. Get Security/Authenticity Score
    # For simulation, we generate a larger feed of signals to analyze
    mock_signals = generate_social_feed(count=50)
    authenticity = calculate_authenticity(coin["id"], mock_signals)
    
    prediction["hype_metrics"]["insights"] = insights
    prediction["hype_metrics"]["authenticity"] = authenticity
    
    return prediction

@app.get("/api/security/authenticity/{coin_id}")
def get_security_check(coin_id: str):
    """Detailed adversarial hype analysis."""
    mock_signals = generate_social_feed(count=50)
    result = calculate_authenticity(coin_id, mock_signals)
    return result

@app.get("/api/alerts")
def get_alerts_endpoint():
    """Dynamic alert stream."""
    return get_latest_alerts()

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
    return _generate_alerts(predictions)

def _generate_alerts(predictions, max_per_coin=2):
    """Shared alert generation logic."""
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
        num_alerts = random.randint(1, max_per_coin)
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
                "timestamp": int(time.time()) - random.randint(0, 60),
                "acknowledged": False,
            })
    
    alerts.sort(key=lambda x: x["timestamp"], reverse=True)
    return alerts


# ==============================
# SSE: Real-time Alerts Stream
# ==============================

@app.get("/api/alerts/stream")
async def alerts_stream():
    """Server-Sent Events endpoint that pushes new alerts every 5 seconds."""
    async def event_generator():
        while True:
            coins = get_top_meme_coins()
            # Pick 2-4 random coins for this batch of alerts
            sample_size = min(random.randint(2, 4), len(coins))
            sampled = random.sample(coins, sample_size)
            predictions = calculate_predictions(sampled)
            alerts = _generate_alerts(predictions, max_per_coin=1)
            
            # Send each alert as a separate SSE event
            for alert in alerts[:3]:  # Max 3 alerts per push
                data = json.dumps(alert)
                yield f"data: {data}\n\n"
            
            await asyncio.sleep(5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ==============================
# AI Chat Endpoint
# ==============================

class ChatMessage(BaseModel):
    message: str

@app.post("/api/chat")
def chat_endpoint(msg: ChatMessage):
    """AI chatbot that returns analysis using live coin data."""
    query = msg.message.strip().upper()
    coins = get_top_meme_coins()
    predictions = calculate_predictions(coins)
    
    # Try to find mentioned coins
    matched_coins = []
    for coin in predictions:
        if coin["symbol"] in query or coin["name"].upper() in query:
            matched_coins.append(coin)
    
    # Handle special queries
    query_lower = msg.message.strip().lower()
    
    if any(kw in query_lower for kw in ["top gainer", "best", "moon", "pump", "bullish", "buy"]):
        # Find top gainers
        sorted_coins = sorted(predictions, key=lambda c: c.get("change_24h", 0), reverse=True)
        top3 = sorted_coins[:3]
        response_text = "🚀 **TOP GAINERS RIGHT NOW**\n\n"
        coin_cards = []
        for c in top3:
            hm = c.get("hype_metrics", {})
            response_text += f"**{c['symbol']}** — ${c['price']} ({'+' if c['change_24h'] > 0 else ''}{c['change_24h']:.2f}%) | Hype: {hm.get('hype_score', 0)}/100 | Signal: {hm.get('signal', 'Hold')}\n"
            coin_cards.append({
                "symbol": c["symbol"],
                "name": c.get("name", ""),
                "price": c["price"],
                "change_24h": c.get("change_24h", 0),
                "hype_score": hm.get("hype_score", 50),
                "signal": hm.get("signal", "Hold"),
                "confidence": hm.get("confidence", 50),
            })
        response_text += "\n💡 These coins are showing the strongest upward momentum based on our social hype matrix analysis."
        return {"response": response_text, "coins": coin_cards, "type": "top_gainers"}
    
    if any(kw in query_lower for kw in ["worst", "dump", "sell", "bearish", "loser", "red"]):
        sorted_coins = sorted(predictions, key=lambda c: c.get("change_24h", 0))
        bottom3 = sorted_coins[:3]
        response_text = "📉 **BIGGEST LOSERS RIGHT NOW**\n\n"
        coin_cards = []
        for c in bottom3:
            hm = c.get("hype_metrics", {})
            response_text += f"**{c['symbol']}** — ${c['price']} ({'+' if c['change_24h'] > 0 else ''}{c['change_24h']:.2f}%) | Hype: {hm.get('hype_score', 0)}/100 | Signal: {hm.get('signal', 'Hold')}\n"
            coin_cards.append({
                "symbol": c["symbol"],
                "name": c.get("name", ""),
                "price": c["price"],
                "change_24h": c.get("change_24h", 0),
                "hype_score": hm.get("hype_score", 50),
                "signal": hm.get("signal", "Hold"),
                "confidence": hm.get("confidence", 50),
            })
        response_text += "\n⚠️ Exercise caution — negative sentiment and declining volume detected across social channels."
        return {"response": response_text, "coins": coin_cards, "type": "top_losers"}

    if any(kw in query_lower for kw in ["overview", "market", "summary", "all", "how's"]):
        avg_change = sum(c.get("change_24h", 0) for c in predictions) / len(predictions) if predictions else 0
        bullish_count = sum(1 for c in predictions if c.get("hype_metrics", {}).get("signal", "").startswith("Buy") or c.get("hype_metrics", {}).get("signal", "") == "Strong Buy")
        bearish_count = sum(1 for c in predictions if c.get("hype_metrics", {}).get("signal", "").startswith("Sell") or c.get("hype_metrics", {}).get("signal", "") == "Strong Sell")
        
        mood = "🟢 BULLISH" if avg_change > 2 else ("🔴 BEARISH" if avg_change < -2 else "🟡 NEUTRAL")
        response_text = f"📊 **MEME COIN MARKET OVERVIEW**\n\n"
        response_text += f"Market Mood: **{mood}**\n"
        response_text += f"Coins Tracked: **{len(predictions)}**\n"
        response_text += f"Average 24h Change: **{avg_change:+.2f}%**\n"
        response_text += f"Bullish Signals: **{bullish_count}** | Bearish: **{bearish_count}** | Hold: **{len(predictions) - bullish_count - bearish_count}**\n"
        response_text += f"\n🔍 The social hype matrix is actively scanning {len(predictions)} meme coins across Twitter/X, Reddit, and Telegram."
        return {"response": response_text, "coins": [], "type": "overview"}
    
    # Specific coin analysis
    if matched_coins:
        coin = matched_coins[0]
        hm = coin.get("hype_metrics", {})
        sentiment_pct = round((hm.get("avg_sentiment", 0) + 1) / 2 * 100)
        is_bull = hm.get("avg_sentiment", 0) > 0.4
        signal = hm.get("signal", "Hold")
        
        signal_color = "🟢" if "Buy" in signal else ("🔴" if "Sell" in signal else "🟡")
        
        response_text = f"🤖 **{coin['symbol']} — DEEP ANALYSIS**\n\n"
        response_text += f"💰 Price: **${coin['price']}** ({'+' if coin['change_24h'] > 0 else ''}{coin['change_24h']:.2f}%)\n"
        response_text += f"📊 Market Cap: **${coin.get('market_cap', 0) / 1e9:.2f}B**\n"
        response_text += f"🔥 Hype Score: **{hm.get('hype_score', 0)}/100**\n"
        response_text += f"💬 Social Volume (24h): **{hm.get('social_volume_24h', 0):,}** mentions\n"
        response_text += f"😊 Sentiment: **{sentiment_pct}% {'bullish' if is_bull else 'bearish/neutral'}**\n"
        response_text += f"{signal_color} AI Signal: **{signal.upper()}** (Confidence: {hm.get('confidence', 0):.1f}%)\n"
        
        if "Buy" in signal:
            response_text += "\n🚀 Social channels are heating up. Early accumulation patterns detected across whale wallets. Monitor for breakout confirmation."
        elif "Sell" in signal:
            response_text += "\n⚠️ Distribution phase detected. Heavy sell-side pressure forming across DEX liquidity pools. Consider risk management."
        else:
            response_text += "\n➡️ Consolidation phase. No clear directional momentum yet. The hype matrix is monitoring for catalysts."
        
        coin_card = [{
            "symbol": coin["symbol"],
            "name": coin.get("name", ""),
            "price": coin["price"],
            "change_24h": coin.get("change_24h", 0),
            "hype_score": hm.get("hype_score", 50),
            "signal": hm.get("signal", "Hold"),
            "confidence": hm.get("confidence", 50),
        }]
        return {"response": response_text, "coins": coin_card, "type": "analysis"}
    
    # Generic fallback
    # Pick a random trending coin to mention
    trending = random.choice(predictions) if predictions else None
    response_text = f"🔮 Interesting query! I'm scanning our social intelligence matrix for insights.\n\n"
    if trending:
        hm = trending.get("hype_metrics", {})
        response_text += f"Meanwhile, here's what's trending: **{trending['symbol']}** is showing a hype score of **{hm.get('hype_score', 0)}/100** with **{'+' if trending['change_24h'] > 0 else ''}{trending['change_24h']:.2f}%** movement.\n\n"
    response_text += "💡 Try asking about specific coins (e.g. 'analyze DOGE'), market overview, or top gainers!"
    return {"response": response_text, "coins": [], "type": "generic"}


# Serve static files locally (fallback for non-Vercel environments)
if not os.environ.get("VERCEL"):
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
    if os.path.exists(frontend_dir):
        app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
        @app.get("/")
        def serve_index():
            return FileResponse(os.path.join(frontend_dir, "index.html"))

# Frontend serving is handled by Vercel rewrites in vercel.json
# @app.get("/")
# def serve_index():
#     return FileResponse(os.path.join(frontend_dir, "index.html"))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

