from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from db import get_session
import logging

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="CementOps AI", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "CementOps AI"}

@app.get("/api/readings")
def get_readings(machine: str = Query(default="kiln"), limit: int = Query(default=200)):
    session = get_session()
    try:
        result = session.execute(text("""
            SELECT id, machine_id, metric_name, value, is_anomaly,
                   timestamp AT TIME ZONE 'UTC' as timestamp
            FROM sensor_readings
            WHERE machine_id = :machine
            ORDER BY timestamp DESC
            LIMIT :limit
        """), {"machine": machine, "limit": limit})
        rows = result.fetchall()
        return [
            {
                "id":          r.id,
                "machine_id":  r.machine_id,
                "metric_name": r.metric_name,
                "value":       round(r.value, 3),
                "is_anomaly":  r.is_anomaly,
                "timestamp":   str(r.timestamp),
            }
            for r in rows
        ]
    finally:
        session.close()

@app.get("/api/alerts")
def get_alerts(limit: int = Query(default=20)):
    session = get_session()
    try:
        result = session.execute(text("""
            SELECT id, machine_id, anomaly_type, severity,
                   anomaly_score, root_cause,
                   timestamp AT TIME ZONE 'UTC' as timestamp
            FROM alert_log
            ORDER BY timestamp DESC
            LIMIT :limit
        """), {"limit": limit})
        rows = result.fetchall()
        return [
            {
                "id":           r.id,
                "machine_id":   r.machine_id,
                "anomaly_type": r.anomaly_type,
                "severity":     r.severity,
                "anomaly_score":r.anomaly_score,
                "root_cause":   r.root_cause,
                "timestamp":    str(r.timestamp),
            }
            for r in rows
        ]
    finally:
        session.close()

@app.get("/api/status")
def get_status():
    session = get_session()
    try:
        machines = ["kiln", "ball_mill", "cooler"]
        result = {}
        for machine in machines:
            row = session.execute(text("""
                SELECT COUNT(*) as alert_count
                FROM alert_log
                WHERE machine_id = :machine
                AND timestamp > NOW() - INTERVAL '10 minutes'
            """), {"machine": machine}).fetchone()
            count = row.alert_count
            if count == 0:
                status = "green"
            elif count <= 2:
                status = "yellow"
            else:
                status = "red"
            result[machine] = {"status": status, "alerts_last_10min": count}
        return result
    finally:
        session.close()

@app.get("/api/summary")
def get_summary():
    session = get_session()
    try:
        total = session.execute(text("SELECT COUNT(*) FROM sensor_readings")).scalar()
        anomalies = session.execute(text("SELECT COUNT(*) FROM sensor_readings WHERE is_anomaly=true")).scalar()
        alerts = session.execute(text("SELECT COUNT(*) FROM alert_log")).scalar()
        return {
            "total_readings": total,
            "total_anomalies": anomalies,
            "anomaly_rate": round((anomalies / total * 100), 2) if total > 0 else 0,
            "total_alerts": alerts,
        }
    finally:
        session.close()
        