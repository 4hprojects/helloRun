/* runner-submissions.js
 * Handles the tiles / table view toggle on /runner/submissions.
 * Preference is persisted in localStorage under the key 'submissionsView'.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'submissionsView';
  var DEFAULT_VIEW = 'tiles';

  var entryList  = null; // <ul id="subEntryList">
  var entryTable = null; // <div id="subTableWrap">
  var toggleBtns = [];   // [data-view] buttons

  function setView(mode) {
    if (mode !== 'tiles' && mode !== 'table') mode = DEFAULT_VIEW;

    var showList  = mode === 'tiles';
    var showTable = mode === 'table';

    if (entryList)  entryList.style.display  = showList  ? '' : 'none';
    if (entryTable) entryTable.style.display = showTable ? 'block' : 'none';

    toggleBtns.forEach(function (btn) {
      var active = btn.getAttribute('data-view') === mode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}

    // Re-init Lucide icons that were hidden on initial page load
    if (showTable && window.lucide) {
      window.lucide.createIcons();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    entryList  = document.getElementById('subEntryList');
    entryTable = document.getElementById('subTableWrap');
    toggleBtns = Array.prototype.slice.call(
      document.querySelectorAll('[data-view]')
    );

    // Nothing to toggle if there are no entries
    if (!entryList && !entryTable) return;

    var saved;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (_) {}

    setView(saved || DEFAULT_VIEW);

    toggleBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setView(btn.getAttribute('data-view'));
      });
    });
  });
})();
