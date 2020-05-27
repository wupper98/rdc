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

function createUser(email) { //creo l'utente
	let instance = db.collection("users").doc(email);
	instance.create({}).then(function() {
		if(TEST) console.log("Utente aggiunto al database: "+ email);
	}).catch((err) => {
		if(TEST) console.log("Utente già registrato: "+ email);
	});

	// campicounter serve per tenere traccia dell'indice da dare al campo
	instance.set({
		campicounter: 0
	}).then(function() {
		if(TEST) console.log("[+] campicounter set to 0");
	})
}

function createCampo(email, name, lat, lon) { //creo il campo per l'utente
	db.collection("users").doc(email).collection("campi").doc(name).set({
		lat: lat,
		lon: lon,
	}).then(function() {
		if(TEST) console.log("Campo "+ name +" aggiunto al database dell'utente: "+ email);
	});
}

function createSensore(email, campo, id, name) { //creo il sensore sia nella sua tabella, sia per il rispettivo utente
	db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").doc(id).create({
		name: name,
	}).then(function() {
		if(TEST) console.log("Sensore "+ id +" aggiunto al database dell'utente: "+ email);
	});

	db.collection("sensors").doc(id).create({
		email: email,
		campo: campo,
	}).then(function() {
		if(TEST) console.log("Sensore "+ id +" aggiunto al database dei sensori con riferimento a: "+ email);
	});
}

function createInnaffiamento(email, campo, sensore, umidita, data) { //creo innaffiamento
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


/*function getSensorefromIdAux(id){
	let documento= db.collection("sensors").doc(id);
	return documento.get();
}

function promise2(doc){
	if (!doc.exists) {
		console.log('No such document!');
		const result =  new Promise((resolve)=>{
			resolve("errore");
		});
		return result;
	} else {
		console.log('Document data:', doc.data());
			const result =  new Promise((resolve)=>{
				resolve(doc.data());
			});
			return result;
		}
	}

	function getSensorefromId(id){
	return getSensorefromIdAux(id)
	.then(promise2)
	.catch((err) => console.log(err));
}

function getUltimiInnaffiamentiSensore(id){
	getSensorefromId(id)
	.then((x) => {
		if (x != "errore"){
			//Qui devo cercare l'utente
			let documento = db.collection("users").doc(x.email).collection("campi").doc(x.campo).collection("sensori").doc(id).collection("innaffiamenti").get()
			.then(function(snapshot) {
				snapshot.forEach(function(userSnapshot) {
				  console.log(userSnapshot.data().data);
				});
			});
		}
	});
}

function getnomesensorefromId(id){
	getSensorefromId(id)
	.then((x) => {
		if (x != "errore"){
			//Qui devo cercare l'utente
			let documento = db.collection("users").doc(x.email).collection("campi").doc(x.campo).collection("sensori").doc(id).get()
			.then( (x) => {
			console.log(x.data().name);
			return x.data().name;
		});		
	}
		else{
			return "Errore";
		}
	})
}*/

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

function getInnaffiamentiFromDocumento(data, id, callback){
	var keys = Array();
	db.collection("users").doc(data.email).collection("campi").doc(data.campo).collection("sensori").doc(id).collection("innaffiamenti").get().then(function(snapshot) {
		snapshot.forEach(function(userSnapshot) {
			keys.push(userSnapshot.data().data);
		});
		callback(null, keys);
	});
}

function getInnaffiamentiFromSensorID(id, callback) {
	async.waterfall([
		async.apply(getSensoreFromId, id),
		getInnaffiamentiFromDocumento,
	], callback);
}

/***************************/
/*         Routing         */
/***************************/
app.get('/prova', (req, res) => {
	getInnaffiamentiFromSensorID("ID123883", function (err, result) {
		if(err != null) res.send(err);
		else res.send(result);
	});
});

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
	var currentUser = db.collection("users").doc(umail)

	currentUser.get().then((userInstance) => {
		var cid = userInstance.data().campicounter + 1;
		var nomeCampo = "campo" + cid.toString();
		console.log(nomeCampo);

		currentUser.update({
			"campicounter": cid
		}).then(() => {
			if(TEST) console.log("[+] campicounter aggiornato");
		}).catch((error) => {
			console.log(error);
		});
		console.log("sono quie")
		createCampo(umail, nomeCampo, latitude, longitude);
		createSensore(umail, nomeCampo, "ID123883", "nomesensore");
		createInnaffiamento(umail, nomeCampo, "ID123883", "1.3", "2019-02-20");
		
		
		var url = OWM_URL_1 + 'lat=' + latitude
		+ '&lon=' + longitude + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2
		
		request(url, function (error, response, body) {
			if (!error && response.statusCode == HTTP_OK) {
				
				var info = JSON.parse(body).daily[0];
				var main = info.temp;
				var weather = info.weather[0].description;
				// var map_url = LL_URL_1 + longitude + ',' + latitude + LL_URL_2;
				
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
	}).catch(function() {});
});

// Avvio del server
var server = app.listen(PORT, function () {
	if(TEST) console.log("[!] Output will be verbose, test mode on!");
	console.log('[i] Agrismart su http://localhost:%s\n', PORT);
	// console.log(process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID + "\n");
});