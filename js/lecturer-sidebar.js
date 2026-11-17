const navigationItems = [
  {
    label: 'Overview',
    href: 'lecturer-dashboard.html',
    match: ['lecturer-dashboard.html'],
    icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect>'
  },
  {
    label: 'Create session',
    href: 'create-game-session.html',
    match: ['create-game-session.html'],
    icon: '<path d="M6 12h4m-2-2v4"></path><path d="M15.5 11h.01M18 14h.01"></path><path d="M7.5 5h9a4 4 0 0 1 3.8 2.8l1.2 4.1a3 3 0 0 1-4.9 3l-2.1-1.8h-5l-2.1 1.8a3 3 0 0 1-4.9-3l1.2-4.1A4 4 0 0 1 7.5 5Z"></path>'
  },
  {
    label: 'Question bank',
    href: 'lecturer-question-bank.html',
    match: ['lecturer-question-bank.html'],
    icon: '<path d="M8 6h13M8 12h13M8 18h13"></path><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"></path>'
  },
  {
    label: 'Student analytics',
    href: 'analytics.html',
    match: ['analytics.html'],
    icon: '<path d="M4 19V5m0 14h17"></path><path d="m7 15 4-4 3 2 5-6"></path><path d="M16 7h3v3"></path>'
  },
  {
    label: 'Lecturer profile',
    href: 'lecturer-profile.html',
    match: ['lecturer-profile.html'],
    icon: '<circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>'
  }
];

const currentPage = window.location.pathname.split('/').pop() || 'lecturer-dashboard.html';
const storageKey = 'mazeprog-lecturer-sidebar-collapsed';

document.body.classList.add('has-lecturer-sidebar');

try {
  if (localStorage.getItem(storageKey) === 'true' && window.matchMedia('(min-width: 761px)').matches) {
    document.body.classList.add('lecturer-sidebar-collapsed');
  }
} catch (error) {
  console.warn('Sidebar preference could not be restored.', error);
}

const sidebar = document.createElement('aside');
sidebar.className = 'lecturer-sidebar';
sidebar.id = 'lecturerSidebar';
sidebar.setAttribute('aria-label', 'Lecturer navigation');

const sidebarTop = document.createElement('div');
sidebarTop.className = 'lecturer-sidebar__top';

const brand = document.createElement('a');
brand.className = 'lecturer-sidebar__brand';
brand.href = 'lecturer-dashboard.html';
brand.setAttribute('aria-label', 'MazeProg overview');
brand.innerHTML = '<img src="assets/mazeprog-logo.png" alt=""><span class="lecturer-sidebar__brand-copy"><strong>MazeProg</strong><span>Lecturer workspace</span></span>';

const collapseButton = document.createElement('button');
collapseButton.className = 'lecturer-sidebar__toggle';
collapseButton.type = 'button';
collapseButton.setAttribute('aria-label', 'Collapse navigation');
collapseButton.setAttribute('aria-expanded', 'true');
collapseButton.setAttribute('aria-controls', 'lecturerSidebar');
collapseButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"></path><path d="M20 4v16"></path></svg>';

sidebarTop.append(brand, collapseButton);

const sectionLabel = document.createElement('p');
sectionLabel.className = 'lecturer-sidebar__section-label';
sectionLabel.textContent = 'Workspace';

const nav = document.createElement('nav');
nav.className = 'lecturer-sidebar__nav';

navigationItems.forEach((item) => {
  const link = document.createElement('a');
  link.className = 'lecturer-sidebar__link';
  link.href = item.href;
  link.title = item.label;
  link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg><span>${item.label}</span>`;

  if (item.match.includes(currentPage)) {
    link.setAttribute('aria-current', 'page');
  }

  nav.append(link);
});

const footer = document.createElement('div');
footer.className = 'lecturer-sidebar__footer';
footer.textContent = 'Your teaching tools, all in one place.';

sidebar.append(sidebarTop, sectionLabel, nav, footer);

const mobileToggle = document.createElement('button');
mobileToggle.className = 'lecturer-sidebar__mobile-toggle';
mobileToggle.type = 'button';
mobileToggle.setAttribute('aria-label', 'Open navigation');
mobileToggle.setAttribute('aria-expanded', 'false');
mobileToggle.setAttribute('aria-controls', 'lecturerSidebar');
mobileToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>';

const backdrop = document.createElement('button');
backdrop.className = 'lecturer-sidebar__backdrop';
backdrop.type = 'button';
backdrop.tabIndex = -1;
backdrop.setAttribute('aria-label', 'Close navigation');

document.body.prepend(backdrop);
document.body.prepend(sidebar);
document.body.prepend(mobileToggle);

function setCollapsed(collapsed) {
  document.body.classList.toggle('lecturer-sidebar-collapsed', collapsed);
  collapseButton.setAttribute('aria-expanded', String(!collapsed));
  collapseButton.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
  collapseButton.innerHTML = collapsed
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"></path><path d="M20 4v16"></path></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"></path><path d="M20 4v16"></path></svg>';

  try {
    localStorage.setItem(storageKey, String(collapsed));
  } catch (error) {
    console.warn('Sidebar preference could not be saved.', error);
  }
}

function setMobileOpen(open) {
  document.body.classList.toggle('lecturer-sidebar-open', open);
  mobileToggle.setAttribute('aria-expanded', String(open));
  mobileToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}

collapseButton.addEventListener('click', () => {
  setCollapsed(!document.body.classList.contains('lecturer-sidebar-collapsed'));
});

mobileToggle.addEventListener('click', () => {
  setMobileOpen(!document.body.classList.contains('lecturer-sidebar-open'));
});

backdrop.addEventListener('click', () => setMobileOpen(false));
nav.addEventListener('click', (event) => {
  if (event.target.closest('a')) setMobileOpen(false);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMobileOpen(false);
});

window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
  setMobileOpen(false);
  if (event.matches) {
    try {
      setCollapsed(localStorage.getItem(storageKey) === 'true');
    } catch (error) {
      console.warn('Sidebar preference could not be read.', error);
    }
  } else {
    document.body.classList.remove('lecturer-sidebar-collapsed');
  }
});
