(function () {
  const root = document.getElementById('app');
  const { headerHtml, navHtml } = Become.renderShell({ active: 'habits' });
  root.innerHTML = `${headerHtml}<main><p class="tagline">Habits</p></main>${navHtml}`;
})();
