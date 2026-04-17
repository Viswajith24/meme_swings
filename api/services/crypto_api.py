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
        
    # Top meme coins: 15 tracked coins
    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        "vs_currency": "usd",
        "category": "meme-token",
        "order": "market_cap_desc",
        "per_page": 100,
        "page": 1,
        "sparkline": "true",
        "price_change_percentage": "24h,7d"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
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
                "change_24h": coin.get("price_change_percentage_24h_in_currency", 0) or coin.get("price_change_percentage_24h", 0) or 0,
                "change_7d": coin.get("price_change_percentage_7d_in_currency", 0) or 0,
                "market_cap": coin.get("market_cap", 0) or 0,
                "market_cap_rank": coin.get("market_cap_rank", 0),
                "volume_24h": coin.get("total_volume", 0) or 0,
                "image": coin.get("image", ""),
                "sparkline": coin["sparkline_in_7d"]["price"] if coin.get("sparkline_in_7d") else [],
                "last_updated": coin.get("last_updated")
            })
            
        _cache["data"] = formatted_data
        _cache["last_updated"] = now
        return formatted_data
    except Exception as e:
        print(f"Error fetching from CoinGecko: {e}")
        if _cache["data"]:
            return _cache["data"]
        return _get_fallback_data()

def get_coin_market_data(coin_id):
    """Fetches detailed market data for a single coin, using cache if available."""
    coins = get_top_meme_coins()
    for coin in coins:
        if coin["id"] == coin_id or coin["symbol"].lower() == coin_id.lower():
            return coin
    return None

def _get_fallback_data():
    return [
        {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin", "price": 0.15, "change_24h": 2.5, "change_7d": 10.2, "market_cap": 20000000000, "market_cap_rank": 10, "volume_24h": 1500000000, "image": "", "sparkline": [0.14, 0.145, 0.15]},
        {"id": "shiba-inu", "symbol": "SHIB", "name": "Shiba Inu", "price": 0.000025, "change_24h": 5.1, "change_7d": 12.5, "market_cap": 15000000000, "market_cap_rank": 15, "volume_24h": 800000000, "image": "", "sparkline": [0.000021, 0.000025]},
        {"id": "pepe", "symbol": "PEPE", "name": "Pepe", "price": 0.000008, "change_24h": -1.2, "change_7d": -5.3, "market_cap": 3400000000, "market_cap_rank": 40, "volume_24h": 450000000, "image": "", "sparkline": [0.000009, 0.000008]},
        {"id": "dogwifcoin", "symbol": "WIF", "name": "dogwifhat", "price": 2.80, "change_24h": 15.4, "change_7d": 45.2, "market_cap": 2800000000, "market_cap_rank": 50, "volume_24h": 350000000, "image": "", "sparkline": [2.4, 2.8]},
        {"id": "bonk", "symbol": "BONK", "name": "Bonk", "price": 0.000022, "change_24h": 8.1, "change_7d": 15.1, "market_cap": 1500000000, "market_cap_rank": 70, "volume_24h": 200000000, "image": "", "sparkline": [0.000018, 0.000022]},
        {"id": "floki", "symbol": "FLOKI", "name": "FLOKI", "price": 0.00018, "change_24h": 6.3, "change_7d": 9.2, "market_cap": 1700000000, "market_cap_rank": 65, "volume_24h": 300000000, "image": "", "sparkline": [0.00016, 0.00018]},
        {"id": "brett", "symbol": "BRETT", "name": "Brett", "price": 0.12, "change_24h": 11.2, "change_7d": 25.4, "market_cap": 1200000000, "market_cap_rank": 85, "volume_24h": 180000000, "image": "", "sparkline": [0.10, 0.12]},
        {"id": "turbo-token", "symbol": "TURBO", "name": "Turbo", "price": 0.005, "change_24h": -3.4, "change_7d": -12.1, "market_cap": 500000000, "market_cap_rank": 150, "volume_24h": 90000000, "image": "", "sparkline": [0.006, 0.005]},
        {"id": "mog-coin", "symbol": "MOG", "name": "Mog Coin", "price": 0.0000018, "change_24h": 22.1, "change_7d": 45.2, "market_cap": 700000000, "market_cap_rank": 110, "volume_24h": 110000000, "image": "", "sparkline": [0.0000014, 0.0000018]},
        {"id": "neiro-on-eth", "symbol": "NEIRO", "name": "Neiro", "price": 0.0012, "change_24h": -5.6, "change_7d": -15.2, "market_cap": 450000000, "market_cap_rank": 160, "volume_24h": 75000000, "image": "", "sparkline": [0.0014, 0.0012]},
        {"id": "memecoin", "symbol": "MEME", "name": "Memecoin", "price": 0.025, "change_24h": 4.8, "change_7d": 12.1, "market_cap": 600000000, "market_cap_rank": 130, "volume_24h": 95000000, "image": "", "sparkline": [0.023, 0.025]},
        {"id": "coq-inu", "symbol": "COQ", "name": "Coq Inu", "price": 0.0000004, "change_24h": 18.5, "change_7d": 35.2, "market_cap": 250000000, "market_cap_rank": 210, "volume_24h": 45000000, "image": "", "sparkline": [0.0000003, 0.0000004]},
        {"id": "myro", "symbol": "MYRO", "name": "Myro", "price": 0.08, "change_24h": -2.1, "change_7d": -8.4, "market_cap": 320000000, "market_cap_rank": 180, "volume_24h": 55000000, "image": "", "sparkline": [0.085, 0.08]},
        {"id": "toshi", "symbol": "TOSHI", "name": "Toshi", "price": 0.00035, "change_24h": 9.3, "change_7d": 22.1, "market_cap": 280000000, "market_cap_rank": 195, "volume_24h": 40000000, "image": "", "sparkline": [0.00030, 0.00035]},
        {"id": "baby-doge-coin", "symbol": "BABYDOGE", "name": "Baby Doge Coin", "price": 0.0000000021, "change_24h": 7.6, "change_7d": 11.2, "market_cap": 350000000, "market_cap_rank": 170, "volume_24h": 60000000, "image": "", "sparkline": [0.0000000018, 0.0000000021]}
    ]

