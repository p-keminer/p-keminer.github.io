const IMPRESSUM_TEXT = `
<h2>Impressum</h2>
<p>Angaben gemäß § 5 TMG</p>

<h3>Verantwortlich</h3>
<p>
  Philip Keminer<br>
  44627 Herne
</p>
<p>
  E-Mail: <a href="mailto:p-keminer@gmx.de">p-keminer@gmx.de</a>
</p>

<h3>Hinweis</h3>
<p>
  Diese Website ist eine private, nicht-kommerzielle Portfolio-Präsentation.
  Sie dient ausschließlich der beruflichen Selbstdarstellung und enthält kein
  Angebot von Dienstleistungen oder Waren.
</p>
`;

const DATENSCHUTZ_TEXT = `
<h2>Datenschutzerklärung</h2>

<h3>Verantwortlicher</h3>
<p>
  Philip Keminer, 44627 Herne<br>
  E-Mail: <a href="mailto:p-keminer@gmx.de">p-keminer@gmx.de</a>
</p>

<h3>Hosting</h3>
<p>
  Diese Website wird über <strong>GitHub Pages</strong> (GitHub B.V., Prins
  Bernhardplein 200, 1097 JB Amsterdam, Niederlande; Muttergesellschaft: GitHub Inc.,
  USA) gehostet. Beim Abrufen der Seite verarbeitet GitHub technische Zugriffsdaten
  einschließlich Ihrer IP-Adresse in Server-Logs.<br>
  Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO (berechtigtes Interesse
  an der Bereitstellung der Website).<br>
  Weitere Informationen:
  <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
     target="_blank" rel="noopener">GitHub Privacy Statement</a>
</p>

<h3>3D-Modell-Dekompression</h3>
<p>
  Beim Laden des 3D-Bereichs wird einmalig ein technischer Decoder von
  <strong>gstatic.com</strong> (Google LLC, USA) eingebunden. Dies ist eine reine
  technische Hilfsbibliothek zur Dekompression von 3D-Modellen (Draco-Codec).
  Es findet kein Tracking statt.<br>
  Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;f DSGVO (berechtigtes Interesse
  an der technisch korrekten Darstellung der Inhalte).<br>
  Datenschutzerklärung Google:
  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>
</p>

<h3>Drittlandübermittlung</h3>
<p>
  Durch die Nutzung von GitHub Pages und des Draco-Decoders (Google) werden Daten
  in die USA übermittelt. Beide Anbieter sind unter dem
  <strong>EU-U.S. Data Privacy Framework</strong> zertifiziert, das ein angemessenes
  Datenschutzniveau gemäß Art.&nbsp;45 DSGVO gewährleistet.
</p>

<h3>Keine Cookies, kein Tracking</h3>
<p>
  Diese Website verwendet keine Cookies, kein Tracking und keine Analyse-Tools.
  Es werden keine personenbezogenen Daten über die oben genannten technischen
  Zugriffsdaten hinaus erhoben oder gespeichert.
</p>

<h3>Ihre Rechte</h3>
<p>
  Sie haben gemäß DSGVO folgende Rechte bezüglich Ihrer personenbezogenen Daten:
</p>
<ul>
  <li>Auskunft über gespeicherte Daten (Art.&nbsp;15 DSGVO)</li>
  <li>Berichtigung unrichtiger Daten (Art.&nbsp;16 DSGVO)</li>
  <li>Löschung Ihrer Daten (Art.&nbsp;17 DSGVO)</li>
  <li>Einschränkung der Verarbeitung (Art.&nbsp;18 DSGVO)</li>
  <li>Datenübertragbarkeit (Art.&nbsp;20 DSGVO)</li>
  <li>Widerspruch gegen die Verarbeitung (Art.&nbsp;21 DSGVO)</li>
</ul>
<p>
  Wenden Sie sich dazu an die oben genannte E-Mail-Adresse.
</p>

<h3>Aufsichtsbehörde</h3>
<p>
  Zuständige Aufsichtsbehörde für Datenschutzbeschwerden in NRW:<br>
  Landesbeauftragte für Datenschutz und Informationsfreiheit NRW (LDI NRW)<br>
  Postfach 20 04 44, 40102 Düsseldorf<br>
  <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener">www.ldi.nrw.de</a>
</p>
`;

let currentTab: 'impressum' | 'datenschutz' = 'impressum';
let isVisible = false;

export function showLegalOverlay(tab: 'impressum' | 'datenschutz'): void {
  const overlay = document.getElementById('legal-overlay');
  if (!overlay) return;

  if (!isVisible || currentTab !== tab) {
    currentTab = tab;
    renderOverlayContent(overlay, tab);
  }

  if (!isVisible) {
    isVisible = true;
    overlay.classList.add('legal-overlay--visible');
  }
}

export function hideLegalOverlay(): void {
  if (!isVisible) return;
  const overlay = document.getElementById('legal-overlay');
  if (!overlay) return;
  isVisible = false;
  overlay.classList.remove('legal-overlay--visible');
}

function renderOverlayContent(overlay: HTMLElement, activeTab: 'impressum' | 'datenschutz'): void {
  const content = activeTab === 'impressum' ? IMPRESSUM_TEXT : DATENSCHUTZ_TEXT;
  overlay.innerHTML = `
    <div class="legal-overlay__inner">
      <div class="legal-overlay__tabs">
        <button
          class="legal-overlay__tab ${activeTab === 'impressum' ? 'legal-overlay__tab--active' : ''}"
          data-legal-switch="impressum"
          type="button"
        >Impressum</button>
        <button
          class="legal-overlay__tab ${activeTab === 'datenschutz' ? 'legal-overlay__tab--active' : ''}"
          data-legal-switch="datenschutz"
          type="button"
        >Datenschutz</button>
      </div>
      <div class="legal-overlay__content">${content}</div>
    </div>
  `;

  overlay.querySelectorAll<HTMLButtonElement>('[data-legal-switch]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.legalSwitch as 'impressum' | 'datenschutz';
      if (tab && tab !== currentTab) {
        showLegalOverlay(tab);
      }
    });
  });
}
