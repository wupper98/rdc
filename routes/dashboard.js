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

router.get('/', (req, res) => {

    var latitude = "0";
	var longitude = "0";
	var umail = req.user.emails[0].value;
	
	//createCampo(umail, latitude, longitude);
	//createSensore(umail, "campo1", "ID123883", "nomesensore");
	//createRilevazione(umail, "campo1", "ID123883", "1.3", "2019-02-20");
	
	
	var url = OWM_URL_1 + 'lat=' + latitude
	+ '&lon=' + longitude + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2
	request(url, function (error, response, body) {
		if (!error && response.statusCode == HTTP_OK) {
			var info = JSON.parse(body).daily[0];
			var main = info.temp;
			var weather = info.weather[0].description;
			
			res.render('dashboard.ejs', {
				lat: latitude,
				lon: longitude,
				weather: weather,
				temp: KelvinToCelcius(main.day),
				feels_like: KelvinToCelcius(info.feels_like.day),
				min: KelvinToCelcius(main.min),
				max: KelvinToCelcius(main.max),
				pressure: info.pressure,
				humidity: info.humidity,
				port: process.env.PORT
			});
			
        }
        else {
            res.render("404notfound.ejs", {port: process.env.PORT});
        }
    });
});

router.post('/', (req, res) => {
	var umail = req.user.emails[0].value;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	db.createUser(umail);
	db.createCampo(umail, latitude, longitude);
    res.send("hahaha");
})

module.exports = router;