from datetime import datetime, timedelta
import logging
from db import db
from api import api_client
import config

logger = logging.getLogger("seekyur.detections.sla_breach")

def detect_sla_breach():
    logger.info("Running SLA breach checks...")
    alert_sent = False
    
    now = datetime.utcnow()
    collect_cutoff = now - timedelta(hours=config.SLA_COLLECT_THRESHOLD)
    analyze_cutoff = now - timedelta(hours=config.SLA_ANALYZE_THRESHOLD)
    critical_cutoff = now - timedelta(hours=config.CRITICAL_UNASSIGNED_THRESHOLD)
    
    # 1. Collect SLA Breach (>24h)
    try:
        incidents = list(db.incidents.find({
            "status": "Collect",
            "createdAt": {"$lt": collect_cutoff}
        }))
        for inc in incidents:
            title_inc = inc.get("title")
            hours_elapsed = int((now - inc.get("createdAt")).total_seconds() / 3600)
            
            title = "Incident SLA Breach Detected"
            description = f"Incident '{title_inc}' has been in 'Collect' status for {hours_elapsed} hours, breaching the SLA threshold of {config.SLA_COLLECT_THRESHOLD} hours."
            
            # Deduplicate (last 24 hours)
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": title_inc},
                "createdAt": {"$gte": now - timedelta(hours=24)}
            })
            
            if not existing_alert:
                logger.warning(f"SLA breach (Collect) for '{title_inc}'. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="Medium"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking Collect SLA breaches: {e}")

    # 2. Analyze SLA Breach (>48h)
    try:
        incidents = list(db.incidents.find({
            "status": "Analyze",
            "createdAt": {"$lt": analyze_cutoff}
        }))
        for inc in incidents:
            title_inc = inc.get("title")
            hours_elapsed = int((now - inc.get("createdAt")).total_seconds() / 3600)
            
            title = "Incident SLA Breach Detected"
            description = f"Incident '{title_inc}' has been in 'Analyze' status for {hours_elapsed} hours, breaching the SLA threshold of {config.SLA_ANALYZE_THRESHOLD} hours."
            
            # Deduplicate
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": title_inc},
                "createdAt": {"$gte": now - timedelta(hours=24)}
            })
            
            if not existing_alert:
                logger.warning(f"SLA breach (Analyze) for '{title_inc}'. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="Medium"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking Analyze SLA breaches: {e}")

    # 3. Critical severity incident unassigned (>1h)
    try:
        incidents = list(db.incidents.find({
            "severity": "Critical",
            "assignedTo": {"$in": [None, ""]},
            "status": {"$ne": "Close"},
            "createdAt": {"$lt": critical_cutoff}
        }))
        for inc in incidents:
            title_inc = inc.get("title")
            hours_elapsed = int((now - inc.get("createdAt")).total_seconds() / 3600)
            
            title = "Incident SLA Breach Detected"
            description = f"Critical incident '{title_inc}' remains unassigned for {hours_elapsed} hours, breaching the safety threshold of {config.CRITICAL_UNASSIGNED_THRESHOLD} hour."
            
            # Deduplicate (last 12 hours)
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": title_inc},
                "createdAt": {"$gte": now - timedelta(hours=12)}
            })
            
            if not existing_alert:
                logger.warning(f"SLA breach (Unassigned Critical) for '{title_inc}'. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="High"
                )
                alert_sent = True
    except Exception as e:
        logger.error(f"Error checking unassigned Critical SLA breaches: {e}")

    return alert_sent
