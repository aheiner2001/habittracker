(function () {
  const state = Become.loadState();
  const root = document.getElementById('app');
  const { headerHtml, navHtml } = Become.renderShell({ active: 'home' });
  root.innerHTML = `${headerHtml}<main><p class="tagline">Home</p></main>${navHtml}`;
  const err = document.getElementById('storage-error');
  const saved = Become.saveState(state);
  if (!saved.ok && err) {
    err.hidden = false;
    err.textContent = saved.error;
  }
})();
