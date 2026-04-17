import random
import time
import uuid

# A realistic simulation that generates tweets/reddit posts about our tracked coins.

from .crypto_api import get_top_meme_coins

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
    
    coins_data = get_top_meme_coins()
    if not coins_data:
        return feed
        
    coin_ids = [c["id"] for c in coins_data]
    
    # Randomly pick a "trending" coin for this batch to simulate a spike
    trending_coin = random.choice(coin_ids)
    
    for _ in range(count):
        # 40% chance the post is about the trending coin
        coin_id = trending_coin if random.random() < 0.4 else random.choice(coin_ids)
        coin_info = next((c for c in coins_data if c["id"] == coin_id), None)
        symbol = coin_info["symbol"] if coin_info else coin_id.upper()
        
        tags = [f"#{symbol}", f"${symbol}", symbol]
        tag = random.choice(tags)
        
        # Determine sentiment
        rand_val = random.random()
        base_sent = 0.55 # default base sentiment
        
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
