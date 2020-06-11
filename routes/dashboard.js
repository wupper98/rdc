const db = require("../services/database")
const path = require('path')
const express = require('express')
const request = require('request')
var async = require("async");
const passport = require('passport')
const bodyparser = require('body-parser')
const session = require('express-session')
const GoogleStrategy = require('passport-google-oauth20').Strategy
require('dotenv').config()
var router = express.Router();
const HTTP_OK = 200;

const OWM_URL_1 = 'https://api.openweathermap.org/data/2.5/onecall?'
const OWM_URL_2 = '&appid=' + process.env.OWM_KEY;

function KelvinToCelcius(k) {
	return (parseFloat(k) - 272.15).toPrecision(2);
}

router.get('/campo*', (req, res) => {

	var umail = req.user.emails[0].value;
	// prendo l'ultima parte dell'url per capire quale campo vuole vedere l'utente
	var campo = req.originalUrl.split('/')[2];

	db.getInfoCampo(umail, campo).then((infoCampo)=>{

		// mi prendo tutti i sensori del campo
		db.getNomeSensoriFromCampoUtente(umail, campo).then((sensors) => {
			var lat = infoCampo[1].replace(',', '.')
			var lon = infoCampo[2].replace(',', '.')
	
			var url = OWM_URL_1 + 'lat=' + lat
			+ '&lon=' + lon + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2
	
			request(url, function (error, response, body) {
				if (!error && response.statusCode == HTTP_OK) {
					var info = JSON.parse(body).daily[0];
					var main = info.temp;
					var weather = info.weather[0].description;

					console.log(sensors);
	
					res.render('dashboard.ejs', {
						utente: umail,
						lat: lat,
						lon: lon,
						weather: weather,
						temp: KelvinToCelcius(main.day),
						feels_like: KelvinToCelcius(info.feels_like.day),
						min: KelvinToCelcius(main.min),
						max: KelvinToCelcius(main.max),
						pressure: info.pressure,
						humidity: info.humidity,
						port: process.env.PORT,
						nomecampo: infoCampo[0],
						idcampo: campo,
						sensori: sensors
					});
				}
				else {
					res.render("404notfound.ejs", {port: process.env.PORT});
				}
			});
		}).catch((err) => {
			console.log(err);
		});
	}).catch((err)=>{
		console.log(err);
	});
});

/*function addUserWithProm(umail){
	return new Promise( async function(resolve, reject){
		await db.createUser(umail);
		resolve()
	});
}

function addCampoWithProm(umail, nome, lat, lon){
	return new Promise( async function(resolve, reject){
		await db.createCampo(umail, nome, lat, lon);
		resolve()
	});
}*/

router.post('/', async (req, res) => {
	var umail = req.user.emails[0].value;
	var nome = req.body.nome;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;

	db.createUser(umail).then(function() {
		console.log("Utente aggiunto al database: "+ email);
	}).catch((err) => {
		console.log("Utente già registrato: "+ email);
	}).finally((err) => {
		db.createCampo(umail, nome, latitude, longitude).then((resprom) => {
			res.redirect("/");
		})	
	});

});

router.post('/addSensore', (req, res) => {
	var umail = req.user.emails[0].value;
	sensorName = req.body.sensorName;
	campoID = req.body.campoID;

	db.createSensore(umail, campoID, sensorName ).then ((x) => {
		res.redirect("/dashboard/"+campoID);
	});
});

router.get('/getRilevazioni/*',  (req, res) => {
	var sensorID = req.originalUrl.split('/')[3];

	// non riesco a prendere le rilevazioni
	// magari in un formato sarebbero carine

	db.getRilevazioniFromSensorID(sensorID).then(async (rilevazioni) => {
		
		new Promise( function(resolve, reject){
			var values = {
				"data":[]
			};
			for( i = 0; i < rilevazioni.length; i++ ){
				values.data.push({
					//x: new Date(rilevazioni[i][0]),
					x: parseInt(i),
					y: parseFloat(rilevazioni[i][1])
				})
			}
			console.log(values);
			resolve(values);
		}).then( (values) => {
			res.send(values);
		}).catch( (err) => {
			console.log(err);
		});	
	}).catch((err) => {
		console.log(err)
	});

});

function getTimeStamp() {
	let ts = Date.now();

	let date_ob = new Date(ts);
	let date = date_ob.getDate();
	let month = date_ob.getMonth() + 1;
	let year = date_ob.getFullYear();
	let hour = date_ob.getHours();
	let minute = date_ob.getMinutes();
	let seconds = date_ob.getSeconds();

	console.log(year + "-" + month + "-" + date + "-" + hour + ":" +
		minute + ":" + seconds);
	var timestamp = year + "-" + month + "-" + date + "-" + hour + ":" +
	minute + ":" + seconds;
	return timestamp;
}

router.get("/prova", (req, res) => {
	db.createRilevazione("aandreani1998@gmail.com", "campo1", "aandreani1998@gmail.com_campo1_1", (0.64).toString(), getTimeStamp());
})

module.exports = router;