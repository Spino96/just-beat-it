/* Funzione cloud per i promemoria push di Beat Yourself.
   Gira ogni 30 minuti, controlla per ogni utente con le notifiche attive
   (fcmToken presente) se è vicino a uno dei "checkpoint" della giornata
   (colazione, spuntini, pranzo, cena, integratori serali, idratazione) e,
   se quel checkpoint non è ancora stato segnato come fatto nell'app, invia
   un promemoria — una sola volta al giorno per checkpoint, tracciato nel
   campo "notificheInviate" del log alimentare del giorno.

   NOTA: gli orari qui sotto sono una copia semplificata di quelli nel piano
   alimentare dentro index.html (DIETA_PIANO). Se cambi gli orari o l'ordine
   dei pasti nell'app, aggiorna anche i CHECKPOINT qui sotto per restare coerenti.
   Allineato al piano v6 (30/08/2026): Colazione, Spuntino mattina, Pranzo,
   Spuntino pomeridiano, Cena — indici 0-4 nello stesso ordine.

   DEPLOY (va fatto a mano dalla tua macchina, non posso farlo io da qui):
   1. Installa Firebase CLI se non ce l'hai:  npm install -g firebase-tools
   2. Da questa cartella "functions": npm install
   3. Dalla cartella principale del progetto: firebase login
   4. firebase deploy --only functions
   Richiede il piano Blaze (pay-as-you-go) su Firebase — per un solo utente
   resta comunque entro i limiti gratuiti mensili nella stragrande maggioranza
   dei casi, ma Blaze è necessario perché le funzioni pianificate (scheduled)
   non sono disponibili sul piano gratuito Spark. */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const FUSO_ORARIO = 'Europe/Rome';

// Checkpoint: ora (in fuso Europe/Rome) in cui controllare, chiave usata per
// non notificare due volte lo stesso giorno, e messaggio da inviare.
const CHECKPOINT_PASTI = [
  { chiave: 'colazione',         oraMin: 9,  oraMax: 10, pastoIndex: 0, titolo: 'Colazione da segnare', corpo: 'Non hai ancora segnato la colazione di oggi nel piano.' },
  { chiave: 'spuntinoMattina',   oraMin: 11, oraMax: 12, pastoIndex: 1, titolo: 'Spuntino da segnare', corpo: 'Promemoria: segna lo spuntino di metà mattina se l\'hai fatto.' },
  { chiave: 'pranzo',            oraMin: 16, oraMax: 17, pastoIndex: 2, titolo: 'Pranzo da segnare', corpo: 'Non hai ancora segnato il pranzo di oggi nel piano.' },
  { chiave: 'spuntinoPomeridiano', oraMin: 18, oraMax: 19, pastoIndex: 3, titolo: 'Spuntino da segnare', corpo: 'Promemoria: segna lo spuntino pomeridiano se l\'hai fatto.' },
  { chiave: 'cena',              oraMin: 22, oraMax: 23, pastoIndex: 4, titolo: 'Cena da segnare', corpo: 'Non hai ancora segnato la cena di oggi nel piano.' },
];
const CHECKPOINT_IDRATAZIONE = { chiave: 'idratazione', oraMin: 15, oraMax: 16, sogliaMl: 1200,
  titolo: 'Poca acqua oggi', corpo: 'Sei ancora sotto 1,2L di acqua: prova a berne un po\' nel pomeriggio.' };
const CHECKPOINT_INTEGRATORI = { chiave: 'integratori', oraMin: 22, oraMax: 23,
  titolo: 'Integratori serali', corpo: 'Controlla se hai preso gli integratori di oggi (es. ZMA prima di dormire).' };

function oraRomaAdesso(){
  const parti = new Intl.DateTimeFormat('en-GB', { timeZone: FUSO_ORARIO, hour: '2-digit', hour12: false }).formatToParts(new Date());
  return Number(parti.find(p => p.type === 'hour').value);
}

function chiaveGiornoOggi(){
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_ORARIO, year:'numeric', month:'2-digit', day:'2-digit' });
  return f.format(new Date()); // formato YYYY-MM-DD, stesso usato da todayKey() nel client
}

async function inviaNotifica(uid, token, titolo, corpo){
  try{
    await admin.messaging().send({ token, notification: { title: titolo, body: corpo } });
  }catch(e){
    // Token scaduto/non valido: lo rimuoviamo così l'app tornerà a chiedere
    // il permesso invece di ritentare all'infinito su un token morto.
    if(e && (e.code === 'messaging/registration-token-not-registered' || e.code === 'messaging/invalid-registration-token')){
      await db.collection('users').doc(uid).set({ fcmToken: admin.firestore.FieldValue.delete() }, { merge:true }).catch(()=>{});
    }
  }
}

exports.promemoriaGiornalieri = onSchedule({ schedule: 'every 30 minutes', timeZone: FUSO_ORARIO }, async () => {
  const ora = oraRomaAdesso();
  const oggi = chiaveGiornoOggi();

  const utentiSnap = await db.collection('users')
    .where('schedeAssegnate', '==', null) // solo il profilo con piano alimentare personale, stessa logica dell'app
    .get();

  for(const doc of utentiSnap.docs){
    const utente = doc.data();
    const token = utente.fcmToken;
    if(!token) continue;

    const logRef = db.collection('users').doc(doc.id).collection('dietaLog').doc(oggi);
    const logSnap = await logRef.get();
    const log = logSnap.exists ? logSnap.data() : {};
    const pastiFatti = log.pastiFatti || {};
    const integratoriFatti = log.integratoriFatti || {};
    const acquaMl = log.acquaMl || 0;
    const notificheInviate = log.notificheInviate || {};

    // Pasti
    for(const cp of CHECKPOINT_PASTI){
      if(ora < cp.oraMin || ora >= cp.oraMax) continue;
      if(notificheInviate[cp.chiave]) continue;
      if(pastiFatti[cp.pastoIndex]) continue; // già segnato, nessun bisogno di ricordarlo
      await inviaNotifica(doc.id, token, cp.titolo, cp.corpo);
      await logRef.set({ notificheInviate: { [cp.chiave]: true } }, { merge:true });
    }

    // Idratazione
    const ci = CHECKPOINT_IDRATAZIONE;
    if(ora >= ci.oraMin && ora < ci.oraMax && !notificheInviate[ci.chiave] && acquaMl < ci.sogliaMl){
      await inviaNotifica(doc.id, token, ci.titolo, ci.corpo);
      await logRef.set({ notificheInviate: { [ci.chiave]: true } }, { merge:true });
    }

    // Integratori: promemoria unico se ne manca almeno uno, non specifico per singolo integratore
    const cint = CHECKPOINT_INTEGRATORI;
    if(ora >= cint.oraMin && ora < cint.oraMax && !notificheInviate[cint.chiave]){
      const presiCount = Object.values(integratoriFatti).filter(Boolean).length;
      if(presiCount === 0){
        await inviaNotifica(doc.id, token, cint.titolo, cint.corpo);
        await logRef.set({ notificheInviate: { [cint.chiave]: true } }, { merge:true });
      }
    }
  }
});
