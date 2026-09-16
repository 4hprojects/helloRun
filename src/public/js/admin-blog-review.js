    (function () {
      const reviewConfig = JSON.parse(document.getElementById("adminBlogReviewConfig")?.textContent || "{}");
      const autosaveForm = document.getElementById("adminAutosaveForm");
      const autosaveStatus = document.getElementById("autosaveStatus");
      const changedFieldsLabel = document.getElementById("adminChangedFields");
      const categorySelect = document.getElementById("adminCategory");
      const customCategoryWrap = document.getElementById("adminCustomCategoryWrap");
      const tagsInput = document.getElementById("adminTags");
      const postSlugEl = document.getElementById("adminPostSlug");
      const postStatusEl = document.getElementById("adminPostStatus");
      const postReadingTimeEl = document.getElementById("adminPostReadingTime");
      const moderationStatusBadge = document.getElementById("moderationStatusBadge");
      const adminComposer = document.getElementById("adminStructuredComposer");
      const adminBlockList = document.getElementById("adminComposerBlockList");
      const adminPreview = document.getElementById("adminComposerPreview");
      const adminContentBlocksInput = document.getElementById("adminContentBlocksJson");
      const adminContentHtml = document.getElementById("adminContentHtml");
      const adminCoverUrl = document.getElementById("adminCoverImageUrl");
      let currentWorkflowStatus = String(reviewConfig.sourceStatus || reviewConfig.status || "");
      let currentContentVersion = Number(reviewConfig.contentVersion || 0);
      let currentEditVersion = reviewConfig.editVersion === null ? null : Number(reviewConfig.editVersion || 0);

      const editTab = document.getElementById("adminEditTab");
      const previewTab = document.getElementById("adminPreviewTab");
      const editorPanel = document.getElementById("adminEditorPanel");
      const previewPanel = document.getElementById("adminPreviewPanel");
      const setReviewMode = function (mode) {
        const previewing = mode === "preview";
        if (editorPanel) editorPanel.hidden = previewing;
        if (previewPanel) previewPanel.hidden = !previewing;
        editTab?.setAttribute("aria-selected", String(!previewing));
        previewTab?.setAttribute("aria-selected", String(previewing));
      };
      editTab?.addEventListener("click", () => setReviewMode("edit"));
      previewTab?.addEventListener("click", () => setReviewMode("preview"));

      const rejectionTemplate = document.getElementById("rejectionTemplate");
      rejectionTemplate?.addEventListener("change", function () {
        const reason = document.getElementById("rejectionReason");
        if (reason && rejectionTemplate.value) {
          reason.value = rejectionTemplate.value;
          reason.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      const scheduleWrap = document.getElementById("scheduledForWrap");
      const populateLocalSchedule = (localId, hiddenId) => {
        const local = document.getElementById(localId);
        const hidden = document.getElementById(hiddenId);
        const date = new Date(String(hidden?.value || ""));
        if (!local || !Number.isFinite(date.getTime())) return;
        local.value = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      };
      populateLocalSchedule("scheduledForLocal", "scheduledFor");
      populateLocalSchedule("rescheduleForLocal", "rescheduleFor");
      document.querySelectorAll('input[name="publicationMode"]').forEach((radio) => radio.addEventListener("change", function () {
        const scheduled = document.querySelector('input[name="publicationMode"]:checked')?.value === "scheduled";
        if (scheduleWrap) scheduleWrap.hidden = !scheduled;
        const local = document.getElementById("scheduledForLocal");
        if (local) local.required = scheduled;
      }));
      const adminCoverFile = document.getElementById("adminCoverImageFile");
      const adminCoverPreview = document.getElementById("adminCoverPreview");
      const adminCoverState = document.getElementById("adminCoverUploadState");
      const adminArticleCover = document.getElementById("adminArticleCover");
      const adminGalleryUrls = document.getElementById("adminGalleryImageUrls");
      const adminGalleryFiles = document.getElementById("adminGalleryImageFiles");
      const adminGalleryPreview = document.getElementById("adminGalleryPreview");
      const adminGallerySlots = document.getElementById("adminGallerySlots");
      const adminGalleryState = document.getElementById("adminGalleryUploadState");
      const adminTemplateBlocks = reviewConfig.templateBlocksByKey || {};
      const adminBlockLabels = reviewConfig.blockLabels || {};
      let adminBlocks = Array.isArray(reviewConfig.contentBlocks) ? reviewConfig.contentBlocks : [];
      let scheduleAutosave = function () {};
      let flushAutosave = async function () { return true; };
      let pendingCoverFile = null;
      let pendingGalleryFiles = [];
      let pendingInlineUpload = null;
      let coverObjectUrl = "";

      const setAutosaveState = function (state, message) {
        if (!autosaveStatus) return;
        autosaveStatus.dataset.state = state;
        autosaveStatus.textContent = message;
      };

      const setChangedFields = function (fields) {
        if (!changedFieldsLabel) return;
        if (!Array.isArray(fields) || fields.length === 0) {
          changedFieldsLabel.textContent = "Changed fields: none";
          return;
        }
        changedFieldsLabel.textContent = "Changed fields: " + fields.join(", ");
      };

      const syncCustomCategoryVisibility = function () {
        if (!categorySelect || !customCategoryWrap) return;
        customCategoryWrap.style.display = categorySelect.value === "Other" ? "" : "none";
      };

      syncCustomCategoryVisibility();
      if (categorySelect) {
        categorySelect.addEventListener("change", syncCustomCategoryVisibility);
      }

      const escapeHtml = function (value) {
        return String(value || "").replace(/[&<>"']/g, function (char) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
        });
      };

      const formatInlineText = function (value) {
        return normalizeAdminInlineMarkers(escapeHtml(value))
          .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
          .replace(/_([^_\n]+)_/g, "<em>$1</em>")
          .replace(/\+\+([^+\n]+)\+\+/g, "<u>$1</u>")
          .replace(/\n/g, "<br>");
      };

      const normalizeAdminInlineMarkers = function (value) {
        let next = String(value || "");
        let previous = "";
        while (next !== previous) {
          previous = next;
          next = next
            .replace(/\*{4}([^*\n]+)\*{4}/g, "**$1**")
            .replace(/_{2}([^_\n]+)_{2}/g, "_$1_")
            .replace(/\+{4}([^+\n]+)\+{4}/g, "++$1++")
            .replace(/([A-Za-z0-9])(\*\*|\*|_|\+\+)([A-Za-z0-9])/g, "$1$3");
        }
        return next;
      };

      const blockToHtml = function (block) {
        if (!block) return "";
        if (block.type === "heading") {
          const tag = Number(block.metadata?.level) === 3 ? "h3" : "h2";
          return "<" + tag + ">" + escapeHtml(block.content?.text || "") + "</" + tag + ">";
        }
        if (block.type === "textSection") return renderAdminTextSectionPreview(block.content?.text || "");
        if (block.type === "paragraph") return "<p>" + formatInlineText(block.content?.text || "") + "</p>";
        if (block.type === "quote") return "<blockquote>" + formatInlineText(block.content?.text || "") + "</blockquote>";
        if (block.type === "closing") return "<p><strong>" + formatInlineText(block.content?.text || "") + "</strong></p>";
        if (block.type === "bulletList" || block.type === "numberedList") {
          const tag = block.type === "numberedList" ? "ol" : "ul";
          const items = Array.isArray(block.content?.items) ? block.content.items : [];
          return "<" + tag + ">" + items.map((item) => "<li>" + escapeHtml(item) + "</li>").join("") + "</" + tag + ">";
        }
        if (block.type === "image") {
          const url = String(block.content?.url || "").trim();
          if (!url) return "<p><em>Image block needs a URL.</em></p>";
          const caption = String(block.content?.caption || "").trim();
          return '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(block.content?.alt || "") + '" loading="lazy">' +
            (caption ? "<p><em>" + escapeHtml(caption) + "</em></p>" : "");
        }
        return "<hr>";
      };

      const renderAdminTextSectionPreview = function (value) {
        const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
        const chunks = [];
        let paragraph = [];
        let listItems = [];
        let listType = "";
        const flushParagraph = function () {
          if (!paragraph.length) return;
          chunks.push("<p>" + formatInlineText(paragraph.join(" ")) + "</p>");
          paragraph = [];
        };
        const flushList = function () {
          if (!listItems.length) return;
          const tag = listType === "ol" ? "ol" : "ul";
          chunks.push("<" + tag + ' class="blog-text-section-list">' + listItems.map((item) => "<li>" + formatInlineText(item) + "</li>").join("") + "</" + tag + ">");
          listItems = [];
          listType = "";
        };
        lines.forEach((rawLine) => {
          const line = rawLine.trim();
          if (!line) {
            flushParagraph();
            flushList();
            return;
          }
          const bullet = line.match(/^[-*]\s*(.+)$/);
          const numbered = line.match(/^\d+[.)]\s+(.+)$/);
          if (bullet || numbered) {
            const nextType = bullet ? "ul" : "ol";
            flushParagraph();
            if (listType && listType !== nextType) flushList();
            listType = nextType;
            listItems.push(bullet ? bullet[1] : numbered[1]);
            return;
          }
          flushList();
          paragraph.push(line);
        });
        flushParagraph();
        flushList();
        return chunks.join("\n");
      };

      const makeAdminBlock = function (type) {
        if (type === "heading") return { type, content: { text: "" }, metadata: { level: 2 } };
        if (type === "bulletList" || type === "numberedList") return { type, content: { items: [""] }, metadata: {} };
        if (type === "image") return { type, content: { url: "", alt: "", caption: "" }, metadata: {} };
        if (type === "divider") return { type, content: {}, metadata: {} };
        return { type, content: { text: "" }, metadata: {} };
      };

      const adminListToolsMarkup = function () {
        return '<button type="button" data-action="bullet" title="Formats selected lines as a bullet list." aria-label="Format selected lines as a bullet list"><i data-lucide="list"></i><span class="tool-tooltip">Bullets</span></button>' +
          '<button type="button" data-action="numbered" title="Formats selected lines as a numbered list." aria-label="Format selected lines as a numbered list"><i data-lucide="list-ordered"></i><span class="tool-tooltip">Numbers</span></button>';
      };

      const adminInlineToolsMarkup = function () {
        return '<button type="button" data-action="bold" title="Make selected text bold." aria-label="Make selected text bold"><i data-lucide="bold"></i><span class="tool-tooltip">Bold</span></button>' +
          '<button type="button" data-action="italic" title="Make selected text italic." aria-label="Make selected text italic"><i data-lucide="italic"></i><span class="tool-tooltip">Italic</span></button>' +
          '<button type="button" data-action="underline" title="Underline selected text." aria-label="Underline selected text"><i data-lucide="underline"></i><span class="tool-tooltip">Underline</span></button>';
      };

      const adminTextToolsMarkup = function (includeLists, className) {
        return '<div class="' + className + '">' + (includeLists ? adminListToolsMarkup() : "") + adminInlineToolsMarkup() + "</div>";
      };

      const convertAdminBlockType = function (block, nextType) {
        if (!block || block.type === nextType) return block;
        const text = block.content?.text || (Array.isArray(block.content?.items) ? block.content.items.join("\n") : "");
        const next = makeAdminBlock(nextType);
        if (nextType === "bulletList" || nextType === "numberedList") {
          next.content.items = String(text || "")
            .split(/\n|\. /)
            .map((item) => item.replace(/^[-*]\s*/, "").trim())
            .filter(Boolean);
          if (!next.content.items.length) next.content.items = [""];
        } else if (["textSection", "paragraph", "quote", "closing", "heading"].includes(nextType)) {
          next.content.text = String(text || "").trim();
        }
        return next;
      };

      const normalizeAdminBlocksForSave = function () {
        return adminBlocks.map((block, index) => ({
          type: block.type,
          order: index,
          content: block.content || {},
          metadata: block.metadata || {}
        }));
      };

      const syncAdminComposerOutput = function () {
        if (!adminComposer) return;
        const savedBlocks = normalizeAdminBlocksForSave();
        const html = savedBlocks.map(blockToHtml).join("\n");
        if (adminContentBlocksInput) adminContentBlocksInput.value = JSON.stringify(savedBlocks);
        if (adminContentHtml) adminContentHtml.value = html;
        if (adminPreview) adminPreview.innerHTML = html || "<p><em>No blocks yet.</em></p>";
      };

      const renderAdminBlock = function (block, index) {
        const article = document.createElement("article");
        article.className = "admin-composer-block";
        article.innerHTML =
          '<div class="admin-composer-block-head">' +
            "<h4>" + escapeHtml(adminBlockLabels[block.type] || block.type) + "</h4>" +
            '<select class="admin-composer-block-type" data-action="type"></select>' +
            '<div class="admin-composer-actions">' +
              '<button type="button" data-action="up" title="Move block up" aria-label="Move block up"><i data-lucide="arrow-up"></i><span class="tool-tooltip">Move up</span></button>' +
              '<button type="button" data-action="down" title="Move block down" aria-label="Move block down"><i data-lucide="arrow-down"></i><span class="tool-tooltip">Move down</span></button>' +
              '<button type="button" data-action="remove" title="Remove block" aria-label="Remove block"><i data-lucide="trash-2"></i><span class="tool-tooltip">Remove</span></button>' +
            "</div>" +
          "</div>" +
          '<div data-fields></div>';
        const fields = article.querySelector("[data-fields]");
        const typeSelect = article.querySelector('[data-action="type"]');
        if (typeSelect) {
          Object.keys(adminBlockLabels).forEach((key) => {
            const option = document.createElement("option");
            option.value = key;
            option.textContent = adminBlockLabels[key] || key;
            option.selected = key === block.type;
            typeSelect.appendChild(option);
          });
          typeSelect.addEventListener("change", () => {
            adminBlocks[index] = convertAdminBlockType(block, typeSelect.value);
            renderAdminComposer();
            scheduleAutosave();
          });
        }
        if (block.type === "heading") {
          fields.innerHTML = '<select data-field="level"><option value="2">Heading 2</option><option value="3">Heading 3</option></select><input data-field="text" type="text" maxlength="140">';
          fields.querySelector('[data-field="level"]').value = String(block.metadata?.level || 2);
          fields.querySelector('[data-field="text"]').value = block.content?.text || "";
        } else if (block.type === "textSection") {
          fields.innerHTML = adminTextToolsMarkup(true, "admin-text-section-tools") + '<textarea data-field="text" rows="7" placeholder="Write paragraphs, then format selected lines."></textarea><small style="color:#64748b;">Use Bullets, Numbers, Bold, Italic, or Underline to format selected text.</small>';
          fields.querySelector('[data-field="text"]').value = block.content?.text || "";
        } else if (block.type === "paragraph") {
          fields.innerHTML = adminTextToolsMarkup(true, "admin-inline-text-tools") + '<textarea data-field="text" rows="3"></textarea><small style="color:#64748b;">Use Bullets, Numbers, Bold, Italic, or Underline to format selected text.</small>';
          fields.querySelector('[data-field="text"]').value = block.content?.text || "";
        } else if (["quote", "closing"].includes(block.type)) {
          fields.innerHTML = adminTextToolsMarkup(false, "admin-inline-text-tools") + '<textarea data-field="text" rows="3"></textarea><small style="color:#64748b;">Select text, then use Bold, Italic, or Underline.</small>';
          fields.querySelector('[data-field="text"]').value = block.content?.text || "";
        } else if (block.type === "bulletList" || block.type === "numberedList") {
          fields.innerHTML = adminTextToolsMarkup(false, "admin-inline-text-tools") + '<textarea data-field="items" rows="4" placeholder="One item per line"></textarea><small style="color:#64748b;">Select item text, then use Bold, Italic, or Underline.</small>';
          fields.querySelector('[data-field="items"]').value = (block.content?.items || []).join("\n");
        } else if (block.type === "image") {
          fields.innerHTML = '<input data-field="url" type="text" inputmode="url" autocomplete="url" placeholder="Image URL or /images/... path"><input data-field="alt" type="text" maxlength="180" placeholder="Alt text"><input data-field="caption" type="text" maxlength="240" placeholder="Caption"><label class="admin-image-upload-label">Upload or replace<input data-field="inline-file" type="file" accept="image/jpeg,image/png,image/webp"></label><small data-field="inline-state" class="admin-upload-state">JPEG/PNG uploads are converted to WebP.</small>';
          fields.querySelector('[data-field="url"]').value = block.content?.url || "";
          fields.querySelector('[data-field="alt"]').value = block.content?.alt || "";
          fields.querySelector('[data-field="caption"]').value = block.content?.caption || "";
          fields.querySelector('[data-field="inline-file"]')?.addEventListener("change", function (event) {
            const file = event.target.files?.[0];
            if (!file) return;
            pendingInlineUpload = { file, block };
            const state = fields.querySelector('[data-field="inline-state"]');
            if (state) state.textContent = "Pending upload: " + file.name;
            scheduleAutosave();
          });
        } else {
          fields.innerHTML = '<small style="color:#64748b;">Divider line.</small>';
        }
        const applyFieldChanges = function () {
          const textField = fields.querySelector('[data-field="text"]');
          const itemsField = fields.querySelector('[data-field="items"]');
          const levelField = fields.querySelector('[data-field="level"]');
          if (textField) block.content.text = textField.value;
          if (itemsField) block.content.items = itemsField.value.split("\n").map((item) => item.trim()).filter(Boolean);
          if (levelField) block.metadata.level = Number(levelField.value) === 3 ? 3 : 2;
          ["url", "alt", "caption"].forEach((key) => {
            const field = fields.querySelector('[data-field="' + key + '"]');
            if (field) block.content[key] = field.value;
          });
          syncAdminComposerOutput();
          scheduleAutosave();
        };
        article.addEventListener("input", applyFieldChanges);
        article.addEventListener("change", applyFieldChanges);
        fields.querySelector('[data-action="bullet"]')?.addEventListener("click", () => {
          toggleAdminTextSectionPrefix(fields.querySelector('[data-field="text"]'), "- ");
          const textField = fields.querySelector('[data-field="text"]');
          if (textField) block.content.text = textField.value;
          syncAdminComposerOutput();
          scheduleAutosave();
        });
        fields.querySelector('[data-action="numbered"]')?.addEventListener("click", () => {
          toggleAdminTextSectionPrefix(fields.querySelector('[data-field="text"]'), "1. ");
          const textField = fields.querySelector('[data-field="text"]');
          if (textField) block.content.text = textField.value;
          syncAdminComposerOutput();
          scheduleAutosave();
        });
        fields.querySelector('[data-action="bold"]')?.addEventListener("click", () => {
          wrapAdminSelectedText(fields.querySelector('[data-field="text"]') || fields.querySelector('[data-field="items"]'), "**", "**");
          const textField = fields.querySelector('[data-field="text"]');
          const itemsField = fields.querySelector('[data-field="items"]');
          if (textField) block.content.text = textField.value;
          if (itemsField) block.content.items = itemsField.value.split("\n").map((item) => item.trim()).filter(Boolean);
          syncAdminComposerOutput();
          scheduleAutosave();
        });
        fields.querySelector('[data-action="italic"]')?.addEventListener("click", () => {
          wrapAdminSelectedText(fields.querySelector('[data-field="text"]') || fields.querySelector('[data-field="items"]'), "_", "_");
          const textField = fields.querySelector('[data-field="text"]');
          const itemsField = fields.querySelector('[data-field="items"]');
          if (textField) block.content.text = textField.value;
          if (itemsField) block.content.items = itemsField.value.split("\n").map((item) => item.trim()).filter(Boolean);
          syncAdminComposerOutput();
          scheduleAutosave();
        });
        fields.querySelector('[data-action="underline"]')?.addEventListener("click", () => {
          wrapAdminSelectedText(fields.querySelector('[data-field="text"]') || fields.querySelector('[data-field="items"]'), "++", "++");
          const textField = fields.querySelector('[data-field="text"]');
          const itemsField = fields.querySelector('[data-field="items"]');
          if (textField) block.content.text = textField.value;
          if (itemsField) block.content.items = itemsField.value.split("\n").map((item) => item.trim()).filter(Boolean);
          syncAdminComposerOutput();
          scheduleAutosave();
        });
        article.querySelector('[data-action="up"]').addEventListener("click", () => {
          if (index > 0) [adminBlocks[index - 1], adminBlocks[index]] = [adminBlocks[index], adminBlocks[index - 1]];
          renderAdminComposer();
          scheduleAutosave();
        });
        article.querySelector('[data-action="down"]').addEventListener("click", () => {
          if (index < adminBlocks.length - 1) [adminBlocks[index + 1], adminBlocks[index]] = [adminBlocks[index], adminBlocks[index + 1]];
          renderAdminComposer();
          scheduleAutosave();
        });
        article.querySelector('[data-action="remove"]').addEventListener("click", () => {
          adminBlocks.splice(index, 1);
          renderAdminComposer();
          scheduleAutosave();
        });
        return article;
      };

      function renderAdminComposer() {
        if (!adminComposer || !adminBlockList) return;
        adminBlockList.innerHTML = "";
        adminBlocks.forEach((block, index) => adminBlockList.appendChild(renderAdminBlock(block, index)));
        if (window.lucide) lucide.createIcons();
        syncAdminComposerOutput();
      }

      function toggleAdminTextSectionPrefix(textarea, prefix) {
        if (!textarea) return;
        const value = textarea.value;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || start;
        const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const lineEndIndex = value.indexOf("\n", end);
        const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
        const selected = value.slice(lineStart, lineEnd);
        const lines = selected.split("\n");
        const isNumberedMode = prefix === "1. ";
        const markerPattern = isNumberedMode ? /^\d+[.)]\s+/ : /^[-*]\s*/;
        const shouldRemove = lines.every((line) => !line.trim() || markerPattern.test(line.trimStart()));
        let number = 1;
        const nextLines = lines.map((line) => {
          if (!line.trim()) return line;
          const indent = line.match(/^\s*/)[0];
          const clean = line.trimStart().replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s+/, "");
          if (shouldRemove) return indent + clean;
          if (isNumberedMode) return indent + (number++) + ". " + clean;
          return indent + prefix + clean;
        });
        textarea.value = value.slice(0, lineStart) + nextLines.join("\n") + value.slice(lineEnd);
        textarea.focus();
        textarea.selectionStart = lineStart;
        textarea.selectionEnd = lineStart + nextLines.join("\n").length;
      }

      function wrapAdminSelectedText(textarea, before, after) {
        if (!textarea) return;
        const value = textarea.value;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || start;
        const selected = value.slice(start, end);
        const fallback = "text";
        const duplicateBefore = before + before;
        const duplicateAfter = after + after;
        const hasDuplicateWrappedSelection = selected &&
          selected.startsWith(duplicateBefore) &&
          selected.endsWith(duplicateAfter) &&
          selected.length >= duplicateBefore.length + duplicateAfter.length;
        const hasWrappedSelection = selected &&
          selected.startsWith(before) &&
          selected.endsWith(after) &&
          selected.length >= before.length + after.length;
        const hasDuplicateSurroundingMarkers = selected &&
          value.slice(Math.max(0, start - duplicateBefore.length), start) === duplicateBefore &&
          value.slice(end, end + duplicateAfter.length) === duplicateAfter;
        const hasSurroundingMarkers = selected &&
          value.slice(Math.max(0, start - before.length), start) === before &&
          value.slice(end, end + after.length) === after;

        if (hasDuplicateWrappedSelection) {
          const innerText = selected.slice(duplicateBefore.length, selected.length - duplicateAfter.length);
          const nextText = before + innerText + after;
          textarea.value = value.slice(0, start) + nextText + value.slice(end);
          textarea.focus();
          textarea.selectionStart = start + before.length;
          textarea.selectionEnd = start + before.length + innerText.length;
          return;
        }

        if (hasDuplicateSurroundingMarkers) {
          textarea.value =
            value.slice(0, start - duplicateBefore.length) +
            before +
            selected +
            after +
            value.slice(end + duplicateAfter.length);
          textarea.focus();
          textarea.selectionStart = start - before.length;
          textarea.selectionEnd = start - before.length + selected.length;
          return;
        }

        if (hasWrappedSelection) {
          const nextText = selected.slice(before.length, selected.length - after.length);
          textarea.value = value.slice(0, start) + nextText + value.slice(end);
          textarea.focus();
          textarea.selectionStart = start;
          textarea.selectionEnd = start + nextText.length;
          return;
        }

        if (hasSurroundingMarkers) {
          textarea.value =
            value.slice(0, start - before.length) +
            selected +
            value.slice(end + after.length);
          textarea.focus();
          textarea.selectionStart = start - before.length;
          textarea.selectionEnd = start - before.length + selected.length;
          return;
        }

        const nextText = selected || fallback;
        const nextValue = value.slice(0, start) + before + nextText + after + value.slice(end);
        textarea.value = normalizeAdminInlineMarkers(nextValue);
        textarea.focus();
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length + nextText.length;
      }

      const textareas = document.querySelectorAll("textarea[data-count-target]");
      textareas.forEach((textarea) => {
        const counterId = textarea.getAttribute("data-count-target");
        const counter = document.getElementById(counterId);
        const hint = document.getElementById("rejectionReasonHint");
        const minlength = Number(textarea.getAttribute("data-minlength") || "0");
        const updateCounter = function () {
          const valueLength = textarea.value.trim().length;
          if (counter) {
            counter.textContent = valueLength + "/500";
          }
          if (hint) {
            if (valueLength > 0 && valueLength < minlength) {
              hint.classList.add("moderation-hint-invalid");
            } else {
              hint.classList.remove("moderation-hint-invalid");
            }
          }
        };
        textarea.addEventListener("input", updateCounter);
        updateCounter();
      });

      const filePreviewUrls = new WeakMap();
      const previewUrlForFile = function (file) {
        if (!filePreviewUrls.has(file)) filePreviewUrls.set(file, URL.createObjectURL(file));
        return filePreviewUrls.get(file);
      };
      const readGalleryUrls = function () {
        return String(adminGalleryUrls?.value || "")
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3);
      };
      const renderCoverManager = function () {
        const src = pendingCoverFile ? previewUrlForFile(pendingCoverFile) : String(adminCoverUrl?.value || "").trim();
        if (adminCoverPreview) {
          adminCoverPreview.src = src;
          adminCoverPreview.hidden = !src;
        }
        if (adminCoverState && pendingCoverFile) {
          adminCoverState.dataset.state = "pending";
          adminCoverState.textContent = "Pending upload: " + pendingCoverFile.name;
        } else if (adminCoverState) {
          adminCoverState.dataset.state = "saved";
          adminCoverState.textContent = src ? "Saved image" : "No cover image";
        }
      };
      const renderGalleryManager = function () {
        if (!adminGalleryPreview) return;
        const savedUrls = readGalleryUrls();
        const items = [
          ...savedUrls.map((url, index) => ({ url, savedIndex: index, pending: false })),
          ...pendingGalleryFiles.map((file, index) => ({
            url: previewUrlForFile(file),
            pendingIndex: index,
            pending: true,
            name: file.name
          }))
        ];
        adminGalleryPreview.innerHTML = "";
        items.forEach((item) => {
          const card = document.createElement("div");
          card.className = "admin-gallery-card";
          const img = document.createElement("img");
          img.src = item.url;
          img.alt = item.pending ? "Pending gallery upload" : "Gallery image";
          const remove = document.createElement("button");
          remove.type = "button";
          remove.textContent = item.pending ? "Cancel upload" : "Remove";
          remove.addEventListener("click", () => {
            if (item.pending) {
              pendingGalleryFiles.splice(item.pendingIndex, 1);
            } else {
              const next = readGalleryUrls();
              next.splice(item.savedIndex, 1);
              adminGalleryUrls.value = next.join("\n");
            }
            renderGalleryManager();
            scheduleAutosave();
          });
          card.append(img, remove);
          if (item.pending) {
            const label = document.createElement("small");
            label.className = "admin-upload-state";
            label.textContent = item.name;
            card.append(label);
          }
          adminGalleryPreview.append(card);
        });
        const remaining = Math.max(0, 3 - savedUrls.length - pendingGalleryFiles.length);
        if (adminGallerySlots) adminGallerySlots.textContent = remaining + " slot" + (remaining === 1 ? "" : "s") + " available";
        if (adminGalleryFiles) adminGalleryFiles.disabled = remaining === 0;
        if (adminGalleryState) {
          adminGalleryState.dataset.state = pendingGalleryFiles.length ? "pending" : "saved";
          adminGalleryState.textContent = pendingGalleryFiles.length
            ? pendingGalleryFiles.length + " image upload" + (pendingGalleryFiles.length === 1 ? "" : "s") + " pending"
            : "Maximum 3 images. JPEG/PNG uploads are converted to WebP.";
        }
      };

      adminCoverFile?.addEventListener("change", function () {
        pendingCoverFile = adminCoverFile.files?.[0] || null;
        renderCoverManager();
        if (pendingCoverFile) scheduleAutosave();
      });
      document.getElementById("adminRemoveCover")?.addEventListener("click", function () {
        pendingCoverFile = null;
        if (adminCoverFile) adminCoverFile.value = "";
        if (adminCoverUrl) adminCoverUrl.value = "";
        renderCoverManager();
        scheduleAutosave();
      });
      adminCoverUrl?.addEventListener("input", function () {
        pendingCoverFile = null;
        if (adminCoverFile) adminCoverFile.value = "";
        renderCoverManager();
      });
      adminGalleryUrls?.addEventListener("input", renderGalleryManager);
      adminGalleryFiles?.addEventListener("change", function () {
        const selected = Array.from(adminGalleryFiles.files || []);
        const remaining = Math.max(0, 3 - readGalleryUrls().length - pendingGalleryFiles.length);
        if (selected.length > remaining) {
          window.alert("Only " + remaining + " gallery slot" + (remaining === 1 ? " is" : "s are") + " available.");
        }
        pendingGalleryFiles.push(...selected.slice(0, remaining));
        adminGalleryFiles.value = "";
        renderGalleryManager();
        if (selected.length && remaining) scheduleAutosave();
      });
      renderCoverManager();
      renderGalleryManager();

      if (autosaveForm) {
        const autosaveUrl = String(reviewConfig.autosaveUrl || "");
        const csrfToken = String(reviewConfig.csrfToken || "");
        const statusClassMap = {
          pending: "status-pending",
          published: "status-published"
        };
        let debounceTimer = null;
        let inFlight = false;
        let hasQueuedSave = false;

        const readPayload = function () {
          const payload = {
            title: String(document.getElementById("adminTitle")?.value || "").trim(),
            excerpt: String(document.getElementById("adminExcerpt")?.value || "").trim(),
            category: String(document.getElementById("adminCategory")?.value || "").trim(),
            customCategory: String(document.getElementById("adminCustomCategory")?.value || "").trim(),
            status: String(document.getElementById("adminStatus")?.value || "").trim(),
            coverImageUrl: String(document.getElementById("adminCoverImageUrl")?.value || "").trim(),
            coverImageAlt: String(document.getElementById("adminCoverImageAlt")?.value || "").trim(),
            galleryImageUrls: String(document.getElementById("adminGalleryImageUrls")?.value || "")
              .split(/[\n,]+/)
              .map((item) => item.trim())
              .filter(Boolean),
            templateKey: String(document.getElementById("adminTemplateKey")?.value || "custom").trim(),
            contentBlocks: adminComposer ? normalizeAdminBlocksForSave() : [],
            contentHtml: String(document.getElementById("adminContentHtml")?.value || ""),
            contentRaw: String(document.getElementById("adminContentRaw")?.value || ""),
            seoTitle: String(document.getElementById("adminSeoTitle")?.value || "").trim(),
            seoDescription: String(document.getElementById("adminSeoDescription")?.value || "").trim(),
            ogImageUrl: String(document.getElementById("adminOgImageUrl")?.value || "").trim(),
            moderationNotes: String(document.getElementById("adminModerationNotes")?.value || "").trim(),
            featured: Boolean(reviewConfig.featured),
            tags: String(tagsInput?.value || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          };
          payload.contentVersion = currentContentVersion;
          if (currentEditVersion !== null) payload.editVersion = currentEditVersion;
          return payload;
        };

        let lastSavedPayload = JSON.stringify(readPayload());

        const updateHeaderMeta = function (savedPost) {
          if (!savedPost) return;
          if (postSlugEl && savedPost.slug) postSlugEl.textContent = "/blog/" + savedPost.slug;
          if (postStatusEl && savedPost.status) postStatusEl.textContent = savedPost.status;
          if (postReadingTimeEl && typeof savedPost.readingTime === "number") {
            postReadingTimeEl.textContent = String(savedPost.readingTime);
          }
          const previewTitle = document.getElementById("adminPreviewTitle");
          const previewExcerpt = document.getElementById("adminPreviewExcerpt");
          const previewCategory = document.getElementById("adminPreviewCategory");
          const previewContent = document.getElementById("adminRenderedContent");
          const previewCover = document.getElementById("adminPreviewCover");
          if (previewTitle && savedPost.title !== undefined) previewTitle.textContent = savedPost.title;
          if (previewExcerpt && savedPost.excerpt !== undefined) previewExcerpt.textContent = savedPost.excerpt;
          if (previewCategory && savedPost.category !== undefined) previewCategory.textContent = savedPost.category;
          if (previewContent && savedPost.contentHtml !== undefined) previewContent.innerHTML = savedPost.contentHtml;
          if (previewCover && savedPost.coverImageUrl !== undefined) {
            previewCover.src = savedPost.coverImageUrl || "";
            previewCover.alt = savedPost.coverImageAlt || "";
            previewCover.style.display = savedPost.coverImageUrl ? "" : "none";
          }
          if (moderationStatusBadge && savedPost.status) {
            moderationStatusBadge.textContent = savedPost.status;
            moderationStatusBadge.classList.remove("status-pending", "status-published", "status-other");
            moderationStatusBadge.classList.add(statusClassMap[savedPost.status] || "status-other");
          }
        };

        const saveNow = async function () {
          const payload = readPayload();
          const payloadJson = JSON.stringify(payload);
          const hasPendingImages = Boolean(pendingCoverFile || pendingGalleryFiles.length || pendingInlineUpload);
          if (payloadJson === lastSavedPayload && !hasPendingImages) return true;
          if (inFlight) {
            hasQueuedSave = true;
            return false;
          }

          inFlight = true;
          setAutosaveState("saving", hasPendingImages ? "Uploading images..." : "Saving...");
          if (pendingCoverFile && adminCoverState) {
            adminCoverState.dataset.state = "uploading";
            adminCoverState.textContent = "Uploading " + pendingCoverFile.name + "...";
          }
          if (pendingGalleryFiles.length && adminGalleryState) {
            adminGalleryState.dataset.state = "uploading";
            adminGalleryState.textContent = "Uploading gallery images...";
          }
          try {
            const requestOptions = {
              method: "PATCH",
              headers: { "x-csrf-token": csrfToken },
              credentials: "same-origin"
            };
            if (hasPendingImages) {
              const formData = new FormData();
              if (pendingInlineUpload) payload.inlineImageBlockIndex = adminBlocks.indexOf(pendingInlineUpload.block);
              formData.append("payload", JSON.stringify(payload));
              if (pendingCoverFile) formData.append("coverImageFile", pendingCoverFile);
              pendingGalleryFiles.forEach((file) => formData.append("galleryImageFiles", file));
              if (pendingInlineUpload) formData.append("inlineImageFile", pendingInlineUpload.file);
              formData.append("_csrf", csrfToken);
              requestOptions.body = formData;
            } else {
              requestOptions.headers["Content-Type"] = "application/json";
              requestOptions.body = payloadJson;
            }
            const response = await fetch(autosaveUrl, {
              ...requestOptions
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error((result && (result.errors?.[0] || result.message)) || "Auto-save failed.");
            }

            if (result.post?.coverImageUrl !== undefined && adminCoverUrl) {
              adminCoverUrl.value = result.post.coverImageUrl || "";
            }
            if (Array.isArray(result.post?.galleryImageUrls) && adminGalleryUrls) {
              adminGalleryUrls.value = result.post.galleryImageUrls.join("\n");
            }
            if (Array.isArray(result.post?.contentBlocks) && adminComposer) {
              adminBlocks = result.post.contentBlocks;
            }
            pendingCoverFile = null;
            pendingGalleryFiles = [];
            pendingInlineUpload = null;
            currentContentVersion = Number(result.post?.contentVersion ?? currentContentVersion);
            currentEditVersion = result.post?.editVersion === null || result.post?.editVersion === undefined
              ? currentEditVersion
              : Number(result.post.editVersion);
            if (adminCoverFile) adminCoverFile.value = "";
            renderCoverManager();
            renderGalleryManager();
            if (adminComposer) renderAdminComposer();
            if (adminArticleCover) {
              adminArticleCover.src = String(result.post?.coverImageUrl || "");
              adminArticleCover.style.display = result.post?.coverImageUrl ? "" : "none";
            }
            lastSavedPayload = JSON.stringify(readPayload());
            setAutosaveState("saved", "Saved");
            setChangedFields(result.post?.changedFields || []);
            updateHeaderMeta(result.post || null);
            return true;
          } catch (error) {
            setAutosaveState("error", error.message || "Save failed");
            if (pendingCoverFile && adminCoverState) {
              adminCoverState.dataset.state = "error";
              adminCoverState.textContent = "Upload failed. The file is ready to retry.";
            }
            if (pendingGalleryFiles.length && adminGalleryState) {
              adminGalleryState.dataset.state = "error";
              adminGalleryState.textContent = "Upload failed. The files are ready to retry.";
            }
            return false;
          } finally {
            inFlight = false;
            if (hasQueuedSave) {
              hasQueuedSave = false;
              saveNow();
            }
          }
        };
        flushAutosave = async function () {
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }
          while (inFlight) {
            await new Promise((resolve) => setTimeout(resolve, 40));
          }
          const saved = await saveNow();
          while (inFlight) {
            await new Promise((resolve) => setTimeout(resolve, 40));
          }
          return saved !== false
            && !pendingCoverFile
            && pendingGalleryFiles.length === 0
            && !pendingInlineUpload
            && JSON.stringify(readPayload()) === lastSavedPayload;
        };

        const scheduleSave = function () {
          if (debounceTimer) clearTimeout(debounceTimer);
          setAutosaveState("dirty", "Unsaved changes");
          debounceTimer = setTimeout(saveNow, 900);
        };
        scheduleAutosave = scheduleSave;

        const fields = autosaveForm.querySelectorAll("input, textarea, select");
        fields.forEach((field) => {
          const eventName = field.tagName === "SELECT" || field.type === "checkbox" ? "change" : "input";
          field.addEventListener(eventName, scheduleSave);
        });

        window.addEventListener("beforeunload", function (event) {
          if (inFlight || pendingCoverFile || pendingGalleryFiles.length || pendingInlineUpload || JSON.stringify(readPayload()) !== lastSavedPayload) {
            event.preventDefault();
            event.returnValue = "";
          }
        });
      }

      document.getElementById("adminAddBlockBtn")?.addEventListener("click", () => {
        adminBlocks.push(makeAdminBlock(document.getElementById("adminAddBlockType")?.value || "textSection"));
        renderAdminComposer();
        scheduleAutosave();
      });
      document.getElementById("adminTemplateKey")?.addEventListener("change", () => {
        syncAdminComposerOutput();
      });
      renderAdminComposer();

      const forms = document.querySelectorAll(".moderation-panel form");
      forms.forEach((form) => {
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (form.classList.contains("moderation-approve-form")) {
            const scheduled = form.querySelector('input[name="publicationMode"]:checked')?.value === "scheduled";
            const localValue = String(document.getElementById("scheduledForLocal")?.value || "");
            const hidden = document.getElementById("scheduledFor");
            if (scheduled) {
              const scheduledDate = new Date(localValue);
              if (!localValue || !Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
                window.alert("Choose a future publication date and time.");
                return;
              }
              if (hidden) hidden.value = scheduledDate.toISOString();
            } else if (hidden) hidden.value = "";
          }
          if (form.classList.contains("scheduled-reschedule-form")) {
            const localValue = String(document.getElementById("rescheduleForLocal")?.value || "");
            const scheduledDate = new Date(localValue);
            if (!localValue || !Number.isFinite(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
              window.alert("Choose a future publication date and time.");
              return;
            }
            const hidden = document.getElementById("rescheduleFor");
            if (hidden) hidden.value = scheduledDate.toISOString();
          }
          const button = form.querySelector("button[type='submit']");
          if (!button) return;
          const loadingText = button.getAttribute("data-loading-text");
          if (loadingText) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
          }
          button.disabled = true;
          button.setAttribute("aria-busy", "true");
          const saved = await flushAutosave();
          if (!saved) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            if (button.dataset.originalText) button.textContent = button.dataset.originalText;
            window.alert("The post could not be saved. Resolve the image or autosave error before continuing.");
            return;
          }
          if (form.action.endsWith("/archive-form") && !["published", "scheduled"].includes(currentWorkflowStatus)) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
            window.alert("Content edits were staged for review. Reload before archiving the live post.");
            return;
          }
          form.submit();
        });
      });
    })();
