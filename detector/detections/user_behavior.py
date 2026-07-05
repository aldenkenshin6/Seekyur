from datetime import datetime, timedelta, timezone
import logging
from db import db
from api import api_client
import config

logger = logging.getLogger("seekyur.detections.user_behavior")

def detect_user_behavior():
    logger.info("Running user behavior checks...")
    alert_sent = False
    
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    
    # 1. Detect logins outside business hours
    try:
        logs = list(db.authlogs.find({
            "result": "Success",
            "event": "Login",
            "timestamp": {"$gte": five_minutes_ago}
        }))
        
        for log in logs:
            utc_time = log["timestamp"]
            # Convert to local timezone
            local_time = utc_time.replace(tzinfo=timezone.utc).astimezone(None)
            local_hour = local_time.hour
            
            if local_hour < config.BUSINESS_HOURS_START or local_hour >= config.BUSINESS_HOURS_END:
                user = log["userEmail"]
                ip = log["ipAddress"]
                time_str = local_time.strftime("%I:%M %p")
                
                title = "Suspicious Login Outside Business Hours"
                description = f"User '{user}' logged in outside standard business hours at {time_str} from IP {ip}."
                
                # Deduplicate
                existing_alert = db.alerts.find_one({
                    "title": title,
                    "description": {"$regex": user},
                    "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
                })
                
                if not existing_alert:
                    logger.warning(f"Suspicious login outside business hours: {user}. Sending alert...")
                    api_client.send_alert(
                        title=title,
                        description=description,
                        severity="Medium"
                    )
                    alert_sent = True
    except Exception as e:
        logger.error(f"Error checking outside business hours login: {e}")

    # 2. Detect Viewer role attempting to access restricted data
    try:
        auth_errors = list(db.autherrorlogs.find({
            "type": "403",
            "timestamp": {"$gte": five_minutes_ago}
        }))
        
        for err in auth_errors:
            email = err.get("userEmail")
            if email and email != 'Anonymous':
                user_doc = db.users.find_one({"email": email})
                if user_doc and user_doc.get("role") == "Viewer":
                    path = err.get("path")
                    method = err.get("method")
                    
                    title = "Unauthorized Access Attempt Detected"
                    description = f"Viewer user '{email}' attempted unauthorized action: {method} {path}."
                    
                    # Deduplicate
                    existing_alert = db.alerts.find_one({
                        "title": title,
                        "description": {"$regex": email},
                        "createdAt": {"$gte": datetime.utcnow() - timedelta(minutes=5)}
                    })
                    
                    if not existing_alert:
                        logger.warning(f"Viewer access breach detected: {email}. Sending alert...")
                        api_client.send_alert(
                            title=title,
                            description=description,
                            severity="Medium"
                        )
                        alert_sent = True
    except Exception as e:
        logger.error(f"Error checking Viewer access violations: {e}")

    return alert_sent
