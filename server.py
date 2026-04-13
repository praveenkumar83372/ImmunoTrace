# ===============================
# ImmunoTrace AI Backend - v4.0
# ===============================
from flask import Flask, jsonify
from flask_cors import CORS
import serial
import threading
import time
import random

app = Flask(__name__)
# CORS is enabled to allow your frontend (script.js) to talk to this server
CORS(app)

# --- Configuration ---
# Check Device Manager to see if your ESP32 is on COM3, COM4, etc.
PORT = "COM3" 
BAUD = 115200

# Global variables for data synchronization
ser = None
device_connected = False
latest_data = {"heart": 0, "spo2": 0, "temp": 0}

def try_connect():
    """Attempts to establish a USB-Serial connection with the ESP32."""
    global ser, device_connected
    try:
        ser = serial.Serial(PORT, BAUD, timeout=1)
        device_connected = True
        print(f"✅ Hardware Found: ESP32 connected on {PORT}")
    except Exception:
        device_connected = False
        print(f"⚠ Hardware Not Found: Running in Simulation Mode on {PORT}")

def read_loop():
    """Background thread to handle data flow from USB or Simulation."""
    global latest_data, device_connected, ser
    
    while True:
        if device_connected and ser and ser.is_open:
            try:
                # Expecting ESP32 format: "HR:75,SpO2:98,TEMP:37.2"
                line = ser.readline().decode('utf-8').strip()
                if line:
                    parts = line.split(",")
                    data_map = {}
                    for p in parts:
                        if ":" in p:
                            k, v = p.split(":")
                            data_map[k.strip()] = v.strip()
                    
                    # Update global state with real sensor values
                    latest_data["heart"] = int(data_map.get("HR", 0))
                    latest_data["spo2"] = int(data_map.get("SpO2", 0))
                    latest_data["temp"] = float(data_map.get("TEMP", 0))
            except Exception as e:
                print(f"🔌 Connection Lost: {e}")
                device_connected = False
                if ser: ser.close()
        else:
            # REALISTIC SIMULATION
            # Values fluctuate slightly to look real on the Dashboard graph
            latest_data = {
                "heart": random.randint(72, 78),
                "spo2": random.randint(97, 99),
                "temp": round(36.6 + (random.random() * 0.4), 1)
            }
            
            # Periodically try to reconnect to the hardware automatically
            if int(time.time()) % 10 == 0: 
                try_connect()

        time.sleep(1) # Data updates every 1 second

# ===============================
# API ENDPOINTS
# ===============================

@app.route("/status")
def status():
    """Returns the current hardware connection state."""
    return jsonify({
        "status": "connected" if device_connected else "simulation"
    })

@app.route("/get_data")
def get_data():
    """Main data endpoint used by script.js every second."""
    return jsonify(latest_data)

@app.route("/predict")
def predict():
    """Simple AI Logic to analyze the current health state."""
    h = latest_data["heart"]
    s = latest_data["spo2"]
    t = latest_data["temp"]
    
    status = "Healthy"
    color = "#22c55e"
    advice = "Your vitals are within the optimal range."

    if h > 100 or h < 60:
        status = "Irregular Pulse"
        color = "#ef4444"
        advice = "Heart rate is outside normal resting range. Rest and re-scan."
    elif s < 95:
        status = "Low Oxygen"
        color = "#f59e0b"
        advice = "SpO2 levels are slightly low. Ensure proper ventilation."
    elif t > 37.5:
        status = "Elevated Temp"
        color = "#ef4444"
        advice = "Body temperature indicates a possible fever."

    return jsonify({
        "data": latest_data,
        "analysis": {
            "status": status,
            "color": color,
            "advice": advice
        }
    })

# ===============================
# RUN SERVER
# ===============================
if __name__ == "__main__":
    # Initialize connection attempt
    try_connect()
    
    # Start the data background thread
    data_thread = threading.Thread(target=read_loop, daemon=True)
    data_thread.start()
    
    # Start the Flask API
    # debug=False is recommended when using background threading
    app.run(host="127.0.0.1", port=5000, debug=False)