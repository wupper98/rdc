const db = require("../services/database")
const path = require('path')
const express = require('express')
const request = require('request')
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

function addUserWithProm(umail){
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
}

router.post('/', async (req, res) => {
	var umail = req.user.emails[0].value;
	var nome = req.body.nome;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	addUserWithProm(umail).then(()=>{
		addCampoWithProm(umail, nome, latitude, longitude).then(()=>{
			// una volta aggiunto un campo eseguo la redirect sulla home
			setTimeout( function(){
				res.redirect("/");
			},1000);
		})
	})
});

router.post('/addSensore', async (req, res) => {
	var umail = req.user.emails[0].value;
	sensorName = req.body.sensorName;
	campoID = req.body.campoID;
	await db.createSensore(umail, campoID, sensorName );
	res.redirect("/dashboard/"+campoID);
});

module.exports = router;