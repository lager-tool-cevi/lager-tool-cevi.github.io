# Lager-Tool in Google einrichten

Das Tool läuft als Google Apps Script mit einer Google-Tabelle als Speicher. Alles bleibt in **deinem** Google-Konto. Die anderen brauchen kein Konto, nur den Link.

**Wichtig:** Nimm ein **privates Google-Konto** (z.B. @gmail.com) oder ein Konto des Cevi. Mit einem Schul- oder Firmenkonto ist «Zugriff: Jeder» oft gesperrt, und das Team kommt nicht rein.

## 1. Tabelle und Skript anlegen

1. Auf [sheets.google.com](https://sheets.google.com) eine **leere Tabelle** erstellen, z.B. «Lager-Tool».
2. In der Tabelle: **Erweiterungen → Apps Script**.
3. Im Editor gibt es eine Datei `Code.gs`. Ihren Inhalt löschen und den Inhalt von **Code.gs** hineinkopieren.
4. Links bei «Dateien» auf **+ → Skript** und die Datei `Seed` nennen. Inhalt von **Seed.gs** hineinkopieren.
5. Links auf **+ → HTML** und die Datei `Index` nennen (ohne .html). Inhalt von **Index.html** hineinkopieren.
6. Genauso je eine HTML-Datei für **Daten**, **Programm1**, **Programm2**, **Programm3**, **Programm4** und **Programm5** anlegen (Namen genau so, ohne .html) und den Inhalt der gleichnamigen Datei hineinkopieren. Das Programm ist auf mehrere Dateien verteilt, weil der Editor sehr grosse Dateien abschneidet.
7. Oben auf 💾 **Speichern**. Links müssen jetzt 9 Dateien stehen: Code.gs, Seed.gs, Index, Daten, Programm1 bis Programm5.

## 2. Einrichten (einmal)

1. Oben in der Werkzeugleiste die Funktion **einrichten** wählen und auf **▶ Ausführen** klicken.
2. Google fragt nach Berechtigungen. Das Tool braucht:
   - **Tabellen**: Hier werden die Daten gespeichert.
   - **Google Drive**: für hochgeladene Bilder und Dateien (Ordner «Lager-Tool Dateien») und die wöchentliche Sicherung (Ordner «Lager-Tool Sicherungen»).
   - **Mail senden**: für «Admin-Passwort vergessen» (an lagerleitung@cevi-staefa-hombi.ch) und die freiwilligen Erinnerungs-Mails.
   - **Zeitgesteuert ausführen**: jeden Sonntag um 18 Uhr Sicherung und Erinnerungen.
3. Bei «Google hat diese App nicht überprüft»: **Erweitert** → **Zu Lager-Tool wechseln (unsicher)** → **Zulassen**. Das ist normal bei eigenen Skripten.
4. Unten im Protokoll steht «Fertig eingerichtet».

## 3. Als Web-App veröffentlichen

1. Oben rechts **Bereitstellen → Neue Bereitstellung**.
2. Beim Zahnrad **Web-App** wählen.
3. **Ausführen als: Ich**, **Zugriff: Jeder**.
4. **Bereitstellen**. Den **Web-App-Link** kopieren: Das ist der Link für alle.
5. Im Tool unter **Einstellungen › Zugang & Export** erscheint der Link mit QR-Code und einer Kurzanleitung fürs Team.

## Passwörter

| Was | Start-Passwort | Ändern |
|---|---|---|
| Admin (Zahnrad auf der Startseite) | `LaLei-Cevi` | Zahnrad → «Admin-Passwort ändern» |
| Lagerpasswort PfiLa 2027 | `PfiLa2027` | Zahnrad → Lagerpasswort |

- **Lagerleitung**: Beim ersten Anmelden das Lagerpasswort eingeben und dabei ein eigenes Passwort festlegen. Danach immer mit dem eigenen.
- **Team**: Kein Passwort, nur den Namen antippen. Das Team sieht nur seinen Bereich.
- **Passwort vergessen (Lagerleitung)**: Admin setzt es im Zahnrad zurück. Dann wieder mit dem Lagerpasswort anmelden.
- **Admin-Passwort vergessen**: «Passwort vergessen?» im Zahnrad. Ein neues Passwort geht an lagerleitung@cevi-staefa-hombi.ch.
- Anmeldungen laufen nach **60 Tagen** ab. Bei einem verlorenen Handy: Zahnrad → **Alle abmelden**.
- Passwörter sind nur verschlüsselt gespeichert (Skript-Eigenschaften), nicht in der Tabelle.

## Sicherungen

- Jeden **Sonntag** legt das Tool eine Kopie der Tabelle im Ordner **«Lager-Tool Sicherungen»** ab (die letzten 12 bleiben).
- **Jetzt sichern** und **Zurückspielen** gehen im Zahnrad. Vor dem Zurückspielen zeigt das Tool, was sich ändert.
- In der Tabelle das Blatt `_daten` bitte **nicht von Hand ändern**.

## Später etwas ändern

Wenn du eine neue Version der Dateien bekommst:
1. Inhalte von `Code.gs`, `Index`, `Daten` und `Programm1` bis `Programm5` ersetzen (Seed.gs ist nur beim ersten Mal nötig). Kommt ein Programm-Teil dazu oder fällt weg, steht das in der Lieferung.
2. **Bereitstellen → Bereitstellungen verwalten → ✏️ Bearbeiten → Version: Neue Version → Bereitstellen**. Der Link bleibt gleich.

## Gut zu wissen

- **Keine Gesundheitsdaten** von Teilnehmenden ins Tool. Dafür habt ihr euer anderes Tool.
- Das Team sieht Namen der Teilnehmenden (für Zimmer, Gruppen und Abzählen), aber keine Bemerkungen.
- Hochgeladene Bilder und Dateien sind für alle mit dem Datei-Link sichtbar (wie ein geteilter Drive-Link).
- Wetter: Das Tool holt die Vorhersage bei open-meteo.com (ohne Anmeldung, ohne persönliche Daten).
