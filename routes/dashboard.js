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

	// prendo l'ultima parte dell'url per capire quale campo vuole vedere l'utente
	var campo = req.originalUrl.split('/')[2];

    var latitude = "0";
	var longitude = "0";
	var umail = req.user.emails[0].value;	
	
	var url = OWM_URL_1 + 'lat=' + latitude
	+ '&lon=' + longitude + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2
	request(url, function (error, response, body) {
		if (!error && response.statusCode == HTTP_OK) {
			var info = JSON.parse(body).daily[0];
			var main = info.temp;
			var weather = info.weather[0].description;

			db.getCampiFromUtente(umail).then((campi) => {
				res.render('dashboard.ejs', {
					utente: umail,
					lat: latitude,
					lon: longitude,
					weather: weather,
					temp: KelvinToCelcius(main.day),
					feels_like: KelvinToCelcius(info.feels_like.day),
					min: KelvinToCelcius(main.min),
					max: KelvinToCelcius(main.max),
					pressure: info.pressure,
					humidity: info.humidity,
					port: process.env.PORT,
					nomecampo: campi[0]
				});
			}).catch((err) => {
				console.log(err);
			});
        }
        else {
            res.render("404notfound.ejs", {port: process.env.PORT});
        }
    });
});

router.post('/', async (req, res) => {
	var umail = req.user.emails[0].value;
	var nome = req.body.nome;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	await db.createUser(umail);
	await db.createCampo(umail, nome, latitude, longitude);
	// una volta aggiunto un campo eseguo la redirect sulla dashboard
    res.redirect("/")
})

router.post('/addSensore', async (req, res) => {
	var umail = req.user.emails[0].value;
	sensorID = req.body.sensorID;
	campoID = req.body.campoID;
	await db.createSensore(umail, campoID, sensorID, "s1");
	res.redirect("/dashboard/campoID");
});

module.exports = router;