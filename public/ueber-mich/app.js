import { profileTextGraphics } from './profile-text-graphics.js';

const profileVariants = {
  de: {
    documentLanguage: 'de',
    segments: [
      {},
      {
        alt: 'Projekt IMU-gesteuerter Roboter Arm',
        href: 'https://github.com/p-keminer/remote-controlled-robot-arm'
      },
      {
        alt: 'Projekt IoT Alarm System',
        href: 'https://github.com/p-keminer/iot-alarm-system'
      },
      {}
    ]
  },
  en: {
    documentLanguage: 'en',
    segments: [
      {},
      {
        alt: 'IMU-controlled Robotic Arm project',
        href: 'https://github.com/p-keminer/remote-controlled-robot-arm'
      },
      {
        alt: 'IoT Alarm System project',
        href: 'https://github.com/p-keminer/iot-alarm-system'
      },
      {}
    ]
  }
};

const viewer = document.querySelector('[data-profile-readme]');
const languageButtons = [...document.querySelectorAll('[data-profile-language]')];
let activeLanguage = null;

function createTextSemantics(language) {
  const template = document.querySelector(`#profile-text-${language}`);
  const sections = Array.from({ length: 4 }, () => {
    const section = document.createElement('div');
    section.className = 'profile-readme__semantics';
    return section;
  });
  let sectionIndex = 0;
  for (const child of template.content.children) {
    if (child.hasAttribute('data-profile-segment')) {
      sectionIndex = Number(child.getAttribute('data-profile-segment'));
    }
    const copy = child.cloneNode(true);
    copy.removeAttribute('data-profile-segment');
    // The visible project segment already has one native link wrapper.
    // Keep its description in the reading order without a second hidden link.
    for (const link of copy.querySelectorAll('a')) link.replaceWith(...link.childNodes);
    sections[sectionIndex].append(copy);
  }
  return sections;
}

function renderProfile(language) {
  const resolvedLanguage = language === 'en' ? 'en' : 'de';
  const variant = profileVariants[resolvedLanguage];

  if (!(viewer instanceof HTMLElement) || activeLanguage === resolvedLanguage) {
    return;
  }

  const content = document.createDocumentFragment();
  const semantics = createTextSemantics(resolvedLanguage);
  for (const [index, segment] of variant.segments.entries()) {
    const graphicTemplate = document.createElement('template');
    // Generated only from the checked-in SVG assets, never from user input.
    graphicTemplate.innerHTML = profileTextGraphics[resolvedLanguage][index];
    const visual = graphicTemplate.content.firstElementChild;
    const wrapper = document.createElement('div');
    wrapper.className = 'profile-readme__section';
    wrapper.append(semantics[index]);
    if (segment.href) {
      const link = document.createElement('a');
      link.className = 'profile-readme__link';
      link.href = segment.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.draggable = false;
      link.setAttribute(
        'aria-label',
        resolvedLanguage === 'de'
          ? `${segment.alt} auf GitHub öffnen (neuer Tab)`
          : `Open ${segment.alt} on GitHub (new tab)`
      );
      link.append(visual);
      wrapper.append(link);
    } else {
      wrapper.append(visual);
    }
    content.append(wrapper);
  }
  viewer.replaceChildren(content);
  for (const svg of viewer.querySelectorAll('svg')) svg.setCurrentTime(0);
  viewer.lang = variant.documentLanguage;
  activeLanguage = resolvedLanguage;

  for (const button of languageButtons) {
    button.setAttribute(
      'aria-pressed',
      String(button.getAttribute('data-profile-language') === resolvedLanguage)
    );
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', resolvedLanguage);
  nextUrl.searchParams.delete('view');
  window.history.replaceState(null, '', nextUrl);
}

for (const button of languageButtons) {
  button.addEventListener('click', () => {
    renderProfile(button.getAttribute('data-profile-language'));
  });
}

const requested = new URL(window.location.href).searchParams;
renderProfile(requested.get('lang'));
