from datetime import datetime, timedelta
import logging
from db import db
from api import api_client
import config

logger = logging.getLogger("seekyur.detections.brute_force")

def detect_brute_force():
    logger.info("Running brute force login checks...")
    
    # Check failed logins in the last 5 minutes
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    
    pipeline = [
        {"$match": {
            "result": "Failed",
            "timestamp": {"$gte": five_minutes_ago}
        }},
        {"$group": {
            "_id": "$ipAddress",
            "count": {"$sum": 1}
        }},
        {"$match": {
            "count": {"$gte": config.FAILED_LOGIN_THRESHOLD}
        }}
    ]
    
    try:
        results = list(db.authlogs.aggregate(pipeline))
        alert_sent = False
        
        for res in results:
            ip = res["_id"]
            count = res["count"]
            
            title = "Brute Force Login Attempt Detected"
            description = f"Potential brute force attack from IP: {ip}. Attempts: {count} failed logins in the last 5 minutes."
            
            # Deduplicate alerts in last 5 minutes
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": ip},
                "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
            })
            
            if not existing_alert:
                logger.warning(f"Brute force detected from {ip} with {count} failures. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="High"
                )
                alert_sent = True
            else:
                logger.info(f"Brute force alert already sent recently for IP {ip}.")
                
        return alert_sent
    except Exception as e:
        logger.error(f"Error checking brute force: {e}")
        return False
