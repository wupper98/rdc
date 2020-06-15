const request = require("request");
const HTTP_OK = 200;

module.exports.controllaRilevazione = async function (accessToken, req, res, data, moisture, campoId) {

    var ll = new Array();
    var options = {
        url:'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=9999&singleEvents=true',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    };

    request(options, (err, res, body) => {
        if (!err && res.statusCode == HTTP_OK) {
            var info = JSON.parse(body);
            var l = info.items;

            if (l != null) {
                for (var i = 0; i < l.length; i++) {
                    if (l[i].start == undefined) continue;
                    ll.push(l[i].start.date);
                };
                if (ll.includes(data)) {
                    console.log("[!] Non posso aggiungere una rilevazione già aggiunta");
                }
                else {
                    module.exports.aggiungiRilevazione(accessToken, req, res, data, moisture, campoId);
                }
            };
        };
    });
} 

module.exports.aggiungiRilevazione = function aggiungiRilevazione(accessToken, req, res, data, moisture, campoId) {
    var url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    var headers = {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
    };

    var body = {
        'summary': "[Agrismart]" + campoId + ": " + moisture,
        'description' : campoId + ": " + moisture,
        'start': {
            'dateTime': data,
        },
        'end': {
            'dateTime': data,
        },
        'visibility': 'public'
    };

    request( {
            headers: headers,
            url: url,
            method: 'POST',
            body: JSON.stringify(body)
        },
        function callback(err, res, body) {
            console.log(body);
            if(err) console.log(err);
            else console.log("Aggiunta rilevazione: " + campoId + ": " + moisture);
        }
    );
}