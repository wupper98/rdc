#!/usr/bin/env node
const mqtt = require('mqtt')
var temporal = require('temporal')
var client =  mqtt.connect('mqtt://broker.hivemq.com');

// Sensor publishes on sensor/state; sensor/moisture; sensor/connected
// Sensor subscribes to sensor/sendUpdate


/*
 * Sensor status: high(0), mid(1), low(2), critical(3). Default: high
 * Moisture level: random number between 0 and 1
*/
var state = 'high'
var moistureLVL = '0.6'

client.on('connect', () => {
  client.subscribe('sensor/sendUpdate'); // Coda da cui ricevere il comando

  client.publish('sensor/connected', 'true');
  sendStateUpdate();
  sendMoistureUpdate();
})

client.on('message', (topic, message) => {
  console.log('received message %s', message);
  switch (message) {
    case 'state':
      sendStateUpdate();
      break;
    case 'moisture':
      sendMoistureUpdate();
      break;
  }
})

function sendStateUpdate() {
  console.log("[+] Sent state %s", state);
  client.publish('sensor/state', state);
}

function sendMoistureUpdate() {
  console.log("[+] Sent moisture level %s", moistureLVL);
  client.publish('sensor/moisture', moistureLVL);
}

/**
 * Want to notify controller that garage is disconnected before shutting down
 */
function handleAppExit (options, err) {
  if (err) {
    console.log(err.stack)
  }

  if (options.cleanup) {
    client.publish('sensor/connected', 'false')
  }

  if (options.exit) {
    process.exit()
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