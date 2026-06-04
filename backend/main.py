from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from db import get_session
import logging
import pandas as pd
import numpy as np
import joblib
import json
import os
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
        import joblib
import json
import numpy as np
from sqlalchemy import text

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

forecast_model    = joblib.load(os.path.join(MODELS_DIR, "forecast_model.pkl"))
forecast_features = joblib.load(os.path.join(MODELS_DIR, "forecast_features.pkl"))
with open(os.path.join(MODELS_DIR, "forecast_metadata.json")) as f:
    forecast_meta = json.load(f)
with open(os.path.join(MODELS_DIR, "shap_importance.json")) as f:
    shap_data = json.load(f)

@app.get("/api/forecast")
def get_forecast():
    session = get_session()
    try:
        result = session.execute(text("""
            SELECT ts_bucket,
                   MAX(CASE WHEN metric_name='kiln_temperature'   THEN value END) as kiln_temperature,
                   MAX(CASE WHEN metric_name='kiln_feed_rate'     THEN value END) as kiln_feed_rate,
                   MAX(CASE WHEN metric_name='kiln_rpm'           THEN value END) as kiln_rpm,
                   MAX(CASE WHEN metric_name='mill_motor_current' THEN value END) as mill_motor_current,
                   MAX(CASE WHEN metric_name='mill_vibration'     THEN value END) as mill_vibration,
                   MAX(CASE WHEN metric_name='cooler_exit_temp'   THEN value END) as cooler_exit_temp
            FROM (
                SELECT *, date_trunc('minute', timestamp) +
                       INTERVAL '5 seconds' * FLOOR(EXTRACT(second FROM timestamp)/5) as ts_bucket
                FROM sensor_readings
                ORDER BY timestamp DESC
                LIMIT 600
            ) sub
            GROUP BY ts_bucket
            ORDER BY ts_bucket ASC
        """))
        rows = result.fetchall()
        if len(rows) < 20:
            return {"error": "Not enough data for forecast — need 20+ readings"}

        df = pd.DataFrame(rows, columns=[
            'ts_bucket','kiln_temperature','kiln_feed_rate','kiln_rpm',
            'mill_motor_current','mill_vibration','cooler_exit_temp'
        ])
        df = df.ffill().bfill().dropna()

        sensors = ['cooler_exit_temp','kiln_feed_rate','kiln_rpm',
                   'kiln_temperature','mill_motor_current','mill_vibration']
        for col in sensors:
            df[f'{col}_mean20'] = df[col].rolling(20, min_periods=1).mean()
            df[f'{col}_std20']  = df[col].rolling(20, min_periods=1).std().fillna(0)

        for lag in [1, 5, 10]:
            df[f'kiln_temp_lag{lag}'] = df['kiln_temperature'].shift(lag)

        slopes = []
        for i in range(len(df)):
            if i < 10:
                slopes.append(0)
            else:
                y = df['kiln_temperature'].iloc[i-10:i].values
                slope = np.polyfit(range(10), y, 1)[0]
                slopes.append(float(slope))
        df['kiln_temp_slope'] = slopes

        df['hour'] = pd.to_datetime(df['ts_bucket']).dt.hour
        df['is_day_shift'] = ((df['hour'] >= 6) & (df['hour'] < 18)).astype(int)
        df = df.dropna()

        if len(df) == 0:
            return {"error": "Feature engineering failed"}

        last_row = df[forecast_features].iloc[-1:].values
        prediction = float(forecast_model.predict(last_row)[0])
        margin = forecast_meta['confidence_margin']

        return {
            "predicted_kiln_temp": round(prediction, 2),
            "confidence_low":      round(prediction - margin, 2),
            "confidence_high":     round(prediction + margin, 2),
            "mape_pct":            forecast_meta['mape'],
            "rmse":                forecast_meta['rmse'],
            "message": f"Kiln temperature forecast: {round(prediction,1)}°C (±{round(margin,1)}°C)"
        }
    finally:
        session.close()

@app.get("/api/shap")
def get_shap():
    return {
        "top_features": [
            {"feature": k, "importance": round(v, 4)}
            for k, v in shap_data.items()
        ],
        "description": "Mean absolute SHAP values — higher = more impact on forecast"
    }

@app.get("/api/kpi")
def get_kpi():
    session = get_session()
    try:
        result = session.execute(text("""
            SELECT metric_name, AVG(value) as avg_val
            FROM sensor_readings
            WHERE timestamp > NOW() - INTERVAL '10 minutes'
            GROUP BY metric_name
        """))
        rows = result.fetchall()
        kpis = {r.metric_name: round(r.avg_val, 2) for r in rows}

        kiln_temp  = kpis.get('kiln_temperature', 0)
        energy     = kpis.get('mill_motor_current', 0)
        throughput = kpis.get('kiln_feed_rate', 0)
        vibration  = kpis.get('mill_vibration', 0)

        temp_ok   = 1400 <= kiln_temp <= 1450
        vib_ok    = vibration < 5.0
        oee_score = round((0.4 * min(throughput/160, 1) +
                           0.4 * (1 - min(vibration/7, 1)) +
                           0.2 * (1 if temp_ok else 0.5)) * 100, 1)

        return {
            "kiln_temperature":    kiln_temp,
            "kiln_feed_rate":      throughput,
            "mill_motor_current":  energy,
            "mill_vibration":      vibration,
            "oee_score":           oee_score,
            "kiln_status":         "normal" if temp_ok else "alert",
            "vibration_status":    "normal" if vib_ok else "warning"
        }
    finally:
        session.close()
@app.get("/api/phm")
def get_phm():
    session = get_session()
    try:
        machines = ["kiln", "ball_mill", "cooler"]
        result = {}

        for machine in machines:
            # Get latest 100 readings for this machine
            rows = session.execute(text("""
                SELECT metric_name, AVG(value) as avg_val,
                       STDDEV(value) as std_val,
                       MAX(value) as max_val,
                       COUNT(*) as count
                FROM sensor_readings
                WHERE machine_id = :machine
                AND timestamp > NOW() - INTERVAL '30 minutes'
                GROUP BY metric_name
            """), {"machine": machine}).fetchall()

            # Get anomaly count last 30 mins
            anomaly_count = session.execute(text("""
                SELECT COUNT(*) FROM sensor_readings
                WHERE machine_id = :machine
                AND is_anomaly = true
                AND timestamp > NOW() - INTERVAL '30 minutes'
            """), {"machine": machine}).scalar()

            # Get total readings last 30 mins
            total_count = session.execute(text("""
                SELECT COUNT(*) FROM sensor_readings
                WHERE machine_id = :machine
                AND timestamp > NOW() - INTERVAL '30 minutes'
            """), {"machine": machine}).scalar()

            # Compute health score components
            anomaly_rate = (anomaly_count / total_count * 100) if total_count > 0 else 0

            # Anomaly score: 100 if 0% anomaly, 0 if 20%+ anomaly
            anomaly_score = max(0, 100 - (anomaly_rate * 5))

            # Sensor stability score based on std deviation
            stability_scores = []
            thresholds = {
                "kiln_temperature": 15,
                "kiln_feed_rate": 10,
                "kiln_rpm": 0.3,
                "mill_motor_current": 20,
                "mill_vibration": 1.5,
                "cooler_exit_temp": 12,
            }
            for row in rows:
                threshold = thresholds.get(row.metric_name, 10)
                std = row.std_val or 0
                score = max(0, 100 - (std / threshold * 100))
                stability_scores.append(min(100, score))

            stability_score = sum(stability_scores) / len(stability_scores) if stability_scores else 100

            # Composite health score
            health_score = round((anomaly_score * 0.6 + stability_score * 0.4), 1)

            # RUL estimation (simplified)
            if health_score >= 85:
                rul_hours = round(720 - (100 - health_score) * 10)
                rul_status = "healthy"
            elif health_score >= 70:
                rul_hours = round(360 - (85 - health_score) * 8)
                rul_status = "monitor"
            elif health_score >= 50:
                rul_hours = round(120 - (70 - health_score) * 4)
                rul_status = "warning"
            else:
                rul_hours = round(max(12, health_score * 2))
                rul_status = "critical"

            result[machine] = {
                "health_score": health_score,
                "anomaly_rate": round(anomaly_rate, 1),
                "anomaly_score": round(anomaly_score, 1),
                "stability_score": round(stability_score, 1),
                "rul_hours": rul_hours,
                "rul_status": rul_status,
                "total_readings_30min": total_count,
                "anomalies_30min": anomaly_count,
            }

        # Overall plant health
        scores = [v["health_score"] for v in result.values()]
        plant_health = round(sum(scores) / len(scores), 1)

        return {
            "plant_health_score": plant_health,
            "machines": result,
            "generated_at": str(pd.Timestamp.now())
        }
    finally:
        session.close()
        