(function () {
  'use strict';

  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (_error) { /* Text labels remain usable. */ }
  }

  const state = { modal: null, trigger: null };

  function focusable(dialog) {
    return Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
  }

  function setPageInert(modal, inert) {
    Array.from(document.body.children).forEach((node) => {
      if (node !== modal && node.tagName !== 'SCRIPT') node.inert = inert;
    });
  }

  function closeDialog(modal, { restoreFocus = true } = {}) {
    if (!modal || modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    setPageInert(modal, false);
    document.body.classList.remove('no-scroll');
    if (state.modal === modal) state.modal = null;
    const trigger = state.trigger;
    state.trigger = null;
    if (restoreFocus && trigger && document.contains(trigger)) trigger.focus();
  }

  function openDialog(modal, trigger) {
    if (!modal) return;
    if (state.modal && state.modal !== modal) closeDialog(state.modal, { restoreFocus: false });
    state.modal = modal;
    state.trigger = trigger || document.activeElement;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    setPageInert(modal, true);
    document.body.classList.add('no-scroll');
    const dialog = modal.querySelector('[role="dialog"]');
    const items = dialog ? focusable(dialog) : [];
    (items[0] || dialog || modal).focus();
  }

  document.querySelectorAll('.organizer-event-media-dialog').forEach((modal) => {
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog(modal);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = modal.querySelector('[role="dialog"]');
      const items = dialog ? focusable(dialog) : [];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });

  document.querySelectorAll('.copy-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const text = button.dataset.copyText || (button.dataset.copyPath ? `${window.location.origin}${button.dataset.copyPath}` : '');
      if (!text) return;
      const original = button.textContent;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        button.textContent = 'Copied';
      } catch (_error) {
        button.textContent = 'Copy failed';
      }
      window.setTimeout(() => { button.textContent = original; }, 1400);
    });
  });

  (function initGallery() {
    const modal = document.getElementById('organizerGalleryLightbox');
    if (!modal) return;
    const buttons = Array.from(document.querySelectorAll('.detail-gallery-thumb-btn'));
    const image = document.getElementById('organizerGalleryLightboxImage');
    const counter = document.getElementById('organizerGalleryLightboxCounter');
    const close = document.getElementById('organizerGalleryCloseBtn');
    const prev = document.getElementById('organizerGalleryPrevBtn');
    const next = document.getElementById('organizerGalleryNextBtn');
    const backdrop = modal.querySelector('[data-close-lightbox="1"]');
    const items = buttons.map((button) => ({
      src: button.dataset.gallerySrc || '',
      alt: button.querySelector('img')?.alt || 'Gallery image'
    }));
    let index = 0;

    function render() {
      const item = items[index];
      if (!item) return;
      image.src = item.src;
      image.alt = item.alt;
      counter.textContent = `${index + 1} / ${items.length}`;
    }
    function show(offset) {
      index = (index + offset + items.length) % items.length;
      render();
    }
    buttons.forEach((button, buttonIndex) => button.addEventListener('click', () => {
      index = buttonIndex;
      render();
      openDialog(modal, button);
    }));
    close.addEventListener('click', () => closeDialog(modal));
    backdrop?.addEventListener('click', () => closeDialog(modal));
    prev.addEventListener('click', () => show(-1));
    next.addEventListener('click', () => show(1));
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(1); }
    });
  })();

  (function initPoster() {
    const trigger = document.querySelector('.detail-poster-thumb-btn');
    const modal = document.getElementById('organizerPosterLightbox');
    if (!trigger || !modal) return;
    const image = document.getElementById('organizerPosterLightboxImage');
    const close = document.getElementById('organizerPosterCloseBtn');
    const zoomIn = document.getElementById('organizerPosterZoomInBtn');
    const zoomOut = document.getElementById('organizerPosterZoomOutBtn');
    const reset = document.getElementById('organizerPosterResetBtn');
    const backdrop = modal.querySelector('[data-close-poster-lightbox="1"]');
    let zoom = 1;
    let x = 0;
    let y = 0;
    let dragging = false;
    let startX = 0;
    let startY = 0;

    function render() {
      image.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
      image.classList.toggle('is-zoomed', zoom > 1);
      image.style.cursor = zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in';
      zoomIn.disabled = zoom >= 3;
      zoomOut.disabled = zoom <= 1;
    }
    function setZoom(value) {
      zoom = Math.max(1, Math.min(3, Number(value.toFixed(2))));
      if (zoom === 1) { x = 0; y = 0; }
      render();
    }
    function resetView() { dragging = false; x = 0; y = 0; setZoom(1); }
    function closePoster() { closeDialog(modal); resetView(); }

    trigger.addEventListener('click', () => {
      image.src = trigger.dataset.posterSrc || '';
      image.alt = trigger.querySelector('img')?.alt || 'Promotional poster';
      resetView();
      openDialog(modal, trigger);
    });
    close.addEventListener('click', closePoster);
    backdrop?.addEventListener('click', closePoster);
    zoomIn.addEventListener('click', () => setZoom(zoom + .25));
    zoomOut.addEventListener('click', () => setZoom(zoom - .25));
    reset.addEventListener('click', resetView);
    image.addEventListener('pointerdown', (event) => {
      if (zoom <= 1) return;
      dragging = true;
      startX = event.clientX - x;
      startY = event.clientY - y;
      image.setPointerCapture?.(event.pointerId);
      render();
    });
    image.addEventListener('pointermove', (event) => {
      if (!dragging || zoom <= 1) return;
      x = event.clientX - startX;
      y = event.clientY - startY;
      render();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => image.addEventListener(name, () => {
      if (!dragging) return;
      dragging = false;
      render();
    }));
  })();
})();
