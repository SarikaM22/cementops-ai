import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "cementops")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "your_password")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id          = Column(Integer, primary_key=True, index=True)
    machine_id  = Column(String(50), nullable=False)
    timestamp   = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    metric_name = Column(String(50), nullable=False)
    value       = Column(Float, nullable=False)
    is_anomaly  = Column(Boolean, default=False)

class AlertLog(Base):
    __tablename__ = "alert_log"
    id           = Column(Integer, primary_key=True, index=True)
    timestamp    = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    machine_id   = Column(String(50), nullable=False)
    anomaly_type = Column(String(50))
    severity     = Column(String(20))
    anomaly_score= Column(Float)
    root_cause   = Column(Text)

def get_session():
    return SessionLocal()

if __name__ == "__main__":
    session = get_session()
    from sqlalchemy import text
    result = session.execute(text("SELECT COUNT(*) FROM sensor_readings"))
    count = result.scalar()
    print(f"Connection successful! Rows in sensor_readings: {count}")
    session.close()
    