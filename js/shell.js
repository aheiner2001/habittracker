(function (root) {
  const Become = (root.Become = root.Become || {});

  function renderShell({ active, showSettings }) {
    const links = [
      { id: 'home', href: 'index.html', label: 'Home' },
      { id: 'habits', href: 'habits.html', label: 'Habits' },
      { id: 'lifestyle', href: 'lifestyle.html', label: 'Lifestyle' },
    ];
    const navHtml = `<nav class="bottom-nav" aria-label="Primary">${links
      .map(
        (l) =>
          `<a href="${l.href}" class="${l.id === active ? 'is-active' : ''}">${l.label}</a>`
      )
      .join('')}</nav>`;
    const headerHtml = `<header class="site-header">
      <p class="brand">Become</p>
      <div class="header-actions">
        <p class="page-date" id="shell-date"></p>
        ${
          showSettings
            ? `<button type="button" class="icon-btn" data-act="open-settings" aria-label="Settings" title="Settings">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"></path>
                </svg>
              </button>`
            : ''
        }
      </div>
    </header>`;
    return { headerHtml, navHtml };
  }

  Become.renderShell = renderShell;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderShell };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
