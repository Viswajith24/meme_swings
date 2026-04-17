import random

# Simulates a predictive engine based on our mock metrics vs real price movements.

def calculate_predictions(coins):
    """
    Enhanced engine that calculates hype scores, confidence scores, 
    and detailed factors for explainable AI.
    """
    results = []
    
    for coin in coins:
        symbol = coin["symbol"]
        change_24h = coin.get("change_24h", 0)
        
        # 1. Simulate Input Metrics (In a real app, these come from DB/Social APIs)
        # ----------------------------------------------------------------------
        # Simulate base metrics with some correlation to price
        base_vol = random.randint(500, 20000)
        sentiment_avg = 0.5
        
        if change_24h > 15:
            vol_modifier = random.uniform(2.5, 5.0)
            sentiment_avg = random.uniform(0.65, 0.95)
        elif change_24h < -10:
            vol_modifier = random.uniform(0.8, 1.5)
            sentiment_avg = random.uniform(-0.6, 0.1)
        else:
            vol_modifier = random.uniform(1.2, 2.5)
            sentiment_avg = random.uniform(0.2, 0.6)
            
        social_volume = int(base_vol * vol_modifier)
        mention_spike = random.uniform(0.5, 4.5) # multiplier vs baseline
        velocity = random.uniform(0.1, 0.9) # speed of discussion
        
        # 2. Factor Breakdown (Explainable AI)
        # -----------------------------------
        # Weighting factors (Total 100 pts)
        factors = []
        
        # Sentiment Factor
        sentiment_impact = int((sentiment_avg + 0.2) * 35) # Max 42
        factors.append({
            "factor": "Sentiment Matrix",
            "impact": sentiment_impact,
            "explanation": f"Social sentiment is {round((sentiment_avg+1)/2*100)}% positive across platforms."
        })
        
        # Volume Spike Factor
        spike_impact = int(mention_spike * 10) # Max 45
        factors.append({
            "factor": "Mention Spike",
            "impact": spike_impact,
            "explanation": f"Discussion volume is {mention_spike:.1f}x higher than 7-day average."
        })
        
        # Momentum/Velocity Factor
        velocity_impact = int(velocity * 20) # Max 18
        factors.append({
            "factor": "Community Velocity",
            "impact": velocity_impact,
            "explanation": f"Discussion speed is {velocity:.1f} (High) as topics spread rapidly."
        })
        
        # 3. Hype Score Calculation
        # -------------------------
        hype_score = min(100, max(0, sentiment_impact + spike_impact + velocity_impact))
        
        # 4. Confidence Score Calculation (Specified Formula)
        # --------------------------------------------------
        # Consistency: Are sentiment and volume aligned?
        consistency = 1.0 - abs(sentiment_avg - (mention_spike / 5)) # Simplified
        consistency = max(0.1, min(1.0, consistency))
        
        # Freshness: Simulated (how recent is the latest heavy volume)
        freshness = random.uniform(0.7, 1.0) 
        
        # Accuracy: Simulated (historical success rate)
        historical_accuracy = random.uniform(0.6, 0.95)
        
        # Formula: (consistency * 0.4) + (freshness * 0.3) + (historical_accuracy * 0.3)
        confidence = (consistency * 0.4) + (freshness * 0.3) + (historical_accuracy * 0.3)
        confidence_score = round(confidence * 100, 1)
        
        # 5. Prediction Labels
        # --------------------
        if hype_score >= 80 and confidence_score > 70:
            label = "Strong Buy"
            color = "green"
        elif hype_score >= 60:
            label = "Buy"
            color = "cyan"
        elif hype_score >= 40:
            label = "Hold"
            color = "orange"
        elif hype_score >= 30:
            label = "Watch"
            color = "pink"
        else:
            label = "Avoid"
            color = "red"
            
        # 6. Assemble Result
        # -----------------
        coin_with_prediction = dict(coin)
        coin_with_prediction["hype_metrics"] = {
            "hype_score": hype_score,
            "social_volume_24h": social_volume,
            "avg_sentiment": round(sentiment_avg, 2),
            "signal": label,
            "confidence": confidence_score,
            "label": label,
            "factors": factors,
            "unusual_activity": mention_spike > 2.5,
            "explanation": f"Prediction driven by {'positive' if sentiment_avg > 0 else 'negative'} sentiment and {'strong' if mention_spike > 2 else 'moderate'} social spike."
        }
        results.append(coin_with_prediction)
        
    return results

