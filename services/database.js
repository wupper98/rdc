require('dotenv').config()

const TEST = process.env.TEST;

// Modulo per costruire il percorso a partire dalla 
// base directory del progetto (dove è app.js)
var baseDir = require('app-root-path');
console.log(baseDir);

//Per async
var async = require("async");
//Per le promise
var Promise = require('promise');

// Setup per accedere a firebase
var admin = require("firebase-admin");
var serviceAccount =  baseDir + "/private/agrismart-c2656-firebase-adminsdk-1en4p-ba81ef792e.json";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://agrismart-c2656.firebaseio.com"
});

// Variabile di accesso al db
let db = admin.firestore();


/*************************************/
/*         Database Firebase         */
/*************************************/


/*************************************/
/*         Create User Firebase  	 */
/*************************************/
// Ritorna una promise che consente di attendere la creazione dell'utente
module.exports.createUser = function (email) { //creo l'utente
	let instance = db.collection("users").doc(email);
	return instance.create({campicounter: 0, sensoricounter: 0});
}

/*************************************/
/*          Get Users Firebase  	 */
/*************************************/

module.exports.getAllUtenti = function (){
	return new Promise(function(resolve,reject){
		var keys = Array();
	db.collection("users").get().then(function(snapshot) {
		snapshot.forEach(function(userSnapshot) {
			keys.push(userSnapshot.id);
		});
		resolve(keys);
	}).catch((y) => reject(y));
	});
}

/*************************************/
/*         CreateCampo Firebase         */
/*************************************/

module.exports.createCampo =  function (email,nome, lat, lon) { //creo il campo per l'utente 
	return new Promise(function(resolve,reject){
		db.collection("users").doc(email).get().then(  (userInstance) => {
			var cid = userInstance.data().campicounter + 1;
			var nomeCampo = "campo" + cid.toString();
			if(TEST) console.log("Provo a creare " + nomeCampo);

			db.collection("users").doc(email).update({
				"campicounter": cid
			}).then(  () => {
				if(TEST) console.log("[+] campicounter aggiornato");
				db.collection("users").doc(email).collection("campi").doc(nomeCampo).set({
					nome: nome,
					lat: lat,
					lon: lon,
				}).then(  function() {
					if(TEST) console.log("Campo "+ nomeCampo +" aggiunto al database dell'utente: "+ email);
					resolve();
				}).catch((err) => {
					if(TEST) console.log("Campo già registrato: "+ nomeCampo);
				});
			}).catch((error) => {
				console.log(error);
			});
		}).catch((err) => {console.log(err);});
	});
}


/*************************************/
/*         Create Sensore         */
/*************************************/
// aggiunge alla lista di rilevazioni di un sensore
module.exports.createSensore = function (email, campo, name) { //creo il sensore sia nella sua tabella, sia per il rispettivo utente
	return new Promise(function(resolve,reject){ 
		db.collection("users").doc(email).get().then( (userInstance) => {

		var sid = userInstance.data().sensoricounter + 1;
		var id = email + "_" + campo + "_" + sid;

		db.collection("users").doc(email).update({
			"sensoricounter": sid
		}).then( () => {
			if(TEST) console.log("sensoricounter di " + email + " aggiornato");
			db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").doc(id).create({
				name: name,
				stato: "high"
			}).then(function() {
				if(TEST) console.log("Sensore "+ id +" aggiunto al database dell'utente: "+ email);
				db.collection("sensors").doc(id).create({
					email: email,
					campo: campo,
				}).then(function() {
					if(TEST) console.log("Sensore "+ id +" aggiunto al database dei sensori con riferimento a: "+ email);
					resolve(id);
				}).catch(function() {
					if(TEST) console.log("Sensore "+ id +" non aggiunto al database dei sensori: "+ email);
				});
			}).catch(function() {
				if(TEST) console.log("Sensore "+ id +" non aggiunto al database dell'utente: "+ email);
			});
		}).catch((err) => {
			console.log(err);
		});

		}).catch((err) => {
			console.log(err);
		});
	});

}

/*************************************/
/*         Create Rilevazione         */
/*************************************/

module.exports.createRilevazione = function (email, campo, sensore, umidita, data) { //creo innaffiamento
	db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").doc(sensore).collection("innaffiamenti").doc(data.toString()).create({
		umidita: umidita,
		data: data
	}).then(function() {
		if(TEST) console.log("Rilevamento del sensore "+ sensore +" aggiunto al database dell'utente: "+ email);
	});
}

module.exports.updateStatoSensore = function (sensore, stato) {
	db.collection("sensors").doc(sensore).get().then((x) => {
		if (!x.exists) {
			if(TEST) console.log('[+] No such sensor!');
		} else {
			if(TEST) console.log('Document data: ', x.data());
			db.collection("users").doc(x.data().email).collection("campi").doc(x.data().campo).collection("sensori").doc(sensore).update({
				stato: stato
			})
		}
	});
}

//Questa funzione restituise i dati che sono presenti nel documento n-esimo_sensore. Per accedere ai dati all'interno
//vedere sul database quali sono, nel nostro caso email e campo, quindi ci si accede (ad esempio email con .email)
//Gestire poi errori nel caso il documento non esista o ci sia un errore (in caso negativo restituisce undefined)


/************************************/
/*         DB - getSensore          */
/************************************/

module.exports.getSensoreFromId = function (id, callback){
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


module.exports.getRilevazioniFromDocumento = function (data, id, callback){
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

module.exports.getRilevazioniFromSensorID = function (id) {
	return new Promise(function(resolve, reject) {
		async.waterfall([
			async.apply(module.exports.getSensoreFromId, id),
			module.exports.getRilevazioniFromDocumento,
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
module.exports.getAllSensori = function (){
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

module.exports.getCampiFromUtente = function (email){
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
/*         DB - getNomeCampiFromUtente      */
/****************************************/

module.exports.getNomeCampiFromUtente = function (email){
	return new Promise(function(resolve,reject){
		var keys = Array();
		db.collection("users").doc(email).collection("campi").get().then(function(snapshot) {
			snapshot.forEach(function(userSnapshot) {
				keys.push([userSnapshot.id,userSnapshot.data().nome]);
			});
			resolve(keys);
		}).catch((y) => reject(y));
	});
}

/****************************************/
/*         DB - getNomeSensoriFromUtente    */
/****************************************/


// restituisce una lista di sensori di un campo di un utente
module.exports.getNomeSensoriFromCampoUtente = function (email, campo) {
	return new Promise(function(resolve,reject){
		var keys = Array();
		db.collection("users").doc(email).collection("campi").doc(campo).collection("sensori").get().then(function(snapshot) {
			snapshot.forEach(function(userSnapshot) {
				keys.push([userSnapshot.id, userSnapshot.data().name, userSnapshot.data().stato]);	
			});
			resolve(keys);
		}).catch((err) => reject(err));
	});
}

/****************************************/
/*         DB - getSensoriFromUtente    */
/****************************************/


// restituisce una lista di sensori di un campo di un utente
module.exports.getSensoriFromCampoUtente = function (email, campo) {
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

// di servizio
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
// di servizio
function getSensorifromArray(x, email, callback){
	Promise.all(x.map((val) => {return getSensoriFromCampoUtente(email, val);})).then(values => { 
		if(TEST) console.log(values.flat());
		callback(null, values.flat());
	}).catch((err) => callback("ERRORE"));
	
}

// restituisce i sensori di un utente
module.exports.getSensorifromUtente = function (email) {
	return new Promise(function(resolve, reject) {
		async.waterfall([
			async.apply(module.exports.getArrayCampiFromUtente, email),
			module.exports.getSensorifromArray,
		], (err, result) => {
			if(err != null) reject(err);
			else resolve(result);
		});
	});
}

/****************************************/
/*         DB - getCampiCounter         */
/****************************************/

module.exports.getCampiCounter = function (email) {
	return new Promise(function(resolve, reject) {
		db.collection("users").doc(email).get().then(function(x) {
			resolve(x.data().campicounter)
		}).catch((y) => reject(y));
	});
}

/****************************************/
/*         DB - getSensoriCounter         */
/****************************************/

module.exports.getSensoriCounter = function (email) {
	return new Promise(function(resolve, reject) {
		db.collection("users").doc(email).get().then(function(x) {
			resolve(x.data().sensoricounter)
		}).catch((y) => reject(y));
	});
}



/****************************************/
/*         DB - getInfoCampo		    */
/****************************************/

module.exports.getInfoCampo = function (email, idcampo) {
	return new Promise(function(resolve, reject) {
		db.collection("users").doc(email).collection("campi").doc(idcampo).get().then(function(x) {
			resolve([x.data().nome, x.data().lat, x.data().lon]);
		}).catch((y) => reject(y));
	});
}

/****************************************/
/*         DB - isToken		   		    */
/****************************************/
module.exports.isToken= function(tok) {
	return new Promise( (resolve, reject) =>{
		db.collection("tokens").get().then(function(snapshot){
			snapshot.forEach(function (tokenSnapshot) {
				console.log("token: " + tokenSnapshot.id);
				console.log("mytok:" + tok);
				if (tok == tokenSnapshot.id) {
					console.log("TROVATO");
					resolve(true)
				}
			});
			reject(false);
		})
	})
}

/****************************************/
/*         DB - getStatosensore		    */
/****************************************/
module.exports.getStatoSensore= function(utenteId,campoId,sensorId) {
	return new Promise( (resolve, reject) => {
		db.collection("users").doc(utenteId).collection("campi").doc(campoId).collection("sensori").doc(sensorId).get().then( (x) => resolve(x.data().stato)).catch((x) =>reject(x));
	})
}

/****************************************/
/*         DB - deleteSensore		    */
/****************************************/
module.exports.deleteSensore= function(utenteId,campoId,sensorId) {
	return db.collection("users").doc(utenteId).collection("campi").doc(campoId).collection("sensori").doc(sensorId).delete().then( () =>
	{
		return db.collection("sensors").doc(sensorId).delete();
	});
}

/****************************************/
/*         DB - deleteCampo		    */
/****************************************/
module.exports.deleteCampo= function(utenteId,campoId) {
	return db.collection("users").doc(utenteId).collection("campi").doc(campoId).delete();
}


/****************************************/
/*         DB - deleteutente		    */
/****************************************/
module.exports.deleteUtente= function(utenteId) {
	return db.collection("users").doc(utenteId).delete();
}

/****************************************/
/*         DB - createAPIToken		    */
/****************************************/
module.exports.createAPIToken = function (email) { //creo lo user token
	let instance = db.collection("tokens");
	return instance.add({user: email});
}


/****************************************/
/*         DB - refreshAPIToken		    */
/****************************************/
module.exports.refreshAPIToken = function (email, old) { //creo lo user token e cancello quello vecchio
	db.collection("tokens").doc(old).delete().then((x) => {
		db.collection("tokens").add({user: email}).then((y) => {
			console.log("Token Refreshato");
			module.exports.setUserToken(email, y.id);
		}).catch((y) => console.log("Token non refreshato correttamente"));
	}).catch((x) => console.log("Problemi nella rimozione del token."));
}

/****************************************/
/*         DB - setUserToken		    */
/****************************************/
module.exports.setUserToken = function (email, id) { //metto lo user token nella tabella utente
	db.collection("users").doc(email).update({token: id});
}

/****************************************/
/*         DB - getUserData			    */
/****************************************/
module.exports.getUserData = function (email) { //getto lo user token nella tabella utente
	return db.collection("users").doc(email).get();
}


