const navigationItems = [
  {
    label: 'Home',
    href: 'student-dashboard.html',
    match: (page, hash) => page === 'student-dashboard.html' && !hash,
    icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="5" rx="1.5"></rect><rect x="14" y="12" width="7" height="9" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect>'
  },
  {
    label: 'Join a class',
    href: 'student-dashboard.html#join-class',
    match: (page, hash) => page === 'student-dashboard.html' && hash === '#join-class',
    icon: '<path d="M6 12h4m-2-2v4"></path><path d="M15.5 11h.01M18 14h.01"></path><path d="M7.5 5h9a4 4 0 0 1 3.8 2.8l1.2 4.1a3 3 0 0 1-4.9 3l-2.1-1.8h-5l-2.1 1.8a3 3 0 0 1-4.9-3l1.2-4.1A4 4 0 0 1 7.5 5Z"></path>'
  },
  {
    label: 'Learn',
    href: 'student-learn.html',
    match: (page) => page === 'student-learn.html',
    icon: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"></path><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h6"></path>'
  },
  {
    label: 'My progress',
    href: 'student-dashboard.html#my-progress',
    match: (page, hash) => page === 'student-dashboard.html' && hash === '#my-progress',
    icon: '<path d="M4 19V5m0 14h17"></path><path d="m7 15 4-4 3 2 5-6"></path><path d="M16 7h3v3"></path>'
  },
  {
    label: 'Profile',
    href: 'student-profile.html',
    match: (page) => page === 'student-profile.html',
    icon: '<circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>'
  }
];

const currentPage = window.location.pathname.split('/').pop() || 'student-dashboard.html';
const currentHash = window.location.hash;
const studentSidebarStorageKey = 'mazeprog-student-sidebar-collapsed';

document.body.classList.add('has-student-sidebar');

try {
  if (localStorage.getItem(studentSidebarStorageKey) === 'true' && window.matchMedia('(min-width: 761px)').matches) {
    document.body.classList.add('student-sidebar-collapsed');
  }
} catch (error) {
  console.warn('Student navigation preference could not be restored.', error);
}

const sidebar = document.createElement('aside');
sidebar.className = 'student-sidebar';
sidebar.id = 'studentSidebar';
sidebar.setAttribute('aria-label', 'Student navigation');

const sidebarTop = document.createElement('div');
sidebarTop.className = 'student-sidebar__top';

const brand = document.createElement('a');
brand.className = 'student-sidebar__brand';
brand.href = 'student-dashboard.html';
brand.setAttribute('aria-label', 'MazeProg home');
brand.innerHTML = '<img src="assets/mazeprog-logo.png" alt=""><span class="student-sidebar__brand-copy"><strong>MazeProg</strong><span>Student workspace</span></span>';

const collapseButton = document.createElement('button');
collapseButton.className = 'student-sidebar__toggle';
collapseButton.type = 'button';
collapseButton.setAttribute('aria-label', 'Collapse navigation');
collapseButton.setAttribute('aria-expanded', 'true');
collapseButton.setAttribute('aria-controls', 'studentSidebar');
collapseButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"></path><path d="M20 4v16"></path></svg>';

sidebarTop.append(brand, collapseButton);

const sectionLabel = document.createElement('p');
sectionLabel.className = 'student-sidebar__section-label';
sectionLabel.textContent = 'Learning space';

const nav = document.createElement('nav');
nav.className = 'student-sidebar__nav';

navigationItems.forEach((item) => {
  const link = document.createElement('a');
  link.className = 'student-sidebar__link';
  link.href = item.href;
  link.title = item.label;
  link.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg><span>${item.label}</span>`;

  if (item.match(currentPage, currentHash)) {
    link.setAttribute('aria-current', 'page');
  }

  nav.append(link);
});

const footer = document.createElement('div');
footer.className = 'student-sidebar__footer';
footer.textContent = 'Learn at your own pace.';

sidebar.append(sidebarTop, sectionLabel, nav, footer);

const mobileToggle = document.createElement('button');
mobileToggle.className = 'student-sidebar__mobile-toggle';
mobileToggle.type = 'button';
mobileToggle.setAttribute('aria-label', 'Open navigation');
mobileToggle.setAttribute('aria-expanded', 'false');
mobileToggle.setAttribute('aria-controls', 'studentSidebar');
mobileToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>';

const backdrop = document.createElement('button');
backdrop.className = 'student-sidebar__backdrop';
backdrop.type = 'button';
backdrop.tabIndex = -1;
backdrop.setAttribute('aria-label', 'Close navigation');

document.body.prepend(backdrop);
document.body.prepend(sidebar);
document.body.prepend(mobileToggle);

function setCollapsed(collapsed) {
  document.body.classList.toggle('student-sidebar-collapsed', collapsed);
  collapseButton.setAttribute('aria-expanded', String(!collapsed));
  collapseButton.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
  collapseButton.innerHTML = collapsed
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"></path><path d="M20 4v16"></path></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"></path><path d="M20 4v16"></path></svg>';

  try {
    localStorage.setItem(studentSidebarStorageKey, String(collapsed));
  } catch (error) {
    console.warn('Student navigation preference could not be saved.', error);
  }
}

function setMobileOpen(open) {
  document.body.classList.toggle('student-sidebar-open', open);
  mobileToggle.setAttribute('aria-expanded', String(open));
  mobileToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
}

collapseButton.addEventListener('click', () => {
  setCollapsed(!document.body.classList.contains('student-sidebar-collapsed'));
});

mobileToggle.addEventListener('click', () => {
  setMobileOpen(!document.body.classList.contains('student-sidebar-open'));
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
      setCollapsed(localStorage.getItem(studentSidebarStorageKey) === 'true');
    } catch (error) {
      console.warn('Student navigation preference could not be read.', error);
    }
  } else {
    document.body.classList.remove('student-sidebar-collapsed');
  }
});
