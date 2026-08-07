// Bib scanning for the check-in console.
//
// Uses the browser's built-in BarcodeDetector where it exists. There is no bundled QR
// library and the CSP blocks external scripts, so on browsers without it (Safari today)
// the scanner is hidden and manual code entry is offered instead. Both paths post to the
// same endpoint, so behaviour cannot drift between them.

(function () {
  const root = document.querySelector('[data-checkin-console]');
  if (!root) return;

  const scanner = root.querySelector('[data-scanner]');
  const manual = root.querySelector('[data-scan-manual]');
  if (!scanner || !manual) return;

  const eventId = root.dataset.eventId;
  const csrfToken = root.dataset.csrf || '';
  const supportsDetector = typeof window.BarcodeDetector === 'function';

  const video = scanner.querySelector('[data-scan-video]');
  const startButton = scanner.querySelector('[data-scan-start]');
  const stopButton = scanner.querySelector('[data-scan-stop]');
  const scanResult = scanner.querySelector('[data-scan-result]');
  const manualInput = manual.querySelector('[data-scan-manual-input]');
  const manualButton = manual.querySelector('[data-scan-manual-submit]');
  const manualResult = manual.querySelector('[data-scan-manual-result]');
  const unsupportedNote = manual.querySelector('[data-scan-unsupported]');

  // Manual entry is always available; the camera panel only when it can actually work.
  manual.hidden = false;
  if (supportsDetector) {
    scanner.hidden = false;
  } else if (unsupportedNote) {
    unsupportedNote.hidden = false;
  }

  let stream = null;
  let detector = null;
  let scanTimer = null;
  let lastScanned = '';
  let lastScannedAt = 0;

  function setResult(node, text, outcome) {
    if (!node) return;
    node.textContent = text;
    node.classList.remove('is-ok', 'is-warn', 'is-error');
    if (outcome === 'checked_in') node.classList.add('is-ok');
    else if (outcome === 'already_checked_in') node.classList.add('is-warn');
    else if (outcome) node.classList.add('is-error');
  }

  async function submitScan(scanned, resultNode) {
    setResult(resultNode, 'Checking…');
    try {
      const response = await fetch(`/organizer/events/${eventId}/check-in/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ scanned })
      });
      const payload = await response.json().catch(() => ({}));

      const parts = [payload.message || 'Could not read that code.'];
      if (Array.isArray(payload.warnings) && payload.warnings.length > 0) {
        parts.push(payload.warnings.join(' '));
      }
      setResult(resultNode, parts.join(' '), payload.outcome || 'invalid');

      // A successful check-in changes the roster below, so reflect it without a reload.
      if (payload.outcome === 'checked_in' && payload.participant?.bibNumber) {
        markRowCheckedIn(payload.participant.bibNumber);
      }
    } catch (error) {
      setResult(resultNode, 'Network error. Check connection and retry.', 'invalid');
    }
  }

  function markRowCheckedIn(bibNumber) {
    root.querySelectorAll('[data-checkin-row]').forEach(function (row) {
      const bib = row.querySelector('.checkin-bib');
      if (!bib || bib.textContent.trim() !== `#${bibNumber}`) return;
      row.classList.add('is-checked-in');
      const button = row.querySelector('[data-checkin-button]');
      if (button) button.remove();
      const status = row.querySelector('[data-checkin-status]');
      if (status) {
        status.textContent = 'Checked in';
        status.classList.add('checkin-row-status-done');
      }
    });
  }

  async function tick() {
    if (!detector || !video || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length === 0) return;

      const value = codes[0].rawValue;
      const now = Date.now();
      // A code stays in frame for many frames; without this the same bib would be
      // posted several times a second.
      if (value === lastScanned && now - lastScannedAt < 4000) return;
      lastScanned = value;
      lastScannedAt = now;

      await submitScan(value, scanResult);
    } catch (error) {
      // A single failed frame is not worth interrupting the operator over.
    }
  }

  async function start() {
    if (!supportsDetector) return;
    try {
      detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
      startButton.hidden = true;
      stopButton.hidden = false;
      setResult(scanResult, 'Point the camera at a race pass.');
      scanTimer = setInterval(tick, 400);
    } catch (error) {
      setResult(scanResult, 'Could not open the camera. Check permissions, or enter the code manually.', 'invalid');
      stop();
    }
  }

  function stop() {
    if (scanTimer) clearInterval(scanTimer);
    scanTimer = null;
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    if (video) {
      video.srcObject = null;
      video.hidden = true;
    }
    startButton.hidden = false;
    stopButton.hidden = true;
  }

  if (startButton) startButton.addEventListener('click', start);
  if (stopButton) stopButton.addEventListener('click', stop);
  window.addEventListener('pagehide', stop);

  function submitManual() {
    const value = manualInput ? manualInput.value.trim() : '';
    if (!value) {
      setResult(manualResult, 'Enter the code from the runner’s race pass.', 'invalid');
      return;
    }
    submitScan(value, manualResult).then(function () {
      if (manualInput) manualInput.value = '';
    });
  }

  if (manualButton) manualButton.addEventListener('click', submitManual);
  if (manualInput) {
    manualInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitManual();
      }
    });
  }
})();
