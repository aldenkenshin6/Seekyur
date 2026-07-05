import logging
from pymongo import MongoClient
import config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seekyur.db")

try:
    client = MongoClient(config.MONGO_URI)
    # Check connection
    client.admin.command('ping')
    logger.info("Successfully connected to MongoDB server")
    
    # Resolve the database name
    try:
        db = client.get_default_database()
        logger.info(f"Using default database from connection string: {db.name}")
    except Exception:
        # Fallback search for database containing 'incidents' collection
        logger.info("Database name not in URI. Searching databases for 'incidents' collection...")
        db_names = client.list_database_names()
        target_db = 'test'
        for name in db_names:
            if name not in ['admin', 'local', 'config']:
                collections = client[name].list_collection_names()
                if 'incidents' in collections:
                    target_db = name
                    break
        db = client[target_db]
        logger.info(f"Resolved database to: {db.name}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    raise e
