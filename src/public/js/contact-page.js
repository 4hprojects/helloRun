'use strict';

(function contactPageModule(globalObject, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalObject) globalObject.HelloRunContactPage = api;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', api.initContactPage);
    else api.initContactPage();
  }
})(typeof window !== 'undefined' ? window : globalThis, function createContactPageApi() {
  const normalizeSingleLine = (value, limit = 300) => String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, limit);

  const normalizeDescription = (value) => String(value || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, 1000);

  function buildMailDraft(options = {}) {
    const supportEmail = normalizeSingleLine(options.supportEmail, 254);
    const privacyEmail = normalizeSingleLine(options.privacyEmail, 254);
    const inbox = options.inbox === 'privacy' ? 'privacy' : 'support';
    const recipient = inbox === 'privacy' ? privacyEmail : supportEmail;
    const topicLabel = normalizeSingleLine(options.topicLabel, 100) || 'Support request';
    const subjectLabel = normalizeSingleLine(options.subjectLabel, 120) || topicLabel;
    const accountEmail = normalizeSingleLine(options.accountEmail, 254);
    const context = normalizeSingleLine(options.context, 300);
    const reference = normalizeSingleLine(options.reference, 120);
    const actorRole = normalizeSingleLine(options.actorRole, 40) || 'Guest';
    const source = options.source === 'organizer-dashboard' ? 'Organizer dashboard' : '';
    const description = normalizeDescription(options.description);
    const subject = `[HelloRun Support] ${subjectLabel}${reference ? ` — ${reference.slice(0, 50)}` : ''}`;
    const body = [
      'HelloRun support request',
      '',
      `Topic: ${topicLabel}`,
      `Account email: ${accountEmail || 'Not provided'}`,
      `Visitor role: ${actorRole}`,
      `Related event or page: ${context || 'Not provided'}`,
      `Reference code: ${reference || 'Not provided'}`,
      ...(source ? [`Opened from: ${source}`] : []),
      '',
      'Issue and requested outcome:',
      description
    ].join('\n');

    return {
      recipient,
      subject,
      body,
      href: `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    };
  }

  function initContactPage() {
    const form = document.querySelector('[data-contact-composer]');
    if (!form || form.dataset.contactEnhanced === 'true') return;
    form.dataset.contactEnhanced = 'true';

    const topic = form.querySelector('[data-contact-topic]');
    const topicHint = form.querySelector('[data-contact-topic-hint]');
    const description = form.querySelector('[data-contact-description]');
    const count = form.querySelector('[data-contact-count]');
    const recipient = form.querySelector('[data-contact-recipient]');
    const status = form.querySelector('[data-contact-status]');

    const selectedTopic = () => topic?.selectedOptions?.[0] || null;
    const selectedRecipient = () => selectedTopic()?.dataset.inbox === 'privacy'
      ? form.dataset.privacyEmail
      : form.dataset.supportEmail;

    const updateTopic = () => {
      const option = selectedTopic();
      if (topicHint) topicHint.textContent = option?.dataset.hint || 'Select a topic so the draft reaches the right inbox.';
      if (recipient) recipient.textContent = selectedRecipient();
    };

    const updateCount = () => {
      if (count && description) count.textContent = `${description.value.length} / 1000`;
    };

    topic?.addEventListener('change', updateTopic);
    description?.addEventListener('input', updateCount);
    updateTopic();
    updateCount();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const option = selectedTopic();
      const draft = buildMailDraft({
        supportEmail: form.dataset.supportEmail,
        privacyEmail: form.dataset.privacyEmail,
        inbox: option?.dataset.inbox,
        topicLabel: option?.textContent,
        subjectLabel: option?.dataset.subject,
        accountEmail: form.elements.accountEmail?.value,
        context: form.elements.context?.value,
        reference: form.elements.reference?.value,
        description: form.elements.description?.value,
        actorRole: form.dataset.actorRole,
        source: form.dataset.source
      });

      if (status) status.textContent = `Opening a draft addressed to ${draft.recipient}. Your message has not been sent yet.`;
      globalObject.location.href = draft.href;
    });
  }

  return { buildMailDraft, initContactPage, normalizeDescription, normalizeSingleLine };
});
