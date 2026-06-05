CREATE TABLE IF NOT EXISTS sensor_readings (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metric_name VARCHAR(50) NOT NULL,
    value FLOAT NOT NULL,
    is_anomaly BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS alert_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    machine_id VARCHAR(50) NOT NULL,
    anomaly_type VARCHAR(50),
    severity VARCHAR(20),
    anomaly_score FLOAT,
    root_cause TEXT
);
