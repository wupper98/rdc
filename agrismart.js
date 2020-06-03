#!/usr/bin/env node

const path = require('path')
const express = require('express')
const request = require('request')
const passport = require('passport')
const bodyparser = require('body-parser')
const session = require('express-session')
const GoogleStrategy = require('passport-google-oauth20').Strategy

//Per le promise
var Promise = require('promise');

//Per async
var async = require("async");

// Setup per accedere a firebase
var admin = require("firebase-admin");
var serviceAccount = "private/agrismart-c2656-firebase-adminsdk-1en4p-ba81ef792e.json";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://agrismart-c2656.firebaseio.com"
});

// Variabile di accesso al db
let db = admin.firestore();


require('dotenv').config()

const HTTP_OK = 200;
const app = express();
const PORT = process.env.PORT;
var TEST;
switch (process.argv[2]) {
	case 'true':
		TEST = true;
		break;
	case 'false':
		TEST = false;
		break;
}

// Componenti URL openweather
const OWM_URL_1 = 'https://api.openweathermap.org/data/2.5/onecall?'
const OWM_URL_2 = '&appid=' + process.env.OWM_KEY;

// Componenti URL leaflet
const LL_URL_1 = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/';
const LL_URL_2 = ',10,0,45/600x600?access_token=' + process.env.LL_KEY;


app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyparser.urlencoded({ extended: false }));


/***************************/
/*   Add session support   */
/***************************/
app.use(session({
	secret: process.env.SESSION_SECRET || 'default_session_secret',
	resave: false,
	saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((userDataFromCookie, done) => {
	done(null, userDataFromCookie);
});


/***************************/
/*        Functions        */
/***************************/

// Checks if a user is logged in
const accessProtectionMiddleware = (req, res, next) => {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.status(403).render('403forbidden.ejs', {port: PORT});
	}
};

// Set up passport strategy
passport.use(new GoogleStrategy(
	{
		clientID: process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID,
		clientSecret: process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_SECRET,
		callbackURL: 'http://localhost:' + PORT + '/auth/google/callback',
		scope: ['email'],
	}, (accessToken, refreshToken, profile, cb) => {
		if(TEST) console.log('Our user authenticated with Google, and Google sent us back this profile info identifying the authenticated user:', profile);

		return cb(null, profile);
	},
));

function KelvinToCelcius(k) {
	return (parseFloat(k) - 272.15).toPrecision(2);
}

/*************************************/
/*         Database Firebase         */
/*************************************/


/*************************************/
/*         Create User Firebase  	 */
/*************************************/

function createUser(email) { //creo l'utente
	let instance = db.collection("users").doc(email);
	instance.create({}).then(function() {
		if(TEST) console.log("Utente aggiunto al database: "+ email);
		// campicounter serve per tenere traccia dell'indice da dare al campo
		instance.set({
			campicounter: 0
		}).then(function() {
			if(TEST) console.log("[+] campicounter set to 0");
		}).catch(function() {
			if(TEST) console.log("error campicounter set");
		});
	}).catch((err) => {
		if(TEST) console.log("Utente già registrato: "+ email);
	});

	
}

/*************************************/
/*         CreateCampo Firebase         */
/*************************************/

function createCampo(email, lat, lon) { //creo il campo per l'utente e ritorna l'id

	db.collection("users").doc(email).get().then((userInstance) => {
		var cid = parseInt(userInstance.data().campicounter) + 1;
		var nomeCampo = "campo" + cid.toString();
		if(TEST) console.log("Provo a creare" + nomeCampo);

		db.collection("users").doc(email).update({
			"campicounter": cid
		}).then(() => {
			if(TEST) console.log("[+] campicounter aggiornato");
			db.collection("users").doc(email).collection("campi").doc(nomeCampo).set({
				lat: lat,
				lon: lon,
			}).then(function() {
				if(TEST) console.log("Campo "+ nomeCampo +" aggiunto al database dell'utente: "+ email);
				
			}).catch((err) => {
				if(TEST) console.log("Campo già registrato: "+ nomeCampo);
			});
		}).catch((error) => {
			console.log(error);
		});
	});
	
}


/*************************************/
/*         Create Sensore         */
/*************************************/

function createSensore(email, campo, id, name) { //creo il sensore sia nella sua tabella, sia per il rispettivo utente
	db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").doc(id).create({
		name: name,
	}).then(function() {
		if(TEST) console.log("Sensore "+ id +" aggiunto al database dell'utente: "+ email);
		db.collection("sensors").doc(id).create({
			email: email,
			campo: campo,
		}).then(function() {
			if(TEST) console.log("Sensore "+ id +" aggiunto al database dei sensori con riferimento a: "+ email);
		}).catch(function() {
			if(TEST) console.log("Sensore "+ id +" non aggiunto al database dell'utente: "+ email);
		});
	}).catch(function() {
		if(TEST) console.log("Sensore "+ id +" non aggiunto al database dell'utente: "+ email);
	});
	
}

/*************************************/
/*         Create Rilevazione         */
/*************************************/

function createRilevazione(email, campo, sensore, umidita, data) { //creo innaffiamento
	db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").doc(sensore).collection("innaffiamenti").add({
		umidita: umidita,
		data: data,
	}).then(function() {
		if(TEST) console.log("Innaffiamento al sensore "+ sensore +" aggiunto al database dell'utente: "+ email);
	});
}

//Questa funzione restituise i dati che sono presenti nel documento n-esimo_sensore. Per accedere ai dati all'interno
//vedere sul database quali sono, nel nostro caso email e campo, quindi ci si accede (ad esempio email con .email)
//Gestire poi errori nel caso il documento non esista o ci sia un errore (in caso negativo restituisce undefined)


/************************************/
/*         DB - getSensore          */
/************************************/

function getSensoreFromId(id, callback){
	db.collection("sensors").doc(id).get().then((x) => {
		if (!x.exists) {
			if(TEST) console.log('No such document!');
			callback("ERRORE");
		} else {
			if(TEST) console.log('Document data: ', x.data());
			callback(null, x.data(), id);
		}
	});
}



function getRilevazioniFromDocumento(data, id, callback){
	var keys = Array();
	db.collection("users").doc(data.email).collection("campi").doc(data.campo).collection("sensori").doc(id).collection("innaffiamenti").get().then(function(snapshot) {
		snapshot.forEach(function(userSnapshot) {
			keys.push([userSnapshot.data().data, userSnapshot.data().umidita]);
		});
		callback(null, keys);
	});
}

/****************************************/
/*    DB - getRilevazionifromSensordID  */
/****************************************/

function getRilevazioniFromSensorID(id) {
	return new Promise(function(resolve, reject) {
		async.waterfall([
			async.apply(getSensoreFromId, id),
			getRilevazioniFromDocumento,
		], (err, result) => {
			if(err != null) reject(err);
			else resolve(result);
		});
	});
}

/****************************************/
/*         DB - getAllSensori           */
/****************************************/

//Ritorna una lista di ID => Stringhe, da cui si accede al sensore per: getSensoreFromID
function getAllSensori(){
	return new Promise(function(resolve,reject){
		var keys = Array();
	db.collection("sensors").get().then(function(snapshot) {
		snapshot.forEach(function(userSnapshot) {
			keys.push(userSnapshot.id);
		});
		resolve(keys);
	}).catch((y) => reject(y));
	});
}

/****************************************/
/*         DB - getCampiFromUtente      */
/****************************************/

function getCampiFromUtente(email){
	return new Promise(function(resolve,reject){
		var keys = Array();
		db.collection("users").doc(email).collection("campi").get().then(function(snapshot) {
			snapshot.forEach(function(userSnapshot) {
				keys.push(userSnapshot.id);
			});
			resolve(keys);
		}).catch((y) => reject(y));
	});
}

/****************************************/
/*         DB - getSensoriFromUtente    */
/****************************************/


function getSensoriFromCampoUtente(email, campo) {
	return new Promise(function(resolve,reject){
		var keys = Array();
		db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").get().then(function(snapshot) {
			snapshot.forEach(function(userSnapshot) {
				keys.push(userSnapshot.id);	
			});
			resolve(keys);
		}).catch((err) => reject(err));
	});
}

function getArrayCampiFromUtente(email, callback){
	getCampiFromUtente(email).then((x) => {
		if (x.length == 0) {
			if(TEST) console.log('No such Array!');
			callback("ERRORE");
		} else {
			if(TEST) console.log('Array Data: ', x);
			callback(null, x, email);
		}
	});
}

function getSensorifromArray(x, email, callback){
	Promise.all(x.map((val) => {return getSensoriFromCampoUtente(email, val);})).then(values => { 
		if(TEST) console.log(values.flat());
		callback(null, values.flat());
	}).catch((err) => callback("ERRORE"));
	
}

function getSensorifromUtente(email) {
	return new Promise(function(resolve, reject) {
		async.waterfall([
			async.apply(getArrayCampiFromUtente, email),
			getSensorifromArray,
		], (err, result) => {
			if(err != null) reject(err);
			else resolve(result);
		});
	});
}

/****************************************/
/*         DB - getCampiCounter         */
/****************************************/

function getCampiCounter(email) {
	return new Promise(function(resolve, reject) {
		db.collection("users").doc(email).get().then(function(x) {
			resolve(x.data().campicounter)
		}).catch((y) => reject(y));
	});
}


/***************************/
/*         Routing         */
/***************************/

app.get('/index', accessProtectionMiddleware, function (req, res) {
	var umail = req.user.emails[0].value;
	db.collection("users").doc(umail).get().then((x) => {
		if(x.exists) {
			console.log("[!] Implementare get /dashboard");
		}
		else {
			createUser(umail);
			res.render('index.ejs', {port: PORT, nomeutente: umail});
		}
	});
});

// Create API endpoints

// This is where users point their browsers in order to get logged in
// This is also where Google sends back information to our app once a user authenticates with Google
app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/', session: true }),
	(req, res) => {
		if(TEST) 
			console.log('we authenticated, here is our user object:', req.user);
			
		res.redirect('/index');
	}
);

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

app.get('/', (req, res) => {
	res.render('home.ejs', {auth: req.isAuthenticated()});
});

app.get('/dashboard', function(req, res) {
	//var umail = "ermannino@gmail.com";
	//createCampo(umail, 41.33, 12.33);
	//createSensore(umail, "campo102402841212", "ID12", "nomesensorenuovo");
	//createRilevazione(umail, "campo102402841212", "ID12", "1.3", "2019-02-20");
})

app.post('/dashboard', accessProtectionMiddleware, function (req, res) {
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	var umail = req.user.emails[0].value;
	
	/* 
	currentUser è un riferimento al "percorso" dell'oggetto
	currentUser permette di modificare ciò che è in firebase:
	update, get, bla bla bla
	userInstance invece è l'oggetto preso dal db e da lui posso
	accedere ai dati
	*/
	
	createCampo(umail, latitude, longitude);
	createSensore(umail, "campo1", "ID123883", "nomesensore");
	createRilevazione(umail, "campo1", "ID123883", "1.3", "2019-02-20");
	
	
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
				port: PORT
			});
			
		}
	});

});

// Avvio del server
var server = app.listen(PORT, function () {
	if(TEST) console.log("[!] Output will be verbose, test mode on!");
	console.log('[i] Agrismart su http://localhost:%s\n', PORT);
	console.log("[+] Premere ctrl+c per terminare");
	// console.log(process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID + "\n");
});

app.get('/prova', (req, res) => {
    getSensorifromUtente("ermannino@gmail.com").then( (x) => res.send(x)).catch((y) => res.send("Errore"));
});