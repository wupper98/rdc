#!/usr/bin/env node
require('dotenv').config()
const path = require('path')
const db = require("./services/database")
const express = require('express')
const request = require('request')
const passport = require('passport')
const bodyparser = require('body-parser')
const session = require('express-session')
const manageTokenOauth = require("./services/localTokenOauth");
const GoogleStrategy = require('passport-google-oauth20').Strategy

const app = express();
const PORT = process.env.PORT;
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require("./swagger.json");
var TEST = process.env.TEST;

// Configurazioni per il corretto funzionamento dell'app
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyparser.urlencoded({ extended: false }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Questa sezione è dedicata alla gestione del protocollo oauth insieme con la funzione di logout
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

// Set up passport strategy
passport.use(new GoogleStrategy( {
		clientID: process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID,
		clientSecret: process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_SECRET,
		callbackURL: 'http://localhost:' + PORT + '/auth/google/callback',
		scope: ['email', 'https://www.googleapis.com/auth/calendar'],
	}, (accessToken, refreshToken, profile, cb) => {
		if(TEST) console.log('Our user authenticated with Google, and Google sent us back this profile info identifying the authenticated user:', profile);
		
		// Salvo il token dell'utente su un file nominato come la sua email
		// lo stesso file verrà distrutto al momento del logout
		manageTokenOauth.createToken(profile.emails[0].value, accessToken);

		return cb(null, profile);
}));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/', session: true }), (req, res) => {
	if(TEST) console.log('we authenticated, here is our user object:', req.user);
	umail = req.user.emails[0].value;

	db.getAllUtenti().then((utenti) => {
		if( utenti.indexOf(umail) > -1 ){
			// utente già presente nel DB. Lo mando alla sua dashboard
			res.redirect('/');
		}
		else{
			// utente nuovo. Gli faccio registrare un nuovo campo
			res.redirect('/coordConfig');		
		}
	}).catch((err) => {
		if(TEST) console.log(err);
	}); 
});

app.get('/logout', function(req, res) {
	manageTokenOauth.deleteToken(req.user.emails[0].value);
	req.logout();
	res.redirect('/');
});


// ROUTING


// Controller per le risorse sotto '/'
var home = require('./routes/home');
app.use('/', home);

// Controller per le API
var apiController = require('./routes/apiService');
app.use('/api', apiController)

// funzione da eseguire prima di ogni richiesta che non sia '/'
// oppure una risorsa necessaria ad effettuare il login
// verifica che l'utente sia loggato
app.use( function accessProtectionMiddleware(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.status(403).render('403forbidden.ejs', {port: PORT});
	}
})

// Controller per le risorse di configurazione coordinate
var coordConfig = require('./routes/coordConfig');
app.use('/coordConfig', coordConfig);

// Controller per le risorse dashboard
var dashboard = require('./routes/dashboard');
app.use('/dashboard', dashboard);

// Avvio del server
var server = app.listen(PORT, function () {
	if(TEST) console.log("[!] Output will be verbose, test mode on!");
	console.log('[i] Agrismart su http://localhost:%s', PORT);
	console.log("[+] Premere ctrl+c per terminare");
	// console.log(process.env.GOOGLE_OAUTH_TEST_APP_CLIENT_ID + "\n");
});