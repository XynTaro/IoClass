#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// =========================================================================
// 1. NETWORK & API CONFIGURATION
// =========================================================================
// IMPORTANT: ESP32 only supports 2.4 GHz Wi-Fi!
// - If using phone hotspot (iPhone): Turn ON "Maximize Compatibility".
// - If using Android hotspot: Set AP Band to "2.4 GHz Band".
const char* WIFI_SSID        = "IoClass";   // Change to your hotspot/Wi-Fi name (e.g. "Okieee")
const char* WIFI_PASS        = "11111111";  // Must match your Wi-Fi password

// Production Laravel Cloud API Endpoint (HTTPS)
const char* SCAN_URL         = "https://ioclass-production-1n8wom.laravel.cloud/api/rfid/scan";

// Must match RFID_DEVICE_TOKEN or be included in RFID_DEVICE_TOKENS in Laravel settings
const char* DEVICE_TOKEN     = "esp32-room-b";

const unsigned long HTTP_TIMEOUT_MS = 15000; // 15s timeout for cloud SSL roundtrip
const unsigned long SCAN_COOLDOWN   = 2500;  // ms between scans to prevent duplicate taps

// =========================================================================
// 2. PIN DEFINITIONS
// =========================================================================
// RFID RC522 (SPI)
#define RFID_SS_PIN   5
#define RFID_RST_PIN  16   // Note: If using ESP32-WROVER (PSRAM enabled), change to pin 27 or 4
#define RFID_SCK_PIN  18
#define RFID_MISO_PIN 19
#define RFID_MOSI_PIN 23

// I2C LCD 1602 (Default address 0x27 or 0x3F)
#define I2C_SDA_PIN   21
#define I2C_SCL_PIN   22

// Buzzer (Passive or Active)
#define BUZZER_PIN    4

// =========================================================================
// 3. HARDWARE INSTANCES
// =========================================================================
MFRC522 rfid(RFID_SS_PIN, RFID_RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); // Change 0x27 to 0x3F if your LCD shows solid white boxes

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

// Stop PWM cleanly so buzzer never gets stuck on in ESP32 Core 2.x or 3.x
void stopBuzzer() {
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcWriteTone(BUZZER_PIN, 0);
  ledcWrite(BUZZER_PIN, 0);
#else
  ledcWriteTone(0, 0);
  ledcWrite(0, 0);
#endif
}

void playTone(int freq, int durationMs) {
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcWriteTone(BUZZER_PIN, freq);
#else
  ledcWriteTone(0, freq);
#endif
  delay(durationMs);
  stopBuzzer();
}

// Tap In / Session Success: Rising pitch
void beepSuccess() {
  playTone(2800, 100);
  delay(30);
  playTone(3500, 120);
}

// Tap Out / Goodbye: Falling pitch
void beepTapOut() {
  playTone(3500, 100);
  delay(30);
  playTone(2800, 120);
}

// Notice / Cooldown: Single neutral tone
void beepNotice() {
  playTone(2000, 90);
}

// Error tone: Double low buzz
void beepError() {
  playTone(600, 220);
  delay(80);
  playTone(600, 220);
}

// =========================================================================
// 5. WI-FI CONNECTION HANDLER (WITH DEEP DIAGNOSTICS)
// =========================================================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    return;
  }
  
  wifiReady = false;
  showLCD("Connecting WiFi", lcdTruncate(String(WIFI_SSID)).c_str());
  Serial.printf("\n[WiFi] Attempting connection to SSID: \"%s\" ...\n", WIFI_SSID);

  // Set station mode and begin
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start < 12000)) {
    delay(400);
    yield(); // Feeds the FreeRTOS watchdog timer
    Serial.print(".");
  }
  Serial.println();

  // 3. Evaluate result
  if (WiFi.status() == WL_CONNECTED) {
    wifiReady = true;
    Serial.print("[WiFi] Connected successfully! IP: ");
    Serial.println(WiFi.localIP());
    showLCD("WiFi Connected", WiFi.localIP().toString().c_str());
    delay(1500);
  } else {
    int st = WiFi.status();
    Serial.printf("[WiFi] FAILED! Status code: %d\n", st);

    switch (st) {
      case WL_NO_SSID_AVAIL:
        Serial.println(" -> REASON: SSID Not Found!");
        Serial.println("    1. Ensure phone hotspot is turned ON.");
        Serial.println("    2. If iPhone: Turn ON \"Maximize Compatibility\" (Forces 2.4 GHz).");
        Serial.println("    3. If Android: Set Hotspot AP Band to \"2.4 GHz\".");
        Serial.println("    4. Check for typos or capitalization in WIFI_SSID.");
        showLCD("WiFi Failed", "SSID Not Found");
        break;
      case WL_CONNECT_FAILED:
        Serial.println(" -> REASON: Connection Failed! Check WIFI_PASS password.");
        showLCD("WiFi Failed", "Wrong Password");
        break;
      case WL_DISCONNECTED:
        Serial.println(" -> REASON: Disconnected or Auth Timeout.");
        showLCD("WiFi Failed", "Auth Timeout");
        break;
      default:
        Serial.println(" -> REASON: Radio Timeout.");
        showLCD("WiFi Failed", "Retrying...");
        break;
    }
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
    if (!wifiReady) {
      showLCD("No Connection", "Check WiFi");
      beepError();
      return;
    }
  }

  // Use WiFiClientSecure with setInsecure() for HTTPS connection
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.begin(client, SCAN_URL);
  http.setUserAgent("ESP32-IoClass-Reader");
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
    Serial.println("[HTTP] 401 Unauthorized: DEVICE_TOKEN does not match Laravel .env");
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
  Serial.println("[HTTP Response] " + response);

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

  const char* action = doc["action"] | "";
  JsonObject  data   = doc["data"];

  // ── CASE 2: TEACHER TAP (Session Opened / Attendance Recorded) ─────────
  if (strcmp(action, "session_started") == 0) {
    String name = lcdTruncate(buildName(data, "teacher"));

    JsonObject session = doc["session"];
    const char* subj   = session["subj_name"] | "";
    
    if (strlen(subj) > 0) {
      showLCD(lcdTruncate(String(subj)).c_str(), name.c_str());
    } else {
      showLCD("SESSION OPEN", name.c_str());
    }
    beepSuccess();
    return;
  }

  // ── CASE 3: STUDENT TAP OUT (Time Out Recorded) ───────────────────────
  if (strcmp(action, "time_out") == 0) {
    String name = lcdTruncate(buildName(data, "student"));
    showLCD("TIME OUT / BYE", name.c_str());
    beepTapOut();
    return;
  }

  // ── CASE 4: STUDENT TAP IN & ATTENDANCE STATES ────────────────────────
  if (strcmp(action, "attendance") == 0) {
    String name = lcdTruncate(buildName(data, "student"));

    JsonObject att        = doc["attendance"];
    const char* attAction = att["action"] | "";
    bool       already    = att["already_checked_in"] | false;
    bool       alreadyOut = att["already_timed_out"] | false;
    bool       noClass    = att["non_school_day"] | false;
    const char* status    = att["status"] | "present";

    String line1;
    if (noClass) {
      line1 = "NO CLASS TODAY";
      beepNotice();
    } else if (alreadyOut) {
      line1 = "ALREADY OUT";
      beepNotice();
    } else if (strcmp(attAction, "cooldown") == 0) {
      line1 = "WAIT TO TAP OUT";
      beepNotice();
    } else if (already) {
      line1 = "ALREADY RECORDED";
      beepNotice();
    } else if (strcmp(status, "late") == 0) {
      line1 = "LATE";
      beepSuccess();
    } else {
      line1 = "PRESENT";
      beepSuccess();
    }

    showLCD(lcdTruncate(line1).c_str(), name.c_str());
    return;
  }
}

// =========================================================================
// 8. SETUP & INITIALIZATION
// =========================================================================
void setup() {
  // Disable brownout detector to prevent reboot loops during Wi-Fi power spikes
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n========================================");
  Serial.println(">> IoClass ESP32 RFID Reader Starting <<");
  Serial.println("========================================");

  // Initialize Buzzer PWM
#if defined(ESP_ARDUINO_VERSION) && ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcAttach(BUZZER_PIN, 2000, 8);
#else
  ledcSetup(0, 2000, 8);
  ledcAttachPin(BUZZER_PIN, 0);
#endif
  stopBuzzer();

  // Initialize I2C & LCD
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  lcd.init(); // Note: If your library uses begin, change to: lcd.begin(16, 2);
  lcd.backlight();
  showLCD("IoClass Reader", "Starting up...");

  // Initialize SPI & RC522 RFID
  SPI.begin(RFID_SCK_PIN, RFID_MISO_PIN, RFID_MOSI_PIN, RFID_SS_PIN);
  rfid.PCD_Init();

  // Hardware Check for RC522
  byte versionReg = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (versionReg == 0x00 || versionReg == 0xFF) {
    Serial.println("[ERROR] RC522 RFID Module NOT responding!");
    Serial.println("  -> Check SPI wiring (SCK=18, MISO=19, MOSI=23, SS=5, RST=16)");
    Serial.println("  -> Check RC522 power (Must be 3.3V, NOT 5V)");
    showLCD("RFID Error", "Check Wiring");
    delay(2000);
  } else {
    Serial.printf("[RFID] RC522 connected! Firmware version: 0x%02X\n", versionReg);
  }

  // Connect to Wi-Fi
  connectWiFi();

  if (wifiReady) {
    showLCD("Ready", "Tap your card");
    Serial.println(">> IoClass ESP32 Ready (Listening for cards) <<");
  } else {
    showLCD("WiFi Failed", "Check Hotspot");
    Serial.println(">> Warning: ESP32 started without active Wi-Fi connection <<");
  }
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
  Serial.print("\n[Card Detected] UID: ");
  Serial.println(uid);

  showLCD("Scanning...", uid.c_str());

  // Send UID to Laravel Cloud API
  sendScan(uid);

  // Halt card to prepare for next read
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Keep result on screen for 2.5 seconds
  delay(2500);
  lastScan = millis();

  if (wifiReady) {
    showLCD("Ready", "Tap your card");
  } else {
    showLCD("WiFi Failed", "Reconnecting...");
  }
}
