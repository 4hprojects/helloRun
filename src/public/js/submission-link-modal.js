(function () {
  const modal = document.querySelector('[data-submission-hub-modal]');
  if (!modal) return;

  const dialog = modal.querySelector('.submission-hub-modal-dialog');
  const title = modal.querySelector('[data-submission-hub-modal-title]');
  const frame = modal.querySelector('[data-submission-hub-modal-frame]');
  const openNew = modal.querySelector('[data-submission-hub-modal-open-new]');
  const closeButtons = modal.querySelectorAll('[data-submission-hub-modal-close]');
  let activeLink = null;

  function openModal(link) {
    activeLink = link;
    const href = link.getAttribute('href');
    if (!href) return;

    title.textContent = link.dataset.modalTitle || link.textContent.trim() || 'Submission';
    openNew.href = href;
    frame.src = href;
    modal.hidden = false;
    document.body.classList.add('submission-hub-modal-open');
    dialog.focus();
  }

  function closeModal() {
    modal.hidden = true;
    frame.src = 'about:blank';
    document.body.classList.remove('submission-hub-modal-open');
    if (activeLink) activeLink.focus();
    activeLink = null;
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest('[data-submission-modal-link]');
    if (!link) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openModal(link);
  });

  closeButtons.forEach(function (button) {
    button.addEventListener('click', closeModal);
  });

  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });

  document.addEventListener('keydown', function (event) {
    if (!modal.hidden && event.key === 'Escape') closeModal();
  });
})();
