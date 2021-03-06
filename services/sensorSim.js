#!/usr/bin/env node
const mqtt = require('mqtt')
var temporal = require('temporal')
var client;
var baseDir = require('app-root-path');

var sensorID;
var sendUpdateQueueName;
var stateQueueName;
var moistureQueueName;
var connectQueueName;

// Sensor publishes on sensorID/state; sensorID/moisture; sensor/connected
// Sensor subscribes to sensorID/sendUpdate
// Le code sensorID sono esclusive per il sensore con id sensorID
// sensor/connected invece è una coda generica sulla quale il sensore comunica
// il suo id al controller per far creare le code necessarie


/*
* Sensor status: high(0), mid(1), low(2), critical(3). Default: high
* Moisture level: random number between 0 and 1
*/
var state = 'high'
var moistureLVL = '0.6'

// avvia la simulazione del sensore
module.exports.initSensore = (sID) => {
  sensorID = sID;
  client =  mqtt.connect('mqtt://broker.hivemq.com');

  client.on('connect', () => {
    sendUpdateQueueName = sensorID + "/sendUpdate";
    stateQueueName = sensorID + "/state";
    moistureQueueName = sensorID + "/moisture"
    connectQueueName = "sensor/connected";
    client.subscribe(sendUpdateQueueName); // Coda da cui ricevere richieste
    
    client.publish(connectQueueName, sensorID);
  });
  
  client.on('message', (topic, message) => {
    console.log('[+] Ricevuto: %s', message);
    switch (message) {
      case 'start':
        sendStateUpdate();
        sendMoistureUpdate();
        break;
        case 'state':
          sendStateUpdate();
          break;
          case 'moisture':
            sendMoistureUpdate();
            break;
            case 'all':
              sendStateUpdate();
        sendMoistureUpdate();
        break;
    }
  });
  loop();
}

function sendStateUpdate() {
  console.log("[+] Sent state %s", state);
  client.publish(stateQueueName, state);
}

function sendMoistureUpdate() {
  console.log("[+] Sent moisture level %s", moistureLVL);
  client.publish(moistureQueueName, moistureLVL);
}

function handleAppExit (options, err) {
  if (err) {
    console.log(err.stack);
  }

  if (options.exit) {
    process.exit();
  }
}

/**
 * Handle the different ways an application can shutdown
 */
process.on('exit', handleAppExit.bind(null, {
  cleanup: true
}))
process.on('SIGINT', handleAppExit.bind(null, {
  exit: true
}))
process.on('uncaughtException', handleAppExit.bind(null, {
  exit: true
}))


// Simulazione misurazione ogni 5 secondi

function loop() {
  temporal.loop(5000, function() {
    moistureLVL = Math.random().toFixed(2);
    switch (Math.round(Math.random() * 4 - 1)) {
      case 0:
        state = 'high';
        break;
      case 1:
        state = 'mid';
        break;
      case 2:
        state = 'low';
        break;
      case 3:
        state = 'critical';
        break;
    }
    sendStateUpdate();  
    sendMoistureUpdate();
  })
}