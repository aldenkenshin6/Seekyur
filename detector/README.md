# SeekYur Threat Detection Engine

The **SeekYur Threat Detection Engine** is a background daemon written in Python that monitors the SeekYur database logs and records. It flags anomalous and malicious behaviors, sending alerts directly to the Node.js/Express.js backend, which instantly propagates them in real-time to the SOC Dashboard via Socket.io.

## Features & Detections
1. **Brute Force Detection (`detections/brute_force.py`)**: Analyzes failed login attempts by IP. Sends an alert if an IP exceeds 5 failed attempts in 5 minutes.
2. **Unauthorized Access (`detections/unauthorized_access.py`)**: Monitors unauthorized attempts (status 401/403) and flags users hitting restricted resources repeatedly.
3. **API Abuse (`detections/api_abuse.py`)**: Identifies rate limit breaches (100+ requests per minute) from specific accounts.
4. **User Behavior Anomalies (`detections/user_behavior.py`)**: Flags successful logins outside of business hours (8 AM - 6 PM) and Viewer roles attempting administrative operations.
5. **SLA Breach Monitoring (`detections/sla_breach.py`)**: Checks for overdue incident milestones (status "Collect" > 24 hours, status "Analyze" > 48 hours, or critical incidents unassigned > 1 hour).
6. **JWT Token Anomaly (`detections/jwt_anomaly.py`)**: Tracks invalid/expired JWT token reuse or tokens accessed from multiple IP addresses concurrently.
7. **Account Anomaly (`detections/account_anomaly.py`)**: Identifies access attempts on deactivated accounts, registration spikes from a single IP, or immediate actions following role modifications.

## Setup Instructions

### 1. Configure the Environment
Copy `.env.example` to `.env` inside the `detector/` directory:
```bash
cp .env.example .env
```
Ensure that `MONGO_URI` matches the database connection string of your Express.js backend.

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Run the Detector
Run the detector from your terminal:
```bash
python detector.py
```

Logs are printed to standard output and persisted inside `detector.log`.
