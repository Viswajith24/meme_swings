import requests
import time

# Cache to avoid hammering the CoinGecko API during rapid frontend polling
_cache = {
    "data": None,
    "last_updated": 0
}

CACHE_TTL = 30 # seconds

def get_top_meme_coins():
    global _cache
    now = time.time()
    
    if _cache["data"] and (now - _cache["last_updated"]) < CACHE_TTL:
        return _cache["data"]
        
    # Top meme coins: DOGE, SHIB, PEPE, WIF, BONK
    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        "vs_currency": "usd",
        "ids": "dogecoin,shiba-inu,pepe,dogwifcoin,bonk",
        "order": "market_cap_desc",
        "per_page": 5,
        "page": 1,
        "sparkline": "true"
    }
    
    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Format the response to be cleaner for our frontend
        formatted_data = []
        for coin in data:
            formatted_data.append({
                "id": coin["id"],
                "symbol": coin["symbol"].upper(),
                "name": coin["name"],
                "price": coin["current_price"],
                "change_24h": coin["price_change_percentage_24h"],
                "market_cap": coin["market_cap"],
                "volume_24h": coin["total_volume"],
                "image": coin["image"],
                "sparkline": coin["sparkline_in_7d"]["price"] if coin.get("sparkline_in_7d") else []
            })
            
        _cache["data"] = formatted_data
        _cache["last_updated"] = now
        return formatted_data
    except Exception as e:
        print(f"Error fetching from CoinGecko: {e}")
        # Return fallback data if API is rate limited (Crucial for Hackathon demo!)
        if _cache["data"]:
            return _cache["data"]
        return _get_fallback_data()

def _get_fallback_data():
    return [
        {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin", "price": 0.15, "change_24h": 2.5, "market_cap": 20000000000, "volume_24h": 1500000000, "image": "", "sparkline": [0.14, 0.145, 0.15]},
        {"id": "shiba-inu", "symbol": "SHIB", "name": "Shiba Inu", "price": 0.000025, "change_24h": 5.1, "market_cap": 15000000000, "volume_24h": 800000000, "image": "", "sparkline": [0.000021, 0.000025]},
        {"id": "pepe", "symbol": "PEPE", "name": "Pepe", "price": 0.000008, "change_24h": -1.2, "market_cap": 3400000000, "volume_24h": 450000000, "image": "", "sparkline": [0.000009, 0.000008]},
        {"id": "dogwifcoin", "symbol": "WIF", "name": "dogwifhat", "price": 2.80, "change_24h": 15.4, "market_cap": 2800000000, "volume_24h": 350000000, "image": "", "sparkline": [2.4, 2.8]},
        {"id": "bonk", "symbol": "BONK", "name": "Bonk", "price": 0.000022, "change_24h": 8.1, "market_cap": 1500000000, "volume_24h": 200000000, "image": "", "sparkline": [0.000018, 0.000022]}
    ]
