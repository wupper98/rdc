const db = require('../services/database');

test('Verifica creazione utente', (done) => {
  return db.createUser("prova@gmail.com").then( () => {
    done();
  }).catch( (err) => { done(err) });
});

test('Verifica creazione campo', (done) => {
  return db.createCampo("prova@gmail.com", "SantaSevera", "42", "12").then( () => {
    done();
  }).catch( (err) => { done(err) });
});

test('Verifica creazione sensore', (done) => {
  // creo sensore
  return db.createSensore("prova@gmail.com", "campo1", "pomodori").finally( () => {
      db.getSensoreFromId("prova@gmail.com_campo1_1", (error, data, id) => {
        expect(error).toBe(null);
        done();
      })
    }
  );
});

test('Eliminazione sensore', () => {
  return db.deleteSensore("prova@gmail.com", "campo1", "prova@gmail.com_campo1_1").then(() => console.log("Sensore eliminato"));
});

test('Eliminazione campo', () => {
  return db.deleteCampo("prova@gmail.com", "campo1").then(() => console.log("Campo eliminato"));
});

test('Eliminazione utente', () => {
  return db.deleteUtente("prova@gmail.com").then(() => console.log("Utente eliminato"));
});
