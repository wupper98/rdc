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

const OWM_URL_1 = 'https://api.openweathermap.org/data/2.5/weather?'
const OWM_URL_2 = '&appid=' + process.env.OWM_KEY;



function tokenProtection (req,res,next) { 
    if (req.query.token == undefined) res.status(401).send("UNAUTHORIZED");
    else db.isToken(req.query.token).then( (x) => next()).catch((y) => res.status(401).send("UNAUTHORIZED"))
}

//Ritorna la lista dei campi dato un utente
router.get("/users/:userId/campi", tokenProtection, (req, res) => {
    db.getCampiFromUtente(req.params.userId).then((x) => res.send(x)).catch((x) => res.send(x))
})

//Ritorna la lista dei sensori dato un campo
router.get("/users/:userId/campi/:campoId/sensors", tokenProtection, (req, res) => {
    db.getSensoriFromCampoUtente(req.params.userId, req.params.campoId).then((x) => res.send(x)).catch((x) => res.send(x))
})

//Ritorna la lista le rilevazioni dato un sensore
router.get("/users/:userId/campi/:campoId/sensors/:sensorId/rilevazioni", tokenProtection, (req, res) => {
    db.getRilevazioniFromSensorID(req.params.sensorId).then((x) => res.send(x)).catch((x) => res.send(x));
})

//Ritorna il meteo di una città
router.get("/meteo/:citta", tokenProtection, (req, res) => {
    var url = OWM_URL_1 + "q=" + req.params.citta + OWM_URL_2

    request(url, function (error, response, body) {
        if (!error && response.statusCode == HTTP_OK) {
            res.send(response);
        }
        else {
            res.send("Errore nella chiamata");
        }
    });
})

//Ritorna lo stato di un sensore
router.get("/users/:userId/campi/:campoId/sensors/:sensorId/stato", tokenProtection, (req, res) => {
    db.getStatoSensore(req.params.userId, req.params.campoId,req.params.sensorId).then((x) => res.send(x)).catch((x) => res.send(x));
})

module.exports = router;