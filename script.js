#include <WiFi.h>
#include <HTTPClient.h>

#define LED_VERDE 25
#define LED_AMARILLO 26
#define LED_ROJO 27
#define BUZZER 33
#define SENSOR_HUMEDAD_SUELO 34

const char* ssid = "dlink_DWR-932C_7589";
const char* password = "tPYzK57338";

float lastTemp = 20.0;  // Valor fijo para temperatura
float lastHumedad = 75.0;  // Valor fijo para humedad ambiente
uint16_t lastLuz = 1000;  // Valor fijo para luz
int lastHumSuelo = 50;  // Valor fijo para humedad de suelo

unsigned long lastRead = 0;
const int intervaloLectura = 2000;

unsigned long buzzerStart = 0;
bool buzzerActivo = false;

void setup() {
  Serial.begin(115200);
  Serial.println("Iniciando ESP32...");

  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(1000);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConectado a WiFi");
    Serial.print("Direccion IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nNo se pudo conectar a WiFi");
  }
}

void loop() {
  reconectarWiFi();
  manejarBuzzer();

  if (millis() - lastRead >= intervaloLectura) {
    lastRead = millis();
    enviarDatosHTTP(lastTemp, lastHumedad, lastLuz, lastHumSuelo);
    actualizar_LEDs();
    imprimirDatos();
  }
}

void reconectarWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Reconectando a WiFi...");
    WiFi.disconnect();
    WiFi.reconnect();
  }
}

void imprimirDatos() {
  Serial.print("Temperatura: "); Serial.print(lastTemp); Serial.println(" °C");
  Serial.print("Humedad: "); Serial.print(lastHumedad); Serial.println(" %");
  Serial.print("Luz: "); Serial.print(lastLuz); Serial.println(" Lux");
  Serial.print("Humedad Suelo: "); Serial.print(lastHumSuelo); Serial.println(" %");
}

void actualizar_LEDs() {
  int condiciones_ok = 0;
  if (lastTemp >= 5 && lastTemp <= 25) condiciones_ok++;
  if (lastHumedad >= 70 && lastHumedad < 90) condiciones_ok++;
  if (lastLuz >= 1000 && lastLuz < 50000) condiciones_ok++;
  if (lastHumSuelo >= 30 && lastHumSuelo <= 70) condiciones_ok++;

  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, LOW);
  noTone(BUZZER);

  if (condiciones_ok == 4) {
    Serial.println("Condiciones ideales: LED Verde ENCENDIDO");
    digitalWrite(LED_VERDE, HIGH);
  } else if (condiciones_ok == 3) {
    Serial.println("Condiciones moderadas: LED Amarillo ENCENDIDO");
    digitalWrite(LED_AMARILLO, HIGH);
  } else {
    Serial.println("Condiciones críticas: LED Rojo ENCENDIDO + Buzzer ACTIVADO");
    digitalWrite(LED_ROJO, HIGH);
    activarBuzzer(500);
  }
}

void activarBuzzer(int tiempo) {
  tone(BUZZER, 1000);
  buzzerStart = millis();
  buzzerActivo = true;
}

void manejarBuzzer() {
  if (buzzerActivo && millis() - buzzerStart >= 500) {
    noTone(BUZZER);
    buzzerActivo = false;
  }
}

void enviarDatosHTTP(float temperatura, float humedad, uint16_t luz, int humedadSuelo) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = "https://iafa-nwz4.onrender.com/datos";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    String json = "{";
    json += "\"temperatura\":" + String(temperatura, 2) + ",";
    json += "\"humedad\":" + String(humedad, 2) + ",";
    json += "\"luz\":" + String(luz) + ",";
    json += "\"humedad_suelo\":" + String(humedadSuelo);
    json += "}";

    int httpResponseCode = http.POST(json);
    if (httpResponseCode > 0) {
      Serial.println("Datos enviados correctamente");
    } else {
      Serial.printf("Error al enviar datos: %d\n", httpResponseCode);
    }

    http.end();
  } else {
    Serial.println("WiFi desconectado");
  }
}
