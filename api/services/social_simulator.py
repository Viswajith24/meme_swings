import random
import time
import uuid

# A realistic simulation that generates tweets/reddit posts about our tracked coins.

COINS = {
    "dogecoin": {"tags": ["#DOGE", "$DOGE", "Dogecoin"], "base_sentiment": 0.6},
    "shiba-inu": {"tags": ["#SHIB", "$SHIB", "ShibArmy"], "base_sentiment": 0.5},
    "pepe": {"tags": ["#PEPE", "$PEPE", "Pepe"], "base_sentiment": 0.4},
    "dogwifcoin": {"tags": ["#WIF", "$WIF", "dogwifhat"], "base_sentiment": 0.8},
    "bonk": {"tags": ["#BONK", "$BONK"], "base_sentiment": 0.7},
    "floki": {"tags": ["#FLOKI", "$FLOKI", "FlokiArmy"], "base_sentiment": 0.65},
    "brett": {"tags": ["#BRETT", "$BRETT", "Brett"], "base_sentiment": 0.75},
    "turbo-token": {"tags": ["#TURBO", "$TURBO", "TurboToken"], "base_sentiment": 0.5},
    "mog-coin": {"tags": ["#MOG", "$MOG", "MogCoin"], "base_sentiment": 0.6},
    "neiro-on-eth": {"tags": ["#NEIRO", "$NEIRO"], "base_sentiment": 0.45},
    "memecoin": {"tags": ["#MEME", "$MEME", "Memecoin"], "base_sentiment": 0.55},
    "coq-inu": {"tags": ["#COQ", "$COQ", "CoqInu"], "base_sentiment": 0.7},
    "myro": {"tags": ["#MYRO", "$MYRO"], "base_sentiment": 0.5},
    "toshi": {"tags": ["#TOSHI", "$TOSHI"], "base_sentiment": 0.55},
    "baby-doge-coin": {"tags": ["#BABYDOGE", "$BABYDOGE", "BabyDoge"], "base_sentiment": 0.6}
}

PLATFORMS = ["Twitter", "Reddit", "Telegram"]

TEMPLATES_POSITIVE = [
    "Just loaded my bags with {tag}! 🚀🌕",
    "If you are not buying {tag} right now, you hate money. #Bullish",
    "Huge whale alert on {tag}! Something big is coming! 👀",
    "{tag} is breaking out! To the moon! 📈",
    "Community for {tag} is unmatched. So early."
]

TEMPLATES_NEGATIVE = [
    "Looks like {tag} momentum is fading. Taking profits here. 📉",
    "Devs dumping {tag}? Chart looks awful.",
    "Be careful with {tag}, too much leverage right now.",
    "{tag} is highly overvalued in this market."
]

TEMPLATES_NEUTRAL = [
    "Watching {tag} closely at this resistance level.",
    "{tag} volume is decent today.",
    "Anyone else tracking {tag}?"
]

def generate_social_feed(count=5):
    """Generates a list of recent social media posts with sentiment scores."""
    feed = []
    
    # Randomly pick a "trending" coin for this batch to simulate a spike
    trending_coin = random.choice(list(COINS.keys()))
    
    for _ in range(count):
        # 40% chance the post is about the trending coin
        coin_id = trending_coin if random.random() < 0.4 else random.choice(list(COINS.keys()))
        coin_data = COINS[coin_id]
        tag = random.choice(coin_data["tags"])
        
        # Determine sentiment
        rand_val = random.random()
        base_sent = coin_data["base_sentiment"]
        
        # Adjust base sentiment if this is the trending coin
        if coin_id == trending_coin:
            base_sent = min(1.0, base_sent + 0.2)
            
        if rand_val < base_sent * 0.6:
            template = random.choice(TEMPLATES_POSITIVE)
            sentiment_score = random.uniform(0.5, 1.0)
            sentiment_label = "Positive"
        elif rand_val > (base_sent * 0.6 + 0.3):
            template = random.choice(TEMPLATES_NEGATIVE)
            sentiment_score = random.uniform(-1.0, -0.2)
            sentiment_label = "Negative"
        else:
            template = random.choice(TEMPLATES_NEUTRAL)
            sentiment_score = random.uniform(-0.19, 0.49)
            sentiment_label = "Neutral"
            
        post_text = template.format(tag=tag)
        
        feed.append({
            "id": str(uuid.uuid4())[:8],
            "coin_id": coin_id,
            "platform": random.choice(PLATFORMS),
            "text": post_text,
            "sentiment_score": round(sentiment_score, 2),
            "sentiment_label": sentiment_label,
            "timestamp": int(time.time()) - random.randint(1, 120), # past 2 mins
            "engagement": random.randint(10, 5000)
        })
        
    # Sort by timestamp descending
    feed.sort(key=lambda x: x["timestamp"], reverse=True)
    return feed
