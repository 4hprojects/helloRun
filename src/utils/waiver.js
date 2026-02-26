const DEFAULT_WAIVER_TEMPLATE = `
<div class="waiver-card">
  <h4>Waiver and Release Form Acknowledgment</h4>
  <p>
    Please read and understand the following terms before signing. If you have any questions or
    require clarification on any of the terms, please let us know.
  </p>
  <ol>
    <li>
      <strong>Health Confirmation:</strong> I confirm that I am in good physical condition
      and have no medical reasons or impairments that might prevent my participation in this event.
      I have consulted with a healthcare provider if I had any concerns regarding my physical
      fitness or ability to participate safely.
    </li>
    <li>
      <strong>Risk Acknowledgment:</strong> I understand that participating in this event
      involves inherent risks. These include, but are not limited to, injuries such as sprains,
      fractures, and other physical or emotional injuries, as well as loss or damage to personal
      property.
    </li>
    <li>
      <strong>Liability Release:</strong> I hereby release {{ORGANIZER_NAME}}, its staff, volunteers, and
      partners from any and all claims, demands, and causes of action arising from any injury,
      loss, or damage I may suffer as a result of my participation in {{EVENT_TITLE}}.
      This release covers claims of negligence as well as those not currently known or foreseeable.
    </li>
    <li>
      <strong>Rules and Regulations:</strong> I agree to abide by all event rules and
      regulations as provided by the organizers, and acknowledge that noncompliance may result
      in my disqualification or removal from the event.
    </li>
    <li>
      <strong>Photo and Video Consent:</strong> I consent to the use of my image in event
      photos and videos for promotional purposes, unless I notify the organizers otherwise in
      writing prior to the event.
    </li>
    <li>
      <strong>Accuracy of Information:</strong> I confirm that all information provided
      in this registration form (including contact details and personal data) is true and
      correct to the best of my knowledge. I understand that providing false or misleading
      information may result in disqualification or denial of entry.
    </li>
    <li>
      <strong>Privacy and Data Use:</strong> I acknowledge that any personal information
      collected by the event organizer will be used solely for the administration and
      communication of this event. The organizer will not disclose or share my personal
      data with any third party for purposes unrelated to this event, in accordance with
      applicable data protection laws.
    </li>
    <li>
      <strong>Event Fees and Prizes:</strong> I understand that this event is free to enter.
      I also acknowledge that any rewards, giveaways, or prizes, if offered, are not guaranteed
      and are subject to change at the discretion of the event organizers.
    </li>
  </ol>
</div>
`.trim();

function normalizeWaiverTemplate(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
}

function renderWaiverTemplate(template, context = {}) {
  const source = normalizeWaiverTemplate(template) || DEFAULT_WAIVER_TEMPLATE;
  const organizerName = String(context.organizerName || 'the organizer').trim() || 'the organizer';
  const eventTitle = String(context.eventTitle || 'this event').trim() || 'this event';

  return source
    .replace(/\{\{\s*ORGANIZER_NAME\s*\}\}/g, organizerName)
    .replace(/\{\{\s*EVENT_TITLE\s*\}\}/g, eventTitle);
}

module.exports = {
  DEFAULT_WAIVER_TEMPLATE,
  normalizeWaiverTemplate,
  renderWaiverTemplate
};
