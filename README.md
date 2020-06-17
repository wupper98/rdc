# Agrismart
Agrismart è il progetto sviluppato da Andrea Andreani, Ermanno Bartoli, Gianluca De Carlo e Lorenzo Diaco per l'esame di Reti di Calcolatori.  
Agrismart è una web app che consente agli utenti di tenere sotto controllo il loro terreno tracciandone l'umidità e la temperatura (grazie a dei sensori appartenenti al mondo IOT) per permettere una gestione più responsabile ed efficace. Tutto questo è integrato con Google Calendar e con delle API prodotte da noi che consentono all'utente di ottenere varie informazioni sullo stato dei propri campi.

### Tech
Agrismart utilizza molti progetti esterni per funzionare:

* [NodeJS] - I/O ad eventi per la gestione del back end
* [Maps] - Leaflet per fornire una visuale sulla propria zona
* [Calendar] - Google Calendar per tenere traccia degli eventi
* [MQTT] - Protocollo di messaging per la comunicazione con i sensori
* [HiveMQ] - Message broker per gestire i messaggi provenienti dai sensori
* [Swagger] - Per fornire le nostre API

## Scelte progettuali
### Comunicazione sensori - web app
Per la comunicazione tra sensori e web app abbiamo optato per l'utilizzo del protocollo MQTT, particolarmente adatto ai dispositivi appartenenti al mondo IOT.  
Per gestire i messaggi abbiamo applicato il paradigma publisher/subscriber utilizzando il message broker [HiveMQ] completamente compatibile con il protocollo MQTT.

## Installazione
Per installare Agrismart è necessario clonare la repository ed installare le librerie (il branch di default NON è master, bensì microservices)
```sh
$ git clone https://github.com/wupper98/rdc.git
$ npm install
```
(Ignorare warning sulle vulnerabilità dei package)

## Esecuzione dell'applicazione
Per eseguire Agrismart senza avere una console intasata da log è sufficente eseguire il comando:
```sh
$ npm start
```
Se si è su una piattaforma windows potrebbe essere necessario avviare separatamente il controller dei sensori:
```sh
$ node ./services/sensorsController.js
```

## Test
I test sono stati effettuati sulle funzioni di interazione con il database. Sono state testate le seguenti funzionalità:

- aggiunta di un utente
- aggiunta di campo 
- aggiunta di un sensore

I test sono stati svolti grazie al modulo [Jest]

Per eseguire i test
```sh
$ cd test
$ npm run test
```
E' possibile testare varie funzionalità del sito:

- Login con Google Oauth2
- Creazione di almeno un campo (obbligatoria)
- Creazione dei sensori nel campo
- Simulazione automatica dei sensori al momento della creazione
- Visualizzazione dei dati ottenuti dai sensori
- Rilevazioni dei sensori aggiunte su google calendar
- Funzionamento delle API proprietarie tramite swagger (localhost:8888/api-docs)

## Api

Mettiamo a disposizione le seguienti API Rest:

- api 1
- api 2

[//]: # (Abbreviazioni per i link utilizzati nella descrizione del progetto)
[NodeJS]:   <https://nodejs.org/it/about/>
[Maps]:     <https://leafletjs.com/>
[Calendar]: <https://developers.google.com/calendar>
[MQTT]:     <http://mqtt.org/>
[HiveMQ]:   <https://www.hivemq.com/>
[Swagger]:  <https://swagger.io/>
[Jest]:     <https://jestjs.io/>