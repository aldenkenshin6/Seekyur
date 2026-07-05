import logging
import sys
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
import config
from db import db
from api import api_client

# Import tanan detection modules
from detections.brute_force import detect_brute_force
from detections.unauthorized_access import detect_unauthorized_access
from detections.api_abuse import detect_api_abuse
from detections.user_behavior import detect_user_behavior
from detections.sla_breach import detect_sla_breach
from detections.jwt_anomaly import detect_jwt_anomaly
from detections.account_anomaly import detect_account_anomaly
from detections.port_scan import detect_port_scan

# Set up logging to detector.log
log_formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')

# File handler
file_handler = logging.FileHandler("detector.log")
file_handler.setFormatter(log_formatter)
file_handler.setLevel(logging.INFO)

# Root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(file_handler)

logger = logging.getLogger("seekyur.detector")

def run_all_checks():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Brute Force
    print(f"[{timestamp}] Checking brute force...", end="", flush=True)
    res = detect_brute_force()
    print(" ALERT SENT - Brute force detected" if res else " No threats found")
    
    # Unauthorized Access
    print(f"[{timestamp}] Checking unauthorized access...", end="", flush=True)
    res = detect_unauthorized_access()
    print(" ALERT SENT - Unauthorized access" if res else " No threats found")
    
    # API Abuse
    print(f"[{timestamp}] Checking API abuse...", end="", flush=True)
    res = detect_api_abuse()
    print(" ALERT SENT - API spike detected" if res else " No threats found")
    
    # User Behavior
    print(f"[{timestamp}] Checking user behavior...", end="", flush=True)
    res = detect_user_behavior()
    print(" ALERT SENT - User anomaly detected" if res else " No threats found")
    
    # SLA Breach
    print(f"[{timestamp}] Checking SLA breaches...", end="", flush=True)
    res = detect_sla_breach()
    print(" ALERT SENT - SLA breach detected" if res else " No threats found")
    
    # JWT Anomaly
    print(f"[{timestamp}] Checking JWT anomalies...", end="", flush=True)
    res = detect_jwt_anomaly()
    print(" ALERT SENT - JWT anomaly detected" if res else " No threats found")
    
    # Account Anomaly
    print(f"[{timestamp}] Checking account anomalies...", end="", flush=True)
    res = detect_account_anomaly()
    print(" ALERT SENT - Account anomaly detected" if res else " No threats found")

    # Port Scan
    print(f"[{timestamp}] Checking port scanning...", end="", flush=True)
    res = detect_port_scan()
    print(" ALERT SENT - Port scan detected" if res else " No threats found")

def main():
    print("[SeekYur Detector] Starting detection engine...")
    logger.info("Starting detection engine...")
    
    try:
        # DB connection test
        db.client.admin.command('ping')
        print("[SeekYur Detector] Connected to MongoDB")
        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        print(f"[SeekYur Detector] Failed to connect to MongoDB: {e}")
        logger.critical(f"Failed to connect to MongoDB: {e}")
        sys.exit(1)
        
    # Authenticate with Express API
    if not api_client.login():
        print("[SeekYur Detector] Warning: Could not authenticate with Express API. Will retry during execution.")
        logger.warning("Could not authenticate with Express API on startup.")
        
    print(f"[SeekYur Detector] Running checks every {config.CHECK_INTERVAL} seconds")
    logger.info(f"Scheduled checks every {config.CHECK_INTERVAL} seconds")
    
    # Run immediate check on start
    run_all_checks()
    
    # Initialize Scheduler
    scheduler = BlockingScheduler()
    scheduler.add_job(run_all_checks, 'interval', seconds=config.CHECK_INTERVAL)
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        print("\n[SeekYur Detector] Detection engine stopped.")
        logger.info("Detection engine stopped.")

if __name__ == "__main__":
    main()
