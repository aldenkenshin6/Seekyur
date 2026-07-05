import socket
import threading
from datetime import datetime, timedelta
import logging
from api import api_client
from db import db

logger = logging.getLogger("seekyur.detections.port_scan")

# Unused honeypot ports
HONEYPOT_PORTS = [9001, 9002, 9003]

# In-memory log of honeypot connection attempts
connections_log = []
log_lock = threading.Lock()
initialized = False

def start_honeypot_listener(port):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # Enable address reuse
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        server.bind(("0.0.0.0", port))
        server.listen(10)
        logger.info(f"Honeypot listener started on port {port}")
    except Exception as e:
        logger.error(f"Could not bind honeypot on port {port}: {e}")
        return

    while True:
        try:
            client, addr = server.accept()
            ip = addr[0]
            client.close() # Close connection immediately
            
            logger.info(f"Honeypot hit on port {port} from IP: {ip}")
            with log_lock:
                connections_log.append({
                    "ip": ip,
                    "port": port,
                    "time": datetime.utcnow()
                })
        except Exception as e:
            logger.error(f"Error on honeypot port {port}: {e}")
            break

def init_port_scan_detector():
    global initialized
    if initialized:
        return
    initialized = True
    for port in HONEYPOT_PORTS:
        t = threading.Thread(target=start_honeypot_listener, args=(port,), daemon=True)
        t.start()

def detect_port_scan():
    # Make sure listeners are initialized
    init_port_scan_detector()
    
    logger.info("Running port scanning checks...")
    alert_sent = False
    now = datetime.utcnow()
    one_minute_ago = now - timedelta(minutes=1)
    
    with log_lock:
        # Keep only logs from the last 5 minutes to avoid memory build-up
        global connections_log
        connections_log = [log for log in connections_log if log["time"] >= now - timedelta(minutes=5)]
        
        # Analyze hits from the last 1 minute
        recent_hits = [log for log in connections_log if log["time"] >= one_minute_ago]

    # Group unique ports hit by IP
    ip_hits = {}
    for hit in recent_hits:
        ip = hit["ip"]
        port = hit["port"]
        if ip not in ip_hits:
            ip_hits[ip] = set()
        ip_hits[ip].add(port)
        
    # Check if any IP hit 2 or more unique honeypot ports
    for ip, ports in ip_hits.items():
        if len(ports) >= 2:
            ports_list = sorted(list(ports))
            title = "Port Scan Detected"
            description = f"Port scanning signature observed from IP: {ip}. Connected to honeypot ports: {ports_list} within 1 minute."
            
            # Deduplicate alerts in the last 5 minutes
            existing_alert = db.alerts.find_one({
                "title": title,
                "description": {"$regex": ip},
                "createdAt": {"$gte": now - timedelta(minutes=5)}
            })
            
            if not existing_alert:
                logger.warning(f"Port scanning signature detected from {ip}. Sending alert...")
                api_client.send_alert(
                    title=title,
                    description=description,
                    severity="Medium",
                    source="Network IDS Module"
                )
                alert_sent = True
                
    return alert_sent
