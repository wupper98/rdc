// Modulo per costruire il percorso a partire dalla 
// base directory del progetto (dove è app.js)
var baseDir = require('app-root-path');
console.log(baseDir);

const fs = require('fs');

// Salvo il token dell'utente su un file nominato come la sua email
// lo stesso file verrà distrutto al momento del logout
module.exports.createToken = function (email, accessToken) {
    var fname = baseDir +  "/private/sessionToken/" + email + ".txt";
    fs.writeFile(fname, accessToken, function (err) {
        if (err) return console.log(err);
        console.log('Token correttamente salvato');
    });
}

module.exports.readToken = function (email) {
    var fname = baseDir +  "/private/sessionToken/" + email + ".txt";
    var token = fs.readFileSync(fname, {encoding: 'utf8', flag: 'r'});
    return token;
}

// Distruttore del file
module.exports.deleteToken = function (email) {
    var fname = baseDir + "/private/sessionToken/" + email + ".txt";
    try {
        fs.unlinkSync(fname);
    }
    catch(err) {
        console.error(err);
    }
}