import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/seekyur")
API_URL = os.getenv("API_URL", "http://localhost:3000/api")

# Credentials for the threat detector service account
API_EMAIL = "alex@seekyur.io"
API_PASSWORD = "password123"

# Scheduler settings
CHECK_INTERVAL = 60  # seconds between each detection run

# Threat detection thresholds
FAILED_LOGIN_THRESHOLD = 5           # attempts within 5 minutes
API_SPIKE_THRESHOLD = 100            # requests per minute
SLA_COLLECT_THRESHOLD = 24           # hours
SLA_ANALYZE_THRESHOLD = 48           # hours
CRITICAL_UNASSIGNED_THRESHOLD = 1     # hours
BUSINESS_HOURS_START = 8             # 8 AM
BUSINESS_HOURS_END = 18              # 6 PM
