#!/usr/bin/env node

var request = require('request')
var express     = require('express')
var path        = require('path')
var bodyparser  = require('body-parser')
require('dotenv').config()

var app = express();
app.use(bodyparser.urlencoded({extended: false}));

const PORT      = 8888;

// http status codes
const HTTP_OK   = 200;

// https://api.openweathermap.org/data/2.5/onecall?lat={}&lon={}&exclude={}&appid=
const OWM_URL_1     = 'https://api.openweathermap.org/data/2.5/onecall?'
const OWM_URL_2     = '&appid=' + process.env.OWM_KEY;

// https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/{lon,lat},14.25,0,45/600x600?access_token=
const LL_URL_1      = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/';
const LL_URL_2      = ',10,0,45/600x600?access_token=' + process.env.LL_KEY;

function KelvinToCelcius(k){
    return (parseFloat(k)-272.15).toPrecision(2);
}

// Impostazioni per il template engine
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// Seguendo il modello MVC qui abbiamo i controller

app.get('/', function(req, res){
    res.render('index.ejs');
});

app.post('/geolocation', function(req, res){
    var latitude   = req.body.latitude;
    var longitude = req.body.longitude; 
    var url     = OWM_URL_1 + 'lat=' + latitude
     + '&lon=' + longitude + '&exclude=' + 'minutely,hourly,current' + OWM_URL_2

    request(url, function(error, response, body){
        if(!error && response.statusCode == HTTP_OK){

            var info    = JSON.parse(body).daily[0];
            var main    = info.temp;
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
                humidity: info.humidity
            });

        }
        else{
            console.log('ERROR');
            res.end('404 NOT FOUND');
        }
    });
});

// Avvio del server
var server = app.listen(PORT, function(){
    console.log('[i] In ascolto su http://localhost:%s\n', PORT);
});
