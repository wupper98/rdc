#!/usr/bin/env node

const path = require('path')
const express = require('express')
const request = require('request')
const passport = require('passport')
const bodyparser = require('body-parser')
const session = require('express-session')
const GoogleStrategy = require('passport-google-oauth20').Strategy

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

/***************************/
/*         Routing         */
/***************************/

app.get('/index', accessProtectionMiddleware, function (req, res) {
	res.render('index.ejs', {port: PORT});
});

// Create API endpoints

// This is where users point their browsers in order to get logged in
// This is also where Google sends back information to our app once a user authenticates with Google
app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/', session: true }),
	(req, res) => {
		if(TEST) 
			console.log('we authenticated, here is our user object:', req.user);
		// res.json(req.user);
		res.redirect('/index');
	}
);

app.get('/', (req, res) => {
	res.redirect('/index');
});

app.post('/geolocation', accessProtectionMiddleware, function (req, res) {
	var latitude = req.body.latitude;
	var longitude = req.body.longitude;
	var url = OWM_URL_1 + 'lat=' + latitude
		+ '&lon=' + longitude + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2

	request(url, function (error, response, body) {
		if (!error && response.statusCode == HTTP_OK) {

			var info = JSON.parse(body).daily[0];
			var main = info.temp;
			var weather = info.weather[0].description;
			var map_url = LL_URL_1 + longitude + ',' + latitude + LL_URL_2;

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
	// console.log(process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID + "\n");
});
