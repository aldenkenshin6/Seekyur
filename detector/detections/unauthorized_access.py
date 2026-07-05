from datetime import datetime, timedelta
import logging
from db import db
from api import api_client

logger = logging.getLogger("seekyur.detections.unauthorized_access")

def detect_unauthorized_access():
    logger.info("Running unauthorized access checks...")
    
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    
    # We group by userEmail to find if any user has 3+ authorization errors in last 5 minutes
    pipeline = [
        {"$match": {
            "timestamp": {"$gte": five_minutes_ago}
        }},
        {"$group": {
            "_id": "$userEmail",
            "count": {"$sum": 1},
            "routes": {"$addToSet": "$path"},
            "latest_time": {"$max": "$timestamp"}
        }},
        {"$match": {
            "count": {"$gte": 3}
        }}
    ]
    
    try:
        results = list(db.autherrorlogs.aggregate(pipeline))
        alert_sent = False
        
        for res in results:
            user = res["_id"]
            count = res["count"]
            routes = ", ".join(res["routes"])
            latest_time = res["latest_time"].strftime("%Y-%m-%d %H:%M:%S")
            
            title = "Unauthorized Access Attempt Detected"
            description = f"User '{user}' generated {count} unauthorized (401/403) errors in the last 5 minutes. Routes attempted: {routes}. Timestamp: {latest_time} UTC."
            
            # Deduplicate
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": user},
                "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
            })
            
            if not existing_alert:
                logger.warning(f"Unauthorized access spike detected for user {user}. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="High"
                )
                alert_sent = True
                
        return alert_sent
    except Exception as e:
        logger.error(f"Error checking unauthorized access: {e}")
        return False
