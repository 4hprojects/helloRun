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
  let tableRows = [];

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
  const closeTable = () => {
    if (!tableRows.length) return;
    const rows = tableRows.slice();
    tableRows = [];
    const hasSeparator = rows.length > 1 && rows[1].every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
    const bodyRows = hasSeparator ? rows.slice(2) : rows.slice(1);
    html.push('<table>');
    html.push('<thead><tr>');
    rows[0].forEach((cell) => html.push(`<th>${inlineMarkdownToHtml(cell.trim())}</th>`));
    html.push('</tr></thead>');
    if (bodyRows.length) {
      html.push('<tbody>');
      bodyRows.forEach((row) => {
        html.push('<tr>');
        row.forEach((cell) => html.push(`<td>${inlineMarkdownToHtml(cell.trim())}</td>`));
        html.push('</tr>');
      });
      html.push('</tbody>');
    }
    html.push('</table>');
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeLists();
      closeTable();
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      closeLists();
      tableRows.push(line.split('|').slice(1, -1).map((cell) => cell.trim()));
      continue;
    }
    closeTable();

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
  closeTable();
  return html.join('\n');
}

module.exports = {
  markdownToHtml
};
