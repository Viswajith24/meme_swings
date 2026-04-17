import random
import time

def calculate_authenticity(coin_id, signals):
    """
    Analyzes social signals for manipulation, bot activity, and coordination.
    Based on the Adversarial Hype Detection Engine (AHDE) specification.
    """
    if not signals:
        return {"score": 100, "classification": "Insufficient Data", "red_flags": []}

    coin_signals = [s for s in signals if s["coin_id"] == coin_id]
    if len(coin_signals) < 5:
        return {
            "score": 85, 
            "classification": "Organic Growth", 
            "red_flags": [], 
            "warnings": ["Low sample size; signals appear genuine."]
        }

    # 1. Content Duplication (Pattern 1)
    # ----------------------------------
    # Simulate similarity check
    similar_content_ratio = random.uniform(0, 0.45) # Mocking NLP similarity
    duplication_index = min(1.0, similar_content_ratio / 0.3)
    
    # 2. Volume-Sentiment Mismatch (Pattern 3)
    # ----------------------------------------
    avg_sentiment = sum(s["sentiment_score"] for s in coin_signals) / len(coin_signals)
    volume_rank = len(coin_signals) / len(signals) # relative volume
    
    mismatch_score = 0
    if volume_rank > 0.2 and avg_sentiment < 0.2:
        mismatch_score = 0.8 # High volume, but low sentiment = suspicious
    elif volume_rank > 0.3:
        mismatch_score = 0.3

    # 3. Timing Anomaly (Pattern 4)
    # -----------------------------
    # Check if mentions are clustered too closely
    timestamps = sorted([s["timestamp"] for s in coin_signals])
    time_span = timestamps[-1] - timestamps[0]
    
    timing_anomaly = 0
    if time_span < 300 and len(coin_signals) > 10: # >10 posts in 5 mins
        timing_anomaly = 0.9
    elif time_span < 600:
        timing_anomaly = 0.4

    # 4. Engagement Depth (Pattern 5)
    # -------------------------------
    avg_engagement = sum(s["engagement"] for s in coin_signals) / len(coin_signals)
    depth_score = 1.0 - min(1.0, avg_engagement / 5000) # Low engagement = high depth sus

    # 5. Calculation
    # --------------
    # Weights: [0.25 (Dup), 0.30 (Mismatch), 0.15 (Timing), 0.20 (Depth), 0.10 (History)]
    suspicious_factor = (
        (duplication_index * 0.25) + 
        (mismatch_score * 0.30) + 
        (timing_anomaly * 0.15) + 
        (depth_score * 0.20) + 
        (random.uniform(0, 0.3) * 0.10)
    )
    
    auth_score = int((1 - min(1.0, suspicious_factor)) * 100)
    
    red_flags = []
    if duplication_index > 0.6:
        red_flags.append({"pattern": "Content Duplication", "severity": "high", "details": f"{int(similar_content_ratio*100)}% similarity detected."})
    if mismatch_score > 0.5:
        red_flags.append({"pattern": "Sentiment Mismatch", "severity": "mid", "details": "High volume with low sentiment support."})
    if timing_anomaly > 0.7:
        red_flags.append({"pattern": "Timing Anomaly", "severity": "critical", "details": "Activity clustered in unnatural window."})

    if auth_score >= 70:
        classification = "Organic Growth"
    elif auth_score >= 40:
        classification = "Suspicious Activity"
    else:
        classification = "Manipulated Signal"
        
    warnings = []
    if auth_score < 40:
        warnings.append("Possible coordinated bot activity detected.")
    if duplication_index > 0.5:
        warnings.append("Detected clusters of identical messages.")

    return {
        "score": auth_score,
        "classification": classification,
        "red_flags": red_flags,
        "warnings": warnings,
        "factors": {
            "duplication": round(duplication_index, 2),
            "mismatch": round(mismatch_score, 2),
            "timing": round(timing_anomaly, 2),
            "depth": round(depth_score, 2)
        }
    }
