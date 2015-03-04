#include "FastLED.h"
#include <WunderbarBridge.h>


#define PUMP_PIN 7
  
#define NUM_LEDS 37  	
#define DATA_PIN 8
#define CLOCK_PIN 9
CRGB leds[NUM_LEDS];

int fade = 1; //minutes

   int cred; //current red
   int cgreen;
   int cblue;
   int targetred; //red after fade
   int targetgreen;
   int targetblue;
   int oldred; //red before fade
   int oldgreen;
   int oldblue;
   int deltared; //difference before and after fade
   int deltagreen;
   int deltablue;

unsigned long start;
unsigned long current;
unsigned long whole; 

Bridge bridge = Bridge(115200);

static bridge_payload_t rxPayload;
static uint8_t dataout[1];
  
void setup() {	  
  
  FastLED.addLeds<WS2801, DATA_PIN, CLOCK_PIN, RGB>(leds, NUM_LEDS);
  cred = 0; cblue = 0; cgreen = 0;
  oldred = 0; oldblue = 0; oldgreen = 0;
  ledUpdate();
  start = millis();

  
  pinMode(PUMP_PIN, OUTPUT);

  if(bridge.begin())
  Serial.print("Bridge Connected\n");
  else
  Serial.print("Bridge Not Connected\n");
  
  //Change the port for debugging, default is Serial0 (one used for serial monitor)
  //bridge.setDebugPort(0);
  //Change the Serial port of the bridge connection, default is Serial1
  //bridge.setBridgePort(2);
}
  
/* Main Loop */
void loop() {
  //when we receive new data from the cloud on the down channel
  if (bridge.newData){		
    Serial.println("Data Received!\n");  
    rxPayload = bridge.getData();
    
    if(rxPayload.payload[0] == 0) {
      
      
      pump(rxPayload.payload[1], rxPayload.payload[2]);
      
    } else if(rxPayload.payload[0] == 1) {
    
      ledFade(rxPayload.payload[1], rxPayload.payload[2], rxPayload.payload[3]); 
    }
    
   
  }
  
  //On receiving data from the Serial monitor, send it to the cloud
  if(Serial.available())
  {
     char c = Serial.read();
     dataout[0] = c;
     bridge.sendData(dataout,sizeof(dataout));
  }
  
  //Updates the bridge module with the data it receives on the UART
  if(Serial1.available())
  {
     bridge.processSerial();
  }
}


void pump(int minutes, int seconds) {
  
  long duration = (minutes * 60000) + (seconds * 1000); 
  
  digitalWrite(PUMP_PIN, HIGH);
  delay(duration);
  digitalWrite(PUMP_PIN, LOW);
  
}


void ledFade(int r, int g, int b) {
  
  
  targetred = r;
  targetgreen = g;
  targetblue = b;
  
//  start = millis();
//  whole = fade * 10000 + start; //fade time in milliseconds
//  deltared = targetred - oldred; deltagreen = targetgreen - oldgreen; deltablue = targetblue - oldblue;
// 
//  while( cred <= targetred || cgreen <= targetgreen || cblue <= targetblue) {
//  
//    Serial.println("fade");
//      
//
//    if (cred <= targetred && millis() <= whole){
//    current = millis();
//    cred = current * deltared / whole;
//    cred = cred + oldred;} else { break;}
//
//    if (cgreen <= targetgreen && millis() <= whole){
//    current = millis();
//    cgreen = current * deltagreen / whole;
//    cgreen = cgreen + oldgreen;}
//
//    if (cblue <= targetblue && millis() <= whole){
//    current = millis();
//    cblue = current * deltablue / whole;
//    cblue = cblue + oldblue;}
//    
//    ledUpdate();
//    
//    Serial.print("red: ");
//    Serial.print(cred);
//    Serial.print(" ");
//    Serial.print(targetred);
//  }

  cred = r;
  cgreen = g;
  cblue = b;
  ledUpdate();

}


void ledUpdate(){
   for (int i = 0; i <= NUM_LEDS; i++){
    leds[i] = CRGB (cred, cgreen, cblue);
    FastLED.show();
    
    Serial.println("color:");
}};
