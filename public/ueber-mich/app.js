const profileVariants = {
  de: {
    documentLanguage: 'de',
    segments: [
      {
        src: './assets/profile-de-intro.svg',
        alt: 'Profil von Philip Keminer: Begrüßung, Schwerpunkte und aktuelle Projekte'
      },
      {
        src: './assets/profile-de-project-arm.svg',
        alt: 'Projekt IMU-gesteuerter Roboter Arm',
        href: 'https://github.com/p-keminer/remote-controlled-robot-arm'
      },
      {
        src: './assets/profile-de-project-alarm.svg',
        alt: 'Projekt IoT Alarm System',
        href: 'https://github.com/p-keminer/iot-alarm-system'
      },
      {
        src: './assets/profile-de-rest.svg',
        alt: 'Tech Stack, Entwicklung, Design und langfristiges Ziel'
      }
    ]
  },
  en: {
    documentLanguage: 'en',
    segments: [
      {
        src: './assets/profile-en-intro.svg',
        alt: 'Profile of Philip Keminer: introduction, focus areas and current projects'
      },
      {
        src: './assets/profile-en-project-arm.svg',
        alt: 'IMU-controlled Robotic Arm project',
        href: 'https://github.com/p-keminer/remote-controlled-robot-arm'
      },
      {
        src: './assets/profile-en-project-alarm.svg',
        alt: 'IoT Alarm System project',
        href: 'https://github.com/p-keminer/iot-alarm-system'
      },
      {
        src: './assets/profile-en-rest.svg',
        alt: 'Tech stack, development, design and long-term goal'
      }
    ]
  }
};

const viewer = document.querySelector('[data-profile-readme]');
const languageButtons = [...document.querySelectorAll('[data-profile-language]')];

function renderProfile(language) {
  const resolvedLanguage = language === 'en' ? 'en' : 'de';
  const variant = profileVariants[resolvedLanguage];

  if (!(viewer instanceof HTMLElement)) {
    return;
  }

  const content = document.createDocumentFragment();

  for (const segment of variant.segments) {
    const image = document.createElement('img');
    image.className = 'profile-readme__segment';
    image.src = segment.src;
    image.alt = segment.alt;
    image.decoding = 'async';
    image.loading = 'eager';

    if (segment.href) {
      const link = document.createElement('a');
      link.className = 'profile-readme__link';
      link.href = segment.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute(
        'aria-label',
        resolvedLanguage === 'de'
          ? `${segment.alt} auf GitHub öffnen (neuer Tab)`
          : `Open ${segment.alt} on GitHub (new tab)`
      );
      link.append(image);
      content.append(link);
    } else {
      content.append(image);
    }
  }

  viewer.replaceChildren(content);
  viewer.lang = variant.documentLanguage;

  for (const button of languageButtons) {
    button.setAttribute(
      'aria-pressed',
      String(button.getAttribute('data-profile-language') === resolvedLanguage)
    );
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('lang', resolvedLanguage);
  window.history.replaceState(null, '', nextUrl);
}

for (const button of languageButtons) {
  button.addEventListener('click', () => {
    renderProfile(button.getAttribute('data-profile-language'));
  });
}

const requestedLanguage = new URL(window.location.href).searchParams.get('lang');
renderProfile(requestedLanguage);
