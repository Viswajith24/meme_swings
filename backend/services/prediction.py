import random

# Simulates a predictive engine based on our mock metrics vs real price movements.

def calculate_predictions(coins):
    """
    Takes the real coin data and injects our proprietary 'Hype Score' 
    and Buy/Sell signals based on the algorithm.
    """
    results = []
    
    for coin in coins:
        # Generate a simulated "Social Volume" metrics
        base_volume = random.randint(1000, 50000)
        
        # Correlation: If price is up a lot (>10%), hype is usually very high
        change = coin.get("change_24h", 0)
        
        sentiment_avg = 0.5 # [-1.0 to 1.0]
        if change > 10:
            hype_modifier = random.uniform(1.5, 3.0)
            sentiment_avg = random.uniform(0.6, 0.9)
        elif change < -5:
            hype_modifier = random.uniform(0.5, 1.0)
            sentiment_avg = random.uniform(-0.5, 0.2)
        else:
            hype_modifier = random.uniform(0.8, 1.5)
            sentiment_avg = random.uniform(0.1, 0.6)
            
        social_volume_24h = int(base_volume * hype_modifier)
        
        # Calculate Hype Score (0 to 100)
        # Formula: (Normalized Volume * 0.5) + (Sentiment * 50) + (Price Momentum * 0.5)
        # For hackathon: we just map it to a pleasing number that looks correlated
        raw_hype = (social_volume_24h / 50000 * 50) + ((sentiment_avg + 1) * 25)
        hype_score = min(100, max(0, int(raw_hype)))
        
        # Issue Prediction Signal
        # Strong Buy, Buy, Hold, Sell, Strong Sell
        if hype_score > 85 and change < 20: 
            # High hype but price hasn't exploded yet = Strong Buy
            signal = "Strong Buy"
            confidence = random.uniform(80, 95)
        elif hype_score > 70:
            signal = "Buy"
            confidence = random.uniform(60, 80)
        elif hype_score < 30 and change < -10:
            signal = "Strong Sell"
            confidence = random.uniform(75, 90)
        elif hype_score < 45:
            signal = "Sell"
            confidence = random.uniform(55, 75)
        else:
            signal = "Hold"
            confidence = random.uniform(40, 60)
            
        coin_with_prediction = dict(coin)
        coin_with_prediction["hype_metrics"] = {
            "hype_score": hype_score,
            "social_volume_24h": social_volume_24h,
            "avg_sentiment": round(sentiment_avg, 2),
            "signal": signal,
            "confidence": round(confidence, 1)
        }
        results.append(coin_with_prediction)
        
    return results
