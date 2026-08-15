(function (root) {
  const Become = (root.Become = root.Become || {});

  function renderShell({ active }) {
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
      <p class="page-date" id="shell-date"></p>
    </header>`;
    return { headerHtml, navHtml };
  }

  Become.renderShell = renderShell;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderShell };
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
