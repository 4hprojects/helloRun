function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdownToHtml(line) {
  let result = escapeHtml(line);
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>');
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return result;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  const closeLists = () => {
    if (inUnorderedList) {
      html.push('</ul>');
      inUnorderedList = false;
    }
    if (inOrderedList) {
      html.push('</ol>');
      inOrderedList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeLists();
      continue;
    }

    if (/^---+$/.test(line)) {
      closeLists();
      html.push('<hr>');
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeLists();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineMarkdownToHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      if (inOrderedList) {
        html.push('</ol>');
        inOrderedList = false;
      }
      if (!inUnorderedList) {
        html.push('<ul>');
        inUnorderedList = true;
      }
      html.push(`<li>${inlineMarkdownToHtml(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (inUnorderedList) {
        html.push('</ul>');
        inUnorderedList = false;
      }
      if (!inOrderedList) {
        html.push('<ol>');
        inOrderedList = true;
      }
      html.push(`<li>${inlineMarkdownToHtml(orderedMatch[1])}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }

  closeLists();
  return html.join('\n');
}

module.exports = {
  markdownToHtml
};
