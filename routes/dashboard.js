const db = require("../services/database")
const path = require('path')
const sensorSim = require("../services/sensorSim");
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

			console.log(sensors);
			
			// CHIAMATA API LEAFLET
			var url = OWM_URL_1 + 'lat=' + lat
			+ '&lon=' + lon + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2
	
			request(url, function (error, response, body) {
				if (!error && response.statusCode == HTTP_OK) {
					var info = JSON.parse(body).daily[0];
					var main = info.temp;
					var weather = info.weather[0].description;

					//console.log(sensors);
	
					db.getUserData(req.user.emails[0].value).then((x) => {
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
							sensori: sensors,
							token: x.data().token
						});
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

// Consente la creazione di un campo
router.post('/', async (req, res) => {
	var umail = req.user.emails[0].value;
	var nome = req.body.nome;
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;

	if( nome == "" || latitude == "" || longitude == "" ){
		res.send("[ERR] Impossibile creare il campo. Inserisci tutti i valori e riprova");
	}
	else{
		db.createUser(umail).then(function(x) {
			console.log("Utente aggiunto al database: "+ umail);
			return db.createAPIToken(umail);
		}).catch((err) => {
			console.log("Utente già registrato: "+ umail);
		}).then((x) => {
			console.log("API Token creato!" + x.id); 
			return db.setUserToken(umail, x.id);		
		}).catch((x) => { console.log("Problema nella creazione dell'API Token.")})
		.then((x) => console.log("Token settato all'utente"))
		.catch((x)=> console.log("Token non settato all'utente"))
		.finally((err) => {
			db.createCampo(umail, nome, latitude, longitude).then((resprom) => {
				res.redirect("/");
			})	
		});
	}
});

// Creazione di un sensore
router.post('/addSensore', (req, res) => {
	var umail = req.user.emails[0].value;
	sensorName = req.body.sensorName;
	campoID = req.body.campoID;

	if(sensorName.length == 0 ){
		res.send("[ERR] Impossibile aggiungere un sensore senza nome.");
	}
	else{
		db.createSensore(umail, campoID, sensorName ).then ((id) => {
			sensorSim.initSensore(id); // Avvia la simulazione del sensore appena aggiunto dall'utente (test più facile)
			res.redirect("/dashboard/"+campoID);
		});
	}
});

// Ottiene le rilevazioni relative ad un sensore per costruire il grafico mostrato nella dashboard
router.get('/getRilevazioni/*',  (req, res) => {
	var sensorID = req.originalUrl.split('/')[3];

	db.getRilevazioniFromSensorID(sensorID).then(async (rilevazioni) => {
		
		new Promise( function(resolve, reject){
			var values = {
				"data":[]
			};
			//console.log(rilevazioni);

			for( i = 0; i < rilevazioni.length; i++ ){
				values.data.push({
					x: rilevazioni[i][0],
					y: parseFloat(rilevazioni[i][1])
				})
			}
			//console.log(values);
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

router.get('/delete/sensore/*', (req, res) => {
	var sensore = req.originalUrl.split('/')[4];
	var params = sensore.split('_');
	var umail = params[0];
	var campoID = params[1];

	db.deleteSensore(umail, campoID, sensore).then(()=>{
		res.redirect('/dashboard/' + campoID);
	});
});

router.get('/delete/campo/*', (req, res) => {
	var campoID = req.originalUrl.split('/')[4];
	var umail = req.user.emails[0].value;

	db.deleteCampo(umail, campoID).then(()=>{
		res.redirect('/');
	});
});

router.get('/refreshAPIToken', (req, res) => {
	db.refreshAPIToken(req.old, req.user.emails[0].value);
	res.redirect('/');
});

module.exports = router;