# Beat Yourself — Guida attivazione notifiche push

Il codice per i promemoria push (pasti non segnati, poca idratazione, integratori serali) è già scritto e pronto — sia lato app (`index.html`) sia la funzione cloud che li invia ogni 30 minuti (`functions/index.js`). Mancano solo alcuni passaggi che devi fare tu nella console Firebase (in parte toccano la fatturazione dell'account, quindi non posso farli al posto tuo) più il deploy da un terminale con accesso internet completo (non riesco a farlo dall'ambiente isolato di questa sessione, che non raggiunge le API Google).

Segui i passaggi in ordine. Quando arrivi al punto 3 (chiave VAPID), mandami la chiave e la incollo io nel codice.

---

## 1. Attiva il piano Blaze (pay-as-you-go)

Le funzioni programmate ("scheduled functions", come quella che controlla ogni 30 minuti se mandare un promemoria) non sono disponibili sul piano gratuito Spark: serve il piano Blaze.

- Vai su [console.firebase.google.com](https://console.firebase.google.com/) → progetto **just-beat-it-76154**
- In basso a sinistra nel menu, clicca **Aggiorna** (o ⚙️ Impostazioni progetto → scheda **Utilizzo e fatturazione**)
- Passa a **Blaze** e collega un metodo di pagamento

Per un solo utente resti quasi certamente entro le soglie gratuite mensili di Firebase (Blaze le mantiene, addebita solo l'eccedenza): il costo atteso è vicino a zero, ma è bene saperlo prima di attivarlo.

## 2. Pubblica le regole di sicurezza Firestore (se non l'hai già fatto)

- Firebase Console → **Firestore Database** → scheda **Regole**
- Incolla l'intero contenuto del file `firestore.rules` (già nella cartella del progetto) al posto delle regole esistenti
- Clicca **Pubblica**

## 3. Genera la chiave VAPID

- Firebase Console → ⚙️ **Impostazioni progetto** → scheda **Cloud Messaging**
- Scorri fino a **Configurazione web** / **Web configuration**
- Sotto **Certificati web push**, clicca **Genera coppia di chiavi**
- Copia la chiave generata (una stringa lunga tipo `BN...`)

**Mandami questa chiave** (qui in chat, o incollala tu direttamente in `index.html` al posto di `const VAPID_KEY = '';`, riga ~693) e verifico che sia inserita correttamente.

## 4. Deploy della funzione cloud

Questo passaggio va fatto da un terminale con accesso internet normale (il tuo, non questa sessione) — apri PowerShell o il terminale che usi di solito:

```bash
# Solo la prima volta, se non hai già Firebase CLI:
npm install -g firebase-tools

# Nella cartella del progetto "Beat Yourself":
firebase login
# si apre il browser: accedi con l'account Google del progetto

cd functions
npm install
cd ..

firebase deploy --only functions
```

Il deploy richiede qualche minuto la prima volta. Se va a buon fine, vedrai un messaggio con l'URL/nome della funzione `promemoriaGiornalieri`.

## 5. Verifica in app

- Apri l'app (in locale o pubblicata), vai su **Profilo**
- Clicca **Attiva notifiche** e concedi il permesso quando il browser lo chiede
- Dovresti vedere "🔔 Notifiche attive"

Da quel momento, la funzione cloud gira ogni 30 minuti e — se hai un pasto non ancora segnato, poca acqua nel pomeriggio, o integratori serali non presi — ricevi una notifica push (una sola volta al giorno per ciascun promemoria, per non essere invadente).

---

### Se qualcosa non funziona

- **"Notifiche attivate" non compare / errore**: controlla di aver incollato la chiave VAPID corretta e di aver concesso il permesso notifiche al browser (impostazioni del sito).
- **Le notifiche non arrivano mai**: verifica che il deploy della funzione sia andato a buon fine (`firebase deploy --only functions` senza errori) e che il piano Blaze sia attivo.
- **Su iPhone**: le notifiche push richiedono che l'app sia installata sulla schermata Home (PWA), non basta il browser Safari aperto.

Fammi sapere a che punto sei arrivato o se un passaggio dà errore: ti aiuto a risolverlo.
