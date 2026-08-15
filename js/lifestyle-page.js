(function () {
  const root = document.getElementById('app');
  const { headerHtml, navHtml } = Become.renderShell({ active: 'lifestyle' });
  root.innerHTML = `${headerHtml}<main><p class="tagline">Lifestyle</p></main>${navHtml}`;
})();
