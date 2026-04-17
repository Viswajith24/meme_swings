import random
from services.social_simulator import generate_social_feed

def get_rag_insights(coin_id):
    """
    Retrieves social signals and provides a 'smart' summarization 
    of the current narrative.
    """
    # Fetch a larger batch of signals for this coin
    all_signals = generate_social_feed(count=30)
    coin_signals = [s for s in all_signals if s["coin_id"] == coin_id]
    
    if not coin_signals:
        return ["No recent significant social activity detected.", "Sentiment is neutral with low discussion volume."]
    
    # Sort by engagement to find 'key' signals
    top_signals = sorted(coin_signals, key=lambda x: x["engagement"], reverse=True)
    
    # Analyze sentiment distribution
    positive_count = sum(1 for s in coin_signals if s["sentiment_label"] == "Positive")
    negative_count = sum(1 for s in coin_signals if s["sentiment_label"] == "Negative")
    
    insights = []
    
    # 1. Primary narrative insight
    if positive_count > negative_count * 2:
        insights.append(f"Strong bullish consensus forming—{positive_count} high-impact positive mentions in the last 24h.")
    elif negative_count > positive_count:
        insights.append(f"Caution advised: Significant distribution markers detected in social channels.")
    else:
        insights.append("Consolidation phase: Market participants are awaiting a clear directional catalyst.")
        
    # 2. Specific 'Top Mention' insight
    best_post = top_signals[0]
    insights.append(f"Top Signal Check: '{best_post['text'][:60]}...' garnered {best_post['engagement']:,} interactions on {best_post['platform']}.")
    
    # 3. Discussion depth insight
    avg_engagement = sum(s["engagement"] for s in coin_signals) / len(coin_signals)
    if avg_engagement > 1000:
        insights.append(f"High discussion density detected (Avg. {int(avg_engagement)} interactions per post).")
    else:
        insights.append("Social volume is primarily driven by retail mentions with moderate interaction depth.")
        
    return insights
