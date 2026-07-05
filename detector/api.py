import requests
import time
import logging
import config

logger = logging.getLogger("seekyur.api")

class APIClient:
    def __init__(self):
        self.token = None
        self.login_url = f"{config.API_URL}/auth/login"
        self.alerts_url = f"{config.API_URL}/alerts"

    def login(self):
        payload = {
            "email": config.API_EMAIL,
            "password": config.API_PASSWORD
        }
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting to log in to Express API at {self.login_url}...")
                response = requests.post(self.login_url, json=payload, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    self.token = data.get("token")
                    logger.info("Successfully authenticated with Express API.")
                    return True
                else:
                    logger.error(f"Login failed with status {response.status_code}: {response.text}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to reach login API (attempt {attempt + 1}/{max_retries}): {e}")
            time.sleep(2)
        return False

    def send_alert(self, title, description, severity, source="Python Detection Engine"):
        payload = {
            "title": title,
            "description": description,
            "severity": severity,
            "source": source
        }
        
        # Ensure we have a token
        if not self.token:
            if not self.login():
                logger.error("Skipping alert sending due to login failure.")
                return False

        headers = {
            "Authorization": f"Bearer {self.token}"
        }

        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = requests.post(self.alerts_url, json=payload, headers=headers, timeout=10)
                if response.status_code in [200, 201]:
                    logger.info(f"Alert successfully sent: {title}")
                    return True
                elif response.status_code == 401:
                    logger.warning("Received 401 Unauthorized from API. Attempting token refresh...")
                    if self.login():
                        headers["Authorization"] = f"Bearer {self.token}"
                        continue
                else:
                    logger.error(f"Failed to send alert. Status {response.status_code}: {response.text}")
                    return False
            except requests.exceptions.RequestException as e:
                logger.error(f"API unreachable when sending alert (attempt {attempt + 1}/{max_retries}): {e}")
                time.sleep(2)
        return False

# Export a single client instance
api_client = APIClient()
