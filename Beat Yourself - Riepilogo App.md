# Beat Yourself — Riepilogo App

App web personale (single-file HTML/JS, PWA con Firebase Auth + Firestore), pubblicata su GitHub Pages:
**https://spino96.github.io/just-beat-it/**

Repo: https://github.com/Spino96/just-beat-it

---

## Struttura generale

- App a pagina unica con routing interno (schermate: Home, Allenamento, Dieta, Statistiche, Profilo, ecc.), animazioni di navigazione stile iOS.
- Dati salvati su Firestore, per-utente, protetti da regole di sicurezza (ogni utente vede solo i propri dati).
- Installabile come PWA (icona su schermata home, funziona anche offline grazie al service worker).

## Allenamento

- Schede a blocchi progressivi (Blocco 1 - Risveglio muscolare, Blocco 2 - Impostazione, ecc.).
- Registrazione sessioni svolte, con possibilità di eliminarle (con conferma).
- Sezione Statistiche con riepilogo settimanale e grafico di aderenza (quanti allenamenti fatti sul totale previsto).
- Streak (giorni/settimane consecutive di costanza) mostrati in home.

## Alimentazione

- Piano alimentare fisso con pasti, macro (kcal/proteine/carboidrati/grassi) e micronutrienti (vitamine, sali minerali, acqua) per ogni opzione di pasto.
- Anello circolare delle kcal + barre di progressione dei macro, che si aggiornano in tempo reale quando si spunta un pasto.
- Tab dedicati: Piano / Extra / Integratori.
- Database alimenti stile MyFitnessPal:
  - ricerca testuale di alimenti non presenti nel piano (tramite Open Food Facts);
  - scanner del codice a barre dei prodotti (fotocamera);
  - possibilità di indicare grammatura personalizzata e vedere macro + micronutrienti calcolati;
  - lista "aggiunti di recente" per richiamare velocemente alimenti già usati.
- Diario alimentare storico: cosa è stato segnato nei giorni passati.
- Lista della spesa generata automaticamente in base al piano e ai giorni scelti, con possibilità di spuntare gli articoli e condividerla.
- Obiettivi personalizzabili (kcal, acqua, macro) modificabili da chi ha un piano personale (non assegnato da PT).

## Notifiche e usabilità

- Promemoria push (via Firebase Cloud Messaging) per pasti non ancora segnati, scarsa idratazione, integratori serali — **predisposti nel codice ma non ancora attivi** (manca il completamento lato Firebase, vedi sotto).
- Pannello "Oggi" in home con riepilogo rapido: allenamenti della settimana, kcal residue, prossimo pasto, streak.
- Modali di conferma e spinner di caricamento coerenti con il resto della grafica dell'app (al posto dei popup di sistema del browser).

## Cosa resta in sospeso (attività tecniche, non urgenti)

Se in futuro vorrai riprendere il lavoro tecnico sull'app, questi sono gli unici punti aperti:

1. **Notifiche push**: servono la chiave VAPID di Firebase (da generare in Firebase Console) da inserire nel codice, l'attivazione del piano Blaze e il deploy della funzione cloud già scritta (`firebase deploy --only functions`).
2. **Regole di sicurezza Firestore** (`firestore.rules`): il file è pronto ma va incollato manualmente in Firebase Console → Firestore Database → Regole (non è mai stato necessario modificarlo, copre già tutto).
3. Verifica dal vivo dei valori nutrizionali presi da Open Food Facts (unità di misura di vitamine/minerali), da controllare la prima volta che si usa la ricerca/scansione in produzione.

Tutto il resto è completo, pubblicato e funzionante sul link sopra.
