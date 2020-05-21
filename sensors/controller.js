#!/usr/bin/env node
const mqtt = require('mqtt')
const client = mqtt.connect('mqtt://broker.hivemq.com')

var sensorState = ''
var moistureLVL = ''
var connected = false

client.on('connect', () => {
    client.subscribe('sensor/connected');
    client.subscribe('sensor/state');
    client.subscribe('sensor/moisture');
})

client.on('message', (topic, message) => {
    switch(topic) {
        case 'sensor/connected':
            handleSensorConnected(message);
            break;
        case 'sensor/state':
            handleSensorState(message);
            break;
        case 'sensor/moisture':
            handleSensorMoisture(message);
            break;
        default:
            console.log("[!] No handler for this topic");
    }
})

// Handler dei messaggi
function handleSensorConnected(message) {
    console.log("Sensor connected %s", message);
    connected = (message.toString() == 'true');
}

function handleSensorState(message) {
    console.log("Sensor state %s", message);
    sensorState = message;
}

function handleSensorMoisture(message) {
    console.log("Moisture level: %s", message);
    moistureLVL = message;
}

// Chiede al sensore un update del suo stato
function askStateUpdate(){
    if(connected) client.publish('sensor/sendUpdate', 'state');
}

// Chiede al sensore un update sulla moisture del terreno
function askMoistureUpdate() {
    if(connected) client.publish('sensor/sendUpdate', 'moisture');
}