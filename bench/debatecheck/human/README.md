# Validazione umana (300 frasi)

Due persone etichettano **indipendentemente** le stesse 300 frasi, senza vedere i giudizi dei modelli
(questi fogli non li contengono). Persona A usa `sheet-A.csv`, persona B usa `sheet-B.csv`: sono le
stesse 300 frasi in ordine diverso. Non confrontatevi finché non avete finito.

## Cosa fare per ogni riga

1. Leggi la **mozione** (il tema del dibattito), la **frase** detta da un modello e le **prove**
   (3-5 passaggi, ognuno con un id come `W0023|` o `P19|`).
2. Rispondi alla domanda: **le prove contraddicono la frase?** Cioè: un passaggio dà un numero, una
   data, un nome, un luogo, un'unità, una direzione (sale/scende) o un esito **diverso** per la stessa
   cosa di cui parla la frase, oppure dice il contrario?
3. Scrivi nella colonna `label` una di queste tre parole:
   - `si` = almeno un passaggio contraddice la frase;
   - `no` = nessun passaggio la contraddice (la conferma, o non ne parla);
   - `incerto` = non riesci a decidere (usalo il meno possibile).
4. Se vuoi, in `notes` scrivi l'id del passaggio che contraddice o due parole di motivo.

Regole:
- Giudica **solo** rispetto ai passaggi mostrati, non a quello che sai tu.
- Una frase può essere vera nel mondo reale ma contraddetta dai passaggi: in quel caso è `si`.
- Non serve controllare il resto della frase: basta che un dettaglio sia contraddetto.
- Tempo indicativo: 30-60 secondi a riga, 3-4 ore in totale, si può fare in più sessioni.

Il file si apre con Google Sheets, Numbers o Excel (importa come CSV, separatore virgola). Salvate con lo
stesso nome aggiungendo il vostro nome, per esempio `sheet-A-michele.csv`, e rimettetelo in questa
cartella. La chiave (`key.jsonl`) dice quali frasi erano state alterate: **non guardarla** prima di aver
finito.

---

English summary: two people independently label the same 300 sentences (sheet A and sheet B, same items
in different orders). For each row, read the motion, the sentence and the 3-5 evidence passages and answer
whether the passages contradict the sentence: `si` (yes), `no`, or `incerto` (unsure, use sparingly).
Judge only against the passages shown. The key file reveals which sentences were altered; do not open it
before finishing.
