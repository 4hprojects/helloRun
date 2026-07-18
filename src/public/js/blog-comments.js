(async function initializeHelloRunComments() {
  'use strict';
  const host = document.querySelector('[data-blog-comments]');
  if (!host) return;

  try {
    await import('/js/threaded-comments-component.js');
    const element = host.querySelector('threaded-comments') || document.createElement('threaded-comments');
    if (!element.parentNode) host.appendChild(element);
    const slug = String(host.dataset.postSlug || '');
    const currentUserId = String(host.dataset.currentUserId || '');
    element.configure({
      resourceKey: slug,
      endpointBase: `/blog/${encodeURIComponent(slug)}/comments`,
      authenticated: Boolean(currentUserId),
      actor: currentUserId ? { id: currentUserId } : null,
      csrfToken: String(host.dataset.csrfToken || ''),
      loginDestination: `/login?redirect=${encodeURIComponent(`/blog/${slug}#blogComments`)}`,
      locale: 'en-PH',
      policy: {
        maxContentLength: 1000,
        maxReportNoteLength: 500,
        editWindowMs: 30 * 60 * 1000,
        maxEdits: 5,
        replyPreviewSize: 3,
        reportReasons: ['spam', 'plagiarism', 'promotion', 'unsafe_medical', 'abuse', 'other']
      },
      labels: {
        title: 'Comments',
        reportReasons: {
          spam: 'Spam or repeated messages',
          plagiarism: 'Copied or impersonated comment',
          promotion: 'Advertising or unwanted promotion',
          unsafe_medical: 'Dangerous health or medical advice',
          abuse: 'Harassment, hate, or abusive language',
          other: 'Another concern about this comment'
        }
      }
    });

    const syncCount = (event) => {
      const count = Number(event.detail?.totalContributions ?? event.detail?.count);
      if (!Number.isFinite(count)) return;
      ['blogCommentCount', 'blogContributionCount'].forEach((id) => {
        const node = document.getElementById(id);
        if (node) node.textContent = count.toLocaleString('en-US');
      });
    };
    element.addEventListener('threaded-comments-count-change', syncCount);
    element.addEventListener('threaded-comments-error', (event) => {
      if (typeof window.showToast === 'function') window.showToast(event.detail?.error?.message || 'Comment action failed.');
    });
  } catch (error) {
    const status = host.querySelector('[data-comments-bootstrap-status]');
    if (status) status.textContent = 'Comments could not be loaded. Refresh the page to try again.';
    console.error('Comment component initialization failed:', error);
  }
})();
