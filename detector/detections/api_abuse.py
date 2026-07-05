from datetime import datetime, timedelta
import logging
from db import db
from api import api_client
import config

logger = logging.getLogger("seekyur.detections.api_abuse")

def detect_api_abuse():
    logger.info("Running API abuse checks...")
    
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
    
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": one_minute_ago}
        }},
        {"$group": {
            "_id": "$userEmail",
            "count": {"$sum": 1}
        }},
        {"$match": {
            "count": {"$gte": config.API_SPIKE_THRESHOLD}
        }}
    ]
    
    try:
        results = list(db.requestlogs.aggregate(pipeline))
        alert_sent = False
        
        for res in results:
            user = res["_id"]
            count = res["count"]
            
            title = "Abnormal API Request Spike Detected"
            description = f"User '{user}' generated {count} API requests in the last minute, exceeding the threshold of {config.API_SPIKE_THRESHOLD}."
            
            # Deduplicate alerts in the last 2 minutes
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": user},
                "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=2)}
            })
            
            if not existing_alert:
                logger.warning(f"API abuse detected for user {user} with {count} requests/min. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="Medium"
                )
                alert_sent = True
                
        return alert_sent
    except Exception as e:
        logger.error(f"Error checking API abuse: {e}")
        return False
