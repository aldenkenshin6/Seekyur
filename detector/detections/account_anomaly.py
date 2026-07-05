from datetime import datetime, timedelta
import logging
from db import db
from api import api_client

logger = logging.getLogger("seekyur.detections.account_anomaly")

def detect_account_anomaly():
    logger.info("Running account anomaly checks...")
    alert_sent = False
    
    now = datetime.utcnow()
    ten_minutes_ago = now - timedelta(minutes=10)
    five_minutes_ago = now - timedelta(minutes=5)
    
    # 1. Deactivated account attempts login (High severity)
    try:
        logs = list(db.authlogs.find({
            "result": "Failed",
            "failureReason": "Account deactivated",
            "timestamp": {"$gte": five_minutes_ago}
        }))
        for log in logs:
            user = log["userEmail"]
            ip = log["ipAddress"]
            
            title = "Account Anomaly Detected"
            description = f"Deactivated account '{user}' attempted login from IP {ip}."
            
            # Deduplicate
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": user},
                "createdAt": {"$gte": now - timedelta(minutes=5)}
            })
            
            if not existing_alert:
                logger.warning(f"Deactivated user login attempt: {user}. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="High"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking deactivated account logins: {e}")

    # 2. 3+ new accounts created from same IP within 10 minutes (High severity)
    try:
        pipeline = [
            {"$match": {
                "path": "/api/auth/register",
                "method": "POST",
                "timestamp": {"$gte": ten_minutes_ago}
            }},
            {"$group": {
                "_id": "$ipAddress",
                "count": {"$sum": 1}
            }},
            {"$match": {
                "count": {"$gte": 3}
            }}
        ]
        results = list(db.requestlogs.aggregate(pipeline))
        for res in results:
            ip = res["_id"]
            count = res["count"]
            
            title = "Account Anomaly Detected"
            description = f"Suspicious activity: {count} new user accounts registered from the same IP address {ip} within 10 minutes."
            
            # Deduplicate
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": ip},
                "createdAt": {"$gte": now - timedelta(minutes=10)}
            })
            
            if not existing_alert:
                logger.warning(f"Registration spike from IP {ip}. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="High"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking account creation spikes: {e}")

    # 3. Role changed then immediately accesses new role routes (High severity)
    try:
        recent_updates = list(db.users.find({
            "updatedAt": {"$gte": five_minutes_ago}
        }))
        
        for user in recent_updates:
            user_email = user.get("email")
            role = user.get("role")
            updated_at = user.get("updatedAt")
            
            restricted_routes = []
            if role == "Admin":
                restricted_routes = ["/api/users"]
            elif role in ["SOC Analyst", "Incident Responder"]:
                restricted_routes = ["/api/incidents"]
                
            if restricted_routes:
                access = db.requestlogs.find_one({
                    "userEmail": user_email,
                    "timestamp": {"$gte": updated_at},
                    "path": {"$regex": "^" + "|".join(restricted_routes)}
                })
                
                if access:
                    title = "Account Anomaly Detected"
                    description = f"User '{user_email}' role was updated to '{role}', followed immediately by access to restricted route '{access.get('method')} {access.get('path')}'."
                    
                    # Deduplicate
                    existing_alert = db.alerts.find_one({
                        "title": title,
                        "description": {"$regex": user_email},
                        "createdAt": {"$gte": now - timedelta(minutes=5)}
                    })
                    
                    if not existing_alert:
                        logger.warning(f"Role change followed by immediate action: {user_email}. Sending alert...")
                        api_client.send_alert(
                            title=title,
                            description=description,
                            severity="High"
                        )
                        alert_sent = True
    except Exception as e:
        logger.error(f"Error checking immediate role access anomalies: {e}")

    return alert_sent
