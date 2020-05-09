# Agrismart
Agrismart è il progetto sviluppato da Andrea Andreani, Ermanno Bartoli, Gianluca De Carlo e Lorenzo Diaco per l'esame di Reti di Calcolatori.  
Agrismart è una web app che consente agli utenti di tenere sotto controllo il loro terreno  tracciandone umidità, temperatura ed eventi come l'innaffiamento (grazie a dei sensori appartenenti al mondo IOT) per permettere una gestione più responsabile ed efficace. Tutto questo è integrato con Google Calendar e con delle API prodotte da noi che consentiranno all'utente di ottenere l'intera lista degli eventi per poi utilizzarla a proprio piacimento.

### Tech
Agrismart utilizza molti progetti esterni per funzionare:

* [NodeJS] - I/O ad eventi per la gestione del back end
* [Maps] - Google Maps per fornire una visuale sulla propria zona
* [Calendar] - Google Calendar per tenere traccia degli eventi
* [MQTT] - Protocollo di messaging per la comunicazione con i sensori
* [RabbitMQ] - Message broker per gestire i messaggi provenienti dai sensori
* [Swagger] - Per fornire le nostre API

### Installazione
Per installare Agrismart è necessario clonare la repository
```sh
$ git clone https://github.com/wupper98/rdc.git
```

### Test
Per effettuare i test bisogna eseguire 2 semplici comandi
```sh
$ node ./agrismart
$ node ./fieldsim
```




[//]: # (Abbreviazioni per i link utilizzati nella descrizione del progetto)
[NodeJS]:   <https://nodejs.org/it/about/>
[Maps]:     <https://developers.google.com/maps/documentation?hl=it>
[Calendar]: <https://developers.google.com/calendar>
[MQTT]:     <http://mqtt.org/>
[RabbitMQ]: <https://www.rabbitmq.com/>
[Swagger]:  <https://swagger.io/>
