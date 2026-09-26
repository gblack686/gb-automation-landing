/* Persistence belongs to the standalone app, never the private Studio bundle. */
(() => {
  const key = 'gbauto.agent-card-forge.visual-intake.v1';
  window.ForgeVisualIntake.mount(document, {
    catalog: JSON.parse(document.getElementById('catalog').textContent),
    briefTemplate: JSON.parse(document.getElementById('brief-template').textContent),
    load: () => JSON.parse(localStorage.getItem(key) || 'null'),
    save: draft => localStorage.setItem(key, JSON.stringify(draft)),
    savedLabel: 'Draft saved locally',
    restoredLabel: 'Local draft restored',
  });
})();
