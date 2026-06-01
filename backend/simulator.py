import time
import math
import random
import logging
from datetime import datetime, timezone
from db import get_session, SensorReading, AlertLog

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")

class SensorSimulator:
    def __init__(self):
        self.drift_counters = {}
        self.dropout_counters = {}
        self.last_values = {}

    def _base_value(self, mean, std, machine, metric):
        hour = datetime.now().hour
        day_factor = 1 + 0.05 * math.sin(math.pi * hour / 12)
        noise = random.gauss(0, std)
        return mean * day_factor + noise

    def _inject_anomaly(self, value, machine, metric, std):
        key = f"{machine}_{metric}"
        is_anomaly = False
        anomaly_type = None

        if key in self.dropout_counters and self.dropout_counters[key] > 0:
            self.dropout_counters[key] -= 1
            value = self.last_values.get(key, value)
            is_anomaly = True
            anomaly_type = "dropout"

        elif key in self.drift_counters and self.drift_counters[key] > 0:
            drift = self.drift_counters[key] * (std * 0.3)
            value += drift
            self.drift_counters[key] -= 1
            is_anomaly = True
            anomaly_type = "drift"

        elif random.random() < 0.02:
            anomaly_choice = random.choice(["spike", "drift", "dropout"])
            if anomaly_choice == "spike":
                value += random.choice([-1, 1]) * std * random.uniform(3, 5)
                is_anomaly = True
                anomaly_type = "spike"
            elif anomaly_choice == "drift":
                self.drift_counters[key] = random.randint(3, 6)
                is_anomaly = True
                anomaly_type = "drift"
            elif anomaly_choice == "dropout":
                self.dropout_counters[key] = random.randint(2, 4)
                is_anomaly = True
                anomaly_type = "dropout"

        self.last_values[key] = value
        return value, is_anomaly, anomaly_type

    def generate_kiln(self):
        readings = []
        metrics = {
            "kiln_temperature": (1425, 8),
            "kiln_feed_rate":   (160,  5),
            "kiln_rpm":         (3.5,  0.1),
        }
        for metric, (mean, std) in metrics.items():
            base = self._base_value(mean, std, "kiln", metric)
            value, is_anomaly, anomaly_type = self._inject_anomaly(base, "kiln", metric, std)
            readings.append({
                "machine_id":   "kiln",
                "metric_name":  metric,
                "value":        round(value, 3),
                "is_anomaly":   is_anomaly,
                "anomaly_type": anomaly_type,
            })
        return readings

    def generate_ball_mill(self):
        readings = []
        metrics = {
            "mill_motor_current": (200, 10),
            "mill_vibration":     (3.5, 0.4),
        }
        for metric, (mean, std) in metrics.items():
            base = self._base_value(mean, std, "ball_mill", metric)
            value, is_anomaly, anomaly_type = self._inject_anomaly(base, "ball_mill", metric, std)
            readings.append({
                "machine_id":   "ball_mill",
                "metric_name":  metric,
                "value":        round(value, 3),
                "is_anomaly":   is_anomaly,
                "anomaly_type": anomaly_type,
            })
        return readings

    def generate_cooler(self):
        readings = []
        metrics = {
            "cooler_exit_temp": (100, 6),
        }
        for metric, (mean, std) in metrics.items():
            base = self._base_value(mean, std, "cooler", metric)
            value, is_anomaly, anomaly_type = self._inject_anomaly(base, "cooler", metric, std)
            readings.append({
                "machine_id":   "cooler",
                "metric_name":  metric,
                "value":        round(value, 3),
                "is_anomaly":   is_anomaly,
                "anomaly_type": anomaly_type,
            })
        return readings

    def all_readings(self):
        return self.generate_kiln() + self.generate_ball_mill() + self.generate_cooler()


def run():
    sim = SensorSimulator()
    session = get_session()
    logging.info("Simulator started — writing to PostgreSQL every 5 seconds")

    while True:
        try:
            readings = sim.all_readings()
            for r in readings:
                row = SensorReading(
                    machine_id  = r["machine_id"],
                    metric_name = r["metric_name"],
                    value       = r["value"],
                    is_anomaly  = r["is_anomaly"],
                    timestamp   = datetime.now(timezone.utc),
                )
                session.add(row)

                if r["is_anomaly"]:
                    alert = AlertLog(
                        machine_id   = r["machine_id"],
                        anomaly_type = r["anomaly_type"],
                        severity     = "high" if r["anomaly_type"] == "spike" else "medium",
                        anomaly_score= round(random.uniform(0.6, 0.95), 3),
                        root_cause   = f"Detected {r['anomaly_type']} in {r['metric_name']}",
                        timestamp    = datetime.now(timezone.utc),
                    )
                    session.add(alert)

            session.commit()

            for r in readings:
                status = "ANOMALY" if r["is_anomaly"] else "ok"
                logging.info(f"{r['machine_id']:10} | {r['metric_name']:22} | {r['value']:8.2f} | {status}")

            time.sleep(5)

        except Exception as e:
            logging.error(f"Error: {e}")
            session.rollback()
            time.sleep(10)


if __name__ == "__main__":
    run()
    