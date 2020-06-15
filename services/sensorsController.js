#!/usr/bin/env node
const mqtt = require('mqtt');
const db = require("../services/database");
const calendar = require("../services/calendar");
const client = mqtt.connect('mqtt://broker.hivemq.com');
const manageTokenOauth = require("../services/localTokenOauth");

function getTimeStamp() {
	return Date.now();
}

client.on('connect', () => {
	client.subscribe('sensor/connected');
})

client.on('message', (topic, message) => {
	switch (topic) {
		case 'sensor/connected':
			handleSensorConnected(message);
			break;
		default:
			var sensorID = topic.toString().split("/")[0];
			switch (topic.toString().split("/")[1]) {
				case 'state':
					handleSensorState(message, sensorID);
					break;
				case 'moisture':
					handleSensorMoisture(message, sensorID);
					break;
				default:
					break;
			}
	}
})

// Handler dei messaggi
function handleSensorConnected(message) {
	console.log("[+] Nuovo sensore attivo: %s", message);
	connected = (message.toString() == 'true');
	var sensorID = message.toString();
	var sendUpdateQueueName = sensorID + "/sendUpdate";
	var stateQueueName = sensorID + "/state";
	var moistureQueueName = sensorID + "/moisture"

	client.subscribe(sendUpdateQueueName, function (err, granted) {
		if (err) console.log(err);
		else {
			console.log("Iscritto a %s", sendUpdateQueueName);
			client.subscribe(stateQueueName, function (err1, granted) {
				if (err1) console.log(err1);
				else {
					console.log("Iscritto a %s", stateQueueName);
					client.subscribe(moistureQueueName, function (err2, granted) {
						if (err2) console.log(err2);
						else {
							console.log("Iscritto a %s", moistureQueueName);
							client.publish(sendUpdateQueueName, "start");
						}
					});
				}
			});
		}
	});
}

function handleSensorState(message, sensorID) {
	db.updateStatoSensore(sensorID, message.toString());
	console.log("Sensor %s state %s", sensorID, message);
}

function handleSensorMoisture(message, sensorID) {
	var toParse = sensorID.split("_");
	var email = toParse[0];
	var campo = toParse[1];
	db.createRilevazione(email, campo, sensorID, message.toString(), getTimeStamp());
	console.log("Sensor %s moisture level: %s", sensorID, message);
	// creo evento Google Calendar
	db.getNomeCampiFromUtente(email).then((campi) => {
		for( i = 0; i < campi.length; i++ ){
			if( campi[i][0] == campo ){
				var token = manageTokenOauth.readToken(email);
				var data = new Date().toISOString().toString();
				var moisture = message;
				calendar.aggiungiRilevazione(token, null, null, data, moisture, campi[i][1]);
				console.log("Creato evento su calendar");
			}
		}
	})
}

// Chiede al sensore un update del suo stato
function askStateUpdate(sensorID) {
	client.publish(sensorID + '/sendUpdate', 'state');
}

// Chiede al sensore un update sulla moisture del terreno
function askMoistureUpdate(sensorID) {
	client.publish(sensorID + '/sendUpdate', 'moisture');
}