const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('admin autosave accepts blog image multipart fields through the shared upload middleware', () => {
  const routes = read('src/routes/admin.routes.js');
  const uploadService = read('src/services/upload.service.js');

  assert.match(
    routes,
    /router\.patch\('\/blog\/posts\/:id\/autosave',[\s\S]*uploadService\.uploadBlogAssets[\s\S]*autosaveBlogPostAdmin/
  );
  assert.match(uploadService, /name: 'coverImageFile', maxCount: 1/);
  assert.match(uploadService, /name: 'galleryImageFiles', maxCount: 3/);
  assert.match(uploadService, /name: 'inlineImageFile', maxCount: 1/);
});

test('blog cover, gallery, and inline uploads reuse the shared R2 WebP pipeline', () => {
  const source = read('src/services/upload.service.js');

  assert.match(source, /exports\.uploadBlogCoverToR2[\s\S]*category: 'blog\/covers'/);
  assert.match(source, /exports\.uploadBlogGalleryToR2[\s\S]*category: 'blog\/gallery'/);
  assert.match(source, /exports\.uploadBlogInlineToR2[\s\S]*category: 'blog\/inline'/);
  assert.match(source, /\.rotate\(\)[\s\S]*\.webp\(\{ quality: 82 \}\)/);
});

test('admin image autosave rolls back uploads and cleans replaced managed objects', () => {
  const controller = read('src/controllers/blog/admin.controller.js');

  assert.match(controller, /if \(!assetsPersisted && uploadedKeys\.length\)[\s\S]*deleteObjects\(uploadedKeys\)/);
  assert.match(controller, /collectRemovedGalleryKeys\(beforeSnapshot\.galleryImageUrls, nextPayload\.galleryImageUrls\)/);
  assert.match(controller, /previousInlineUrls[\s\S]*extractObjectKeyFromPublicUrl/);
  assert.match(controller, /Maximum \$\{MAX_BLOG_GALLERY_IMAGES\} gallery images are allowed/);
});

test('review UI coordinates pending image uploads with autosave and moderation', () => {
  const view = read('src/views/admin/blog-review.ejs');

  assert.match(view, /id="adminCoverImageFile"/);
  assert.match(view, /id="adminGalleryPreview"/);
  assert.match(view, /data-field="inline-file"/);
  assert.match(view, /formData\.append\("payload", JSON\.stringify\(payload\)\)/);
  assert.match(view, /const saved = await flushAutosave\(\)/);
  assert.match(view, /Only ["'] \+ remaining[\s\S]*gallery slot/);
});
