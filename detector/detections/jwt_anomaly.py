from datetime import datetime, timedelta
import logging
from db import db
from api import api_client

logger = logging.getLogger("seekyur.detections.jwt_anomaly")

def detect_jwt_anomaly():
    logger.info("Running JWT anomaly checks...")
    alert_sent = False
    
    ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
    
    # 1. Detect same expired/invalid token used 3+ times (Low severity)
    try:
        pipeline = [
            {"$match": {
                "type": "401",
                "token": {"$ne": None},
                "timestamp": {"$gte": ten_minutes_ago}
            }},
            {"$group": {
                "_id": "$token",
                "count": {"$sum": 1}
            }},
            {"$match": {
                "count": {"$gte": 3}
            }}
        ]
        
        results = list(db.autherrorlogs.aggregate(pipeline))
        for res in results:
            token = res["_id"]
            count = res["count"]
            token_ref = token[:15] + "..." if token else "Unknown"
            
            title = "JWT Token Anomaly Detected"
            description = f"Expired/invalid JWT token reference {token_ref} was reused {count} times in the last 10 minutes."
            
            # Deduplicate
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": token_ref},
                "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=10)}
            })
            
            if not existing_alert:
                logger.warning(f"Expired JWT token reuse detected ({token_ref}). Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="Low"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking JWT token reuse: {e}")

    # 2. Detect same token used from 2+ different IPs (High severity)
    try:
        pipeline = [
            {"$match": {
                "token": {"$ne": None},
                "timestamp": {"$gte": ten_minutes_ago}
            }},
            {"$group": {
                "_id": "$token",
                "ips": {"$addToSet": "$ipAddress"}
            }},
            {"$project": {
                "ips": 1,
                "ip_count": {"$size": "$ips"}
            }},
            {"$match": {
                "ip_count": {"$gte": 2}
            }}
        ]
        
        results = list(db.requestlogs.aggregate(pipeline))
        for res in results:
            token = res["_id"]
            ips = ", ".join(res["ips"])
            token_ref = token[:15] + "..." if token else "Unknown"
            
            title = "JWT Token Anomaly Detected"
            description = f"Active JWT token reference {token_ref} is being used from multiple IP addresses: [{ips}]."
            
            # Deduplicate
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": token_ref},
                "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=10)}
            })
            
            if not existing_alert:
                logger.warning(f"Multi-IP JWT usage detected ({token_ref}). Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="High"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking JWT multi-IP usage: {e}")

    return alert_sent
