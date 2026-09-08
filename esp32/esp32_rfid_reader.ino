#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =========================================================================
// 1. NETWORK & API CONFIGURATION
// =========================================================================
const char* WIFI_SSID        = "Okieee";
const char* WIFI_PASS        = "11111111";

// Production Laravel Cloud API Endpoint (HTTPS)
const char* SCAN_URL         = "https://ioclass-production-1n8wom.laravel.cloud/api/rfid/scan";

// Must match RFID_DEVICE_TOKEN in your Laravel Cloud environment settings
const char* DEVICE_TOKEN     = "esp32-room-a";

const unsigned long HTTP_TIMEOUT_MS = 10000; // 10 seconds for cloud latency
const unsigned long SCAN_COOLDOWN   = 2500;  // ms to prevent duplicate taps

// =========================================================================
// 2. PIN DEFINITIONS
// =========================================================================
// RFID RC522 (SPI)
#define RFID_SS_PIN   5
#define RFID_RST_PIN  16
#define RFID_SCK_PIN  18
#define RFID_MISO_PIN 19
#define RFID_MOSI_PIN 23

// I2C LCD 1602 (Address 0x27 or 0x3F)
#define I2C_SDA_PIN   21
#define I2C_SCL_PIN   22

// Passive/Active Buzzer
#define BUZZER_PIN    4

// =========================================================================
// 3. HARDWARE INSTANCES
// =========================================================================
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

bool wifiReady = false;
unsigned long lastScan = 0;

// =========================================================================
// 4. LCD & AUDIO HELPERS
// =========================================================================
void showLCD(const char* line1, const char* line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0); 
  lcd.print(line1);
  lcd.setCursor(0, 1); 
  lcd.print(line2);
}

String lcdTruncate(String str, int maxLen = 16) {
  if (str.length() > maxLen) {
    return str.substring(0, maxLen);
  }
  return str;
}

// Multi-core compatible buzzer sounds (ESP32 core v2 & v3)
void beepSuccess() {
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcWriteTone(BUZZER_PIN, 2800); delay(100);
  ledcWriteTone(BUZZER_PIN, 3500); delay(120);
  ledcWriteTone(BUZZER_PIN, 0);
#else
  ledcWriteTone(0, 2800); delay(100);
  ledcWriteTone(0, 3500); delay(120);
  ledcWriteTone(0, 0);
#endif
}

void beepError() {
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcWriteTone(BUZZER_PIN, 600); delay(250);
  ledcWriteTone(BUZZER_PIN, 0); delay(100);
  ledcWriteTone(BUZZER_PIN, 600); delay(250);
  ledcWriteTone(BUZZER_PIN, 0);
#else
  ledcWriteTone(0, 600); delay(250);
  ledcWriteTone(0, 0); delay(100);
  ledcWriteTone(0, 600); delay(250);
  ledcWriteTone(0, 0);
#endif
}

// =========================================================================
// 5. WI-FI CONNECTION HANDLER
// =========================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    return;
  }
  
  wifiReady = false;
  showLCD("Connecting WiFi", WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start < 15000)) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    Serial.print("WiFi Connected! IP: ");
    Serial.println(WiFi.localIP());
    showLCD("WiFi Connected", WiFi.localIP().toString().c_str());
    delay(1200);
  } else {
    Serial.println("WiFi Connection Failed.");
    showLCD("WiFi Failed", "Retrying...");
    beepError();
  }
}

// =========================================================================
// 6. RFID UID PARSER
// =========================================================================
String readUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// Build student/teacher full name from JSON response
String buildName(JsonObject data, const char* type) {
  String fname = "";
  String lname = "";

  if (strcmp(type, "student") == 0) {
    fname = data["stu_fname"] | "";
    lname = data["stu_lname"] | "";
  } else {
    fname = data["tch_fname"] | "";
    lname = data["tch_lname"] | "";
  }

  String fullName = fname + " " + lname;
  fullName.trim();
  return fullName.length() == 0 ? "User" : fullName;
}

// =========================================================================
// 7. API COMMUNICATION (POST /api/rfid/scan over HTTPS)
// =========================================================================
void sendScan(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (!wifiReady) return;
  }

  // Use WiFiClientSecure with setInsecure() for HTTPS connection
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, SCAN_URL);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);

  // Build JSON Payload
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument body;
#else
  StaticJsonDocument<128> body;
#endif

  body["rfid_uid"] = uid;
  String payload;
  serializeJson(body, payload);

  int httpCode = http.POST(payload);
  Serial.printf("[HTTP] POST %s -> Code %d\n", SCAN_URL, httpCode);

  if (httpCode <= 0) {
    showLCD("Cloud Error", "Cannot connect");
    Serial.printf("[HTTP] Connection failed: %s\n", http.errorToString(httpCode).c_str());
    beepError();
    http.end();
    return;
  }

  if (httpCode == 401) {
    showLCD("Token Rejected", "Check Env Token");
    beepError();
    http.end();
    return;
  }

  if (httpCode == 429) {
    showLCD("Rate Limited", "Wait a moment");
    beepError();
    http.end();
    return;
  }

  if (httpCode != 200) {
    showLCD("Server Error", ("HTTP " + String(httpCode)).c_str());
    beepError();
    http.end();
    return;
  }

  String response = http.getString();
  http.end();
  Serial.println(response);

  // Parse JSON response
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<1024> doc;
#endif

  DeserializationError err = deserializeJson(doc, response);
  if (err) {
    showLCD("JSON Error", "Parse failed");
    beepError();
    return;
  }

  bool success = doc["success"] | false;

  // ── CASE 1: UNKNOWN CARD (Ready for Admin enrollment) ─────────────────
  if (!success) {
    showLCD("UNKNOWN CARD", "Add via web UI");
    beepError();
    return;
  }

  const char* type   = doc["type"]   | "unknown";
  const char* action = doc["action"] | "";

  // ── CASE 2: TEACHER TAP (Session Opened / Attendance Recorded) ─────────
  if (strcmp(action, "session_started") == 0) {
    JsonObject data = doc["data"];
    String name = lcdTruncate(buildName(data, "teacher"));

    JsonObject session = doc["session"];
    const char* subj = session["subj_name"] | "";
    
    if (strlen(subj) > 0) {
      showLCD(lcdTruncate(String(subj)).c_str(), name.c_str());
    } else {
      showLCD("SESSION OPEN", name.c_str());
    }
    beepSuccess();
    return;
  }

  // ── CASE 3: STUDENT TAP (Attendance Recorded) ─────────────────────────
  if (strcmp(action, "attendance") == 0) {
    JsonObject data = doc["data"];
    String name = lcdTruncate(buildName(data, "student"));

    JsonObject att     = doc["attendance"];
    bool       already = att["already_checked_in"] | false;
    bool       noClass = att["non_school_day"] | false;
    const char* status = att["status"] | "present";

    String line1;
    if (noClass) {
      line1 = "NO CLASS TODAY";
    } else if (already) {
      line1 = "ALREADY RECORDED";
    } else if (strcmp(status, "late") == 0) {
      line1 = "LATE";
    } else {
      line1 = "PRESENT";
    }

    showLCD(lcdTruncate(line1).c_str(), name.c_str());
    beepSuccess();
    return;
  }
}

// =========================================================================
// 8. SETUP & INITIALIZATION
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(100);

  // Initialize Buzzer PWM
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcAttach(BUZZER_PIN, 2000, 8);
#else
  ledcSetup(0, 2000, 8);
  ledcAttachPin(BUZZER_PIN, 0);
#endif

  // Initialize I2C & LCD
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  lcd.init();
  lcd.backlight();
  showLCD("IoClass Reader", "Starting up...");

  // Initialize SPI & RC522 RFID
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN);
  rfid.PCD_Init();

  // Connect to Wi-Fi
  connectWiFi();

  showLCD("Ready", "Tap your card");
  Serial.println(">> IoClass ESP32 Ready (Cloud HTTPS) <<");
}

// =========================================================================
// 9. MAIN LOOP
// =========================================================================
void loop() {
  // Prevent rapid duplicate scans
  if (millis() - lastScan < SCAN_COOLDOWN) return;

  // Look for new RFID card
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  lastScan = millis();
  String uid = readUID();
  Serial.print("Tapped UID: ");
  Serial.println(uid);

  showLCD("Scanning...", uid.c_str());

  // Send UID to Laravel Cloud API
  sendScan(uid);

  // Halt card to prepare for next read
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  delay(1800);
  lastScan = millis();
  showLCD("Ready", "Tap your card");
}
