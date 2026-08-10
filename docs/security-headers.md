# Security-Header-Baseline

## Aktueller Betrieb auf GitHub Pages

Die produktive Seite wird über GitHub Pages ausgeliefert. GitHub erzwingt HTTPS/HSTS, erlaubt für Pages-Projekte aber keine frei konfigurierbaren HTTP-Response-Header. Eine Netlify-/Cloudflare-Datei wie "_headers" wird deshalb bewusst nicht mitgeführt.

Aktuell wirksam sind:

- eine restriktive Meta-CSP für die Hauptseite, die 404-Seite und alle direkt aufrufbaren Unterseiten;
- exakte SHA-256-Freigaben für die noch vorhandenen Inline-Blöcke der lokalen Filmseiten;
- `no-referrer` als Referrer-Policy auf jeder Seite;
- lokal ausgelieferte Schriften, Modelle, Medien und Draco-WASM-Dateien;
- eingeschränkte `allow`-Attribute und `referrerpolicy="no-referrer"` auf den eingebetteten Monitorseiten;
- `/.well-known/security.txt` als standardisierter Meldeweg;
- ein Build-Check für CSP, Inline-Hashes, externe Laufzeitressourcen, Tracker, Formulare, Browser-Speicher, Source Maps, lokale Pfadlecks und den lokalen Draco-Decoder.

Die Meta-CSP kann keine Response-Header wie "frame-ancestors", "X-Content-Type-Options", Permissions Policy oder Cross-Origin-Isolation ersetzen.

## Zielkonfiguration bei einem späteren Proxy/Host

Sobald ein Host mit frei konfigurierbaren Response-Headern eingesetzt wird, soll folgende Baseline serverseitig gesetzt werden:

    Content-Security-Policy: default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'self' 'wasm-unsafe-eval'; script-src-attr 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; frame-src 'self'; frame-ancestors 'self'; form-action 'none'; manifest-src 'none'; upgrade-insecure-requests
    X-Content-Type-Options: nosniff
    Referrer-Policy: no-referrer
    X-Frame-Options: SAMEORIGIN
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Resource-Policy: same-origin
    Permissions-Policy: accelerometer=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), usb=()

"frame-ancestors 'self'" und "SAMEORIGIN" bleiben absichtlich auf Same-Origin statt "none"/"DENY", weil die Portfolio-Oberfläche eigene lokale Monitorseiten in Frames verwendet. COEP wird vorerst nicht aktiviert, um lokale Medien- und WASM-Flows nicht unnötig zu gefährden.

## Prüfung

    npm run build
    npm run check:security

Die statische Pruefung weist veroeffentlichte PDFs mit klassischen Dokumentmetadaten (`/Info`, XMP, Autor, Erstellungssoftware oder Zeitstempel) sowie Text-, EXIF- und XMP-Chunks in den Dokumentvorschauen ab. Damit koennen bereinigte Nachweise nicht unbemerkt durch eine spaetere Originaldatei mit Exportmetadaten ersetzt werden.

Zusätzlich ist im Browser zu prüfen, dass nur Ressourcen derselben Origin automatisch angefordert werden, keine CSP-Verletzungen auftreten und Raum, Monitorseiten, Dokumente und Zertifikate vollständig funktionieren.
