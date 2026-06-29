# HelloRun AdSense Approval Todo

Purpose: prepare HelloRun for a stronger Google AdSense review after the rejection reason: Low value content.

This file is for Codex or any developer working on the repository. Treat it as an implementation checklist, not a guarantee of approval. The goal is to reduce low-value content signals, improve public content usefulness, clean crawl and index behavior, and make the site look complete to users and reviewers.

## Current context

Google AdSense rejected the site under Low value content.

Relevant areas to address:

- Minimum content requirements
- High quality content and good user experience
- Thin content with little or no added value
- Google Publisher Policies
- Google Publisher Restrictions

The main strategy is not to add ads everywhere.

The strategy is to make HelloRun valuable even without ads.

HelloRun should be reviewed as a public running event platform with useful resources for runners and organizers, not only as a login-based event app.

## Main approval principle

Every public indexed page should answer this:

Why should a runner, organizer, or visitor read this page even if they do not register today?

If a page cannot answer that, improve it, noindex it, or remove it from public crawl paths.

---

# Phase 1: Crawl and index foundation

## 1.1 Confirm public indexable pages

Audit these routes and confirm they return useful HTML content for public visitors:

- `/`
- `/events`
- `/events/:slug`
- `/blog`
- `/blog/:slug`
- `/about`
- `/how-it-works`
- `/contact`
- `/faq`
- `/privacy-policy`
- `/terms-and-conditions`
- `/cookie-policy`
- `/data-usage-policy`
- `/refund-cancellation-policy`
- `/community-guidelines`
- `/acceptable-use-policy`
- `/organiser-terms`
- `/leaderboard`

Acceptance criteria:

- Page loads without requiring login.
- Page has a clear title.
- Page has a clear meta description.
- Page has visible meaningful content.
- Page has internal links to related public pages.
- Page does not show empty placeholders.
- Page does not show broken images.
- Page does not display admin or app-only UI as main content.

## 1.2 Keep low-value app pages noindexed

The existing noindex logic for login, register, admin, organizer, runner, profile, account, checkout, orders, API, and webhooks should remain.

Confirm these routes include either an HTTP `X-Robots-Tag: noindex, nofollow` header or a matching meta robots value:

- `/login`
- `/register`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/admin/*`
- `/organizer/*`
- `/runner/*`
- `/my-registrations`
- `/my-submissions/*`
- `/profile/*`
- `/account/*`
- `/shop/cart`
- `/shop/checkout`
- `/orders/*`
- `/api/*`
- `/webhooks/*`

Acceptance criteria:

- App-only pages are not included in `sitemap.xml`.
- App-only pages are not used as ad placement pages.
- App-only pages can still work normally for users.

## 1.3 Add or verify robots.txt

Create a public `robots.txt` route or static file.

Recommended content:

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /organizer/
Disallow: /runner/
Disallow: /my-registrations
Disallow: /my-submissions
Disallow: /profile/
Disallow: /account/
Disallow: /orders/
Disallow: /shop/cart
Disallow: /shop/checkout
Disallow: /api/
Disallow: /webhooks/

Sitemap: https://hellorun.online/sitemap.xml
```

Acceptance criteria:

- `https://hellorun.online/robots.txt` returns HTTP 200.
- It points to the production sitemap.
- It does not block public blog, event, about, contact, FAQ, or policy pages.

## 1.4 Verify sitemap.xml

The existing sitemap should include only valuable public pages.

Required sitemap entries:

- Home
- Events list
- Public event details
- Blog list
- Published blog posts
- About
- How It Works
- Contact
- FAQ
- Policy pages

Do not include:

- Login
- Register
- Admin
- Organizer dashboards
- Runner dashboards
- Cart
- Checkout
- Orders
- API routes
- Search or filter URLs with query strings
- Empty category or tag pages

Acceptance criteria:

- `https://hellorun.online/sitemap.xml` returns HTTP 200.
- XML is valid.
- All URLs return HTTP 200.
- URLs are canonical production URLs.
- No app-only pages are included.

## 1.5 Add or verify ads.txt

Create a public `ads.txt` route or static file after confirming the correct AdSense publisher ID.

Expected format:

```txt
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Replace `pub-XXXXXXXXXXXXXXXX` with the exact publisher ID from the AdSense account.

Acceptance criteria:

- `https://hellorun.online/ads.txt` returns HTTP 200.
- The publisher ID matches AdSense exactly.
- No placeholder publisher ID remains.

---

# Phase 2: Public content quality

## 2.1 Improve homepage content

The homepage should explain HelloRun clearly without depending on login.

Required sections:

- Hero section explaining HelloRun in one clear sentence.
- Section for runners.
- Section for organizers.
- How virtual runs work.
- Featured public events.
- Latest running guides.
- Proof submission overview.
- Leaderboard and certificate explanation.
- Safety and fair-play note.
- Internal links to How It Works, FAQ, Events, Blog, and Contact.

Acceptance criteria:

- Homepage has at least 600 to 900 words of useful visible public content.
- Homepage does not look like an under-construction app.
- Homepage has at least 5 internal links to public content pages.
- CTA buttons are clear but do not dominate the page.

## 2.2 Preserve the submit-flow UX without weakening crawl quality

Keep the user-friendly workflow:

- Public visitors can start a submit-run action.
- If not logged in, they are routed to login.
- After successful login, they return to the intended submission flow.

Implementation guidance:

- Keep public CTA buttons such as `Submit Run Result` or `Upload Proof`.
- Preserve `next` or return URL handling after login.
- Avoid making app-only submission forms the main public homepage content.
- The full proof submission form should appear only when contextually needed, such as after login, on runner pages, or after an explicit user action.

Acceptance criteria:

- A public visitor can understand how submission works.
- A public visitor can start the submission path.
- Login redirection preserves intent.
- The homepage remains focused on public informational content.

## 2.3 Strengthen event list page

The `/events` page should be more than a grid of event cards.

Add or verify:

- Intro text explaining what types of events are listed.
- Explanation of virtual, onsite, and hybrid events.
- Short guide on choosing 5K, 10K, 21K, or custom distances.
- Link to How It Works.
- Link to FAQ.
- Empty-state content if there are no current events.

Acceptance criteria:

- Page has useful text before and after event cards.
- Empty events state is useful and not thin.
- Event filters do not create indexable duplicate low-value pages.

## 2.4 Strengthen event detail pages

Every public event detail page should have unique content.

Required event detail sections:

- Event overview
- Who the event is for
- Distance options
- Registration period
- Running or submission period
- Proof submission rules
- Leaderboard rules
- Certificate or badge details
- Safety reminders
- FAQ for that event
- Related events or related blog articles

Acceptance criteria:

- No event page should use only a short reused template.
- Each published event should have at least 400 to 700 words of unique visible content.
- Event details should not be copied across multiple events except for necessary platform rules.
- If the event is closed or past, the page should still explain results, certificates, or historical context.

## 2.5 Strengthen How It Works page

The `/how-it-works` page should become one of the strongest approval pages.

Required sections:

- What HelloRun is
- How runners join an event
- How payment or free registration works
- How proof submission works
- What counts as valid proof
- How organizers review submissions
- How leaderboards are updated
- How certificates or badges are issued
- What happens if proof is rejected
- Privacy and data handling overview

Acceptance criteria:

- At least 900 to 1,300 words.
- Uses clear headings.
- Links to FAQ, Events, Blog, Contact, Privacy Policy, and Data Usage Policy.

## 2.6 Strengthen FAQ page

The FAQ should answer real runner and organizer concerns.

Minimum FAQ groups:

- Account and registration
- Joining events
- Virtual run proof
- Strava or screenshot submissions
- Leaderboards
- Certificates and badges
- Payments and refunds
- Organizers
- Privacy and data
- Support

Acceptance criteria:

- At least 25 useful FAQ items.
- Answers are specific to HelloRun.
- Answers are not generic filler.
- FAQ links to related pages.

## 2.7 Strengthen About page

The About page should build trust.

Required sections:

- What HelloRun is
- Why it exists
- Who it serves
- What problems it solves
- How it supports runners
- How it supports organizers
- Platform limitations and current scope
- Contact path for support

Acceptance criteria:

- At least 600 to 900 words.
- Clearly states HelloRun is maintained by 4HProjects or the appropriate project owner.
- Avoids vague claims that cannot be supported.

## 2.8 Strengthen Contact page

The Contact page should not be a bare form only.

Required sections:

- Support categories
- Expected response time if known
- Runner concerns
- Organizer concerns
- Payment or registration concerns
- Data or privacy request contact
- Abuse or content report contact

Acceptance criteria:

- Visible contact method is present.
- Form works.
- Page contains useful public text.

---

# Phase 3: Blog approval content

## 3.1 Minimum blog inventory before review

Before requesting AdSense review, publish at least 12 strong blog posts.

Target count:

- Minimum: 12 strong posts
- Better: 18 to 25 strong posts

Each post should have:

- 800 to 1,500 words
- Original writing
- Clear author name
- Published date
- Updated date if applicable
- Cover image with alt text
- Category
- At least 2 relevant tags
- Internal links to related HelloRun pages
- A practical takeaway section

Avoid:

- Generic AI-style advice
- Repeated paragraphs
- Thin listicles
- Keyword-stuffed headings
- Posts created only to fill the blog
- Rewritten content from other sites

## 3.2 Recommended first 15 posts

Create or improve these posts first:

1. How Virtual Runs Work in the Philippines
2. How to Join a HelloRun Virtual Run
3. 5K vs 10K vs 21K: Which Distance Should You Choose?
4. How to Submit Running Proof Correctly
5. What Counts as a Valid Running Result?
6. Beginner 5K Training Guide for New Runners
7. Common Virtual Run Mistakes and How to Avoid Them
8. Running Safety Tips for Beginners
9. How Leaderboards Work in Virtual Running Events
10. How Digital Certificates Help Runners Track Progress
11. Free Virtual Runs: What Runners Should Know
12. How Organizers Can Manage Online Running Events
13. How to Review Run Proof Fairly as an Organizer
14. Virtual Run Checklist Before Race Day
15. How Online Running Events Help Build Consistency

Acceptance criteria:

- Each post answers a real user question.
- Each post links to at least 2 internal pages.
- Each post has no placeholder text.
- Each post reads like it was written by someone who understands HelloRun.

## 3.3 Blog category and tag pages

Category and tag pages can become thin if they contain too few posts.

Implementation guidance:

- If a category has fewer than 3 published posts, add `noindex, follow` to that category page.
- If a tag page has fewer than 3 published posts, add `noindex, follow` to that tag page.
- Do not include category or tag pages in sitemap until they have enough content.

Acceptance criteria:

- No empty category page is indexable.
- No empty tag page is indexable.
- Blog list and individual posts remain indexable.

## 3.4 Blog comments

Comments can help engagement, but they can also create quality issues.

Acceptance criteria:

- Public can read approved comments.
- Only logged-in users can comment.
- Spam or abusive comments can be reported.
- Admin can moderate comments.
- Comments should not be indexed as separate thin pages.

---

# Phase 4: Policy and trust pages

## 4.1 Verify all policy pages render real content

The policy registry should produce public pages with real content.

Required policy pages:

- Privacy Policy
- Terms and Conditions
- Cookie Policy
- Data Usage Policy
- Refund and Cancellation Policy
- Organiser Terms
- Community Guidelines
- Acceptable Use Policy

Acceptance criteria:

- Each page returns HTTP 200.
- Each page has visible content.
- Each page has a clear effective date or updated date.
- Each page is linked in the footer.
- Each page has a canonical URL.

## 4.2 Privacy and cookie disclosures

The privacy and cookie pages should mention:

- Account data collected
- Event registration data
- Run proof or uploaded image data
- Payment proof data if applicable
- Analytics tools if used
- Advertising cookies if AdSense is used
- User rights and contact method
- Data retention overview

Acceptance criteria:

- No placeholder legal text remains.
- No claims conflict with actual app behavior.
- Contact method is visible.

## 4.3 Refund and cancellation policy

Since HelloRun handles free and possibly paid events, clarify:

- Free event terms
- Paid event terms
- Organizer responsibility if applicable
- Cancellation handling
- Refund request process
- Processing time if known
- Non-refundable cases if applicable

Acceptance criteria:

- Page helps users understand expectations.
- Page avoids vague or misleading payment claims.

---

# Phase 5: Ads placement cleanup

## 5.1 Define ad-safe pages

Only show ads on valuable public content pages after they have enough content.

Ad-safe pages:

- Blog post pages with enough content
- Blog list page if populated
- Event detail pages with enough unique content
- How It Works page
- FAQ page
- About page only if content is strong

Do not show ads on:

- Login
- Register
- Forgot password
- Reset password
- Admin pages
- Organizer dashboards
- Runner dashboards
- Profile pages
- Cart
- Checkout
- Orders
- API pages
- Error pages
- Empty search or filter results
- Thin category or tag pages

Acceptance criteria:

- Ad middleware or ad partials check whether the current route is ad-safe.
- Ads are not rendered on noindex pages.
- Ads are not rendered on pages with little or no content.

## 5.2 Avoid ad-heavy layout before approval

Before approval, keep ad placements minimal.

Recommended during review:

- One ad slot on long blog posts only, or
- One ad slot after substantial content on strong public pages

Avoid:

- Ads above the fold
- Multiple ads on short pages
- Ads near navigation-only areas
- Ads inside forms
- Ads on pages where content is not yet strong

Acceptance criteria:

- Site does not look built mainly for ads.
- Ads do not interrupt forms or critical user workflows.

---

# Phase 6: Technical SEO and metadata

## 6.1 Canonical URLs

Ensure canonical URLs exist for:

- Home
- Events
- Event details
- Blog
- Blog posts
- About
- How It Works
- Contact
- FAQ
- Policy pages

Acceptance criteria:

- Canonicals use `https://hellorun.online`.
- No localhost or staging URLs appear in production.
- Query-string filter pages either canonicalize properly or noindex if thin.

## 6.2 Meta descriptions

Every public page should have a unique meta description.

Acceptance criteria:

- No duplicate generic descriptions across main pages.
- Blog post descriptions use `seoDescription` or a meaningful excerpt.
- Event pages have event-specific descriptions.

## 6.3 Open Graph and image metadata

Verify:

- Home has a valid OG image.
- Blog posts use cover images when available.
- Event pages use event images when available.
- Missing images use a clean default HelloRun image.

Acceptance criteria:

- No broken OG image URLs.
- Images use HTTPS.
- Important images have alt text in visible HTML.

## 6.4 Structured data

Add JSON-LD where appropriate.

Recommended:

- `Organization` for HelloRun
- `WebSite` for home
- `BlogPosting` for blog posts
- `FAQPage` for FAQ page
- `Event` for public event detail pages, only when data is accurate
- `BreadcrumbList` for blog posts and event pages

Acceptance criteria:

- JSON-LD is valid.
- Structured data matches visible page content.
- No misleading event status, date, price, or organizer information.

---

# Phase 7: UX and navigation

## 7.1 Footer completeness

Footer should link to:

- Home
- Events
- Blog
- Leaderboard
- About
- How It Works
- Contact
- FAQ
- Privacy Policy
- Terms and Conditions
- Cookie Policy
- Data Usage Policy
- Refund and Cancellation Policy
- Community Guidelines
- Acceptable Use Policy
- Organiser Terms

Acceptance criteria:

- All links return HTTP 200.
- Footer appears on public pages.
- Footer does not hide important links behind login.

## 7.2 Header clarity

Header should prioritize public discovery:

- Events
- Blog
- Leaderboard
- How It Works or FAQ
- Login
- Sign Up

Acceptance criteria:

- Navigation is usable on mobile.
- Public visitors can find content without logging in.
- Login and register are available but not the only clear path.

## 7.3 Empty states

Every empty state should provide useful next steps.

Examples:

- No events available
- No blog posts found
- No leaderboard results
- No related posts
- No search results

Acceptance criteria:

- Empty states are not blank.
- Empty states link to useful public pages.
- Empty search or filter pages should be noindex if they are thin.

---

# Phase 8: Live-site verification checklist

Run these checks against production before requesting review.

## 8.1 Required URLs

Verify HTTP 200:

- `https://hellorun.online/`
- `https://hellorun.online/events`
- `https://hellorun.online/blog`
- `https://hellorun.online/about`
- `https://hellorun.online/how-it-works`
- `https://hellorun.online/contact`
- `https://hellorun.online/faq`
- `https://hellorun.online/sitemap.xml`
- `https://hellorun.online/robots.txt`
- `https://hellorun.online/ads.txt`

## 8.2 Required visual checks

Check on desktop and mobile:

- Header works.
- Footer works.
- Blog cards display correctly.
- Event cards display correctly.
- Policy pages are readable.
- Forms are not broken.
- No page shows raw template text.
- No page shows placeholder lorem ipsum.

## 8.3 Required crawler checks

Use Google Search Console or equivalent tools:

- Submit sitemap.
- Inspect homepage.
- Inspect blog page.
- Inspect at least 3 blog posts.
- Inspect at least 3 event pages.
- Confirm public pages are indexable.
- Confirm app-only pages are noindexed.

## 8.4 Content count before review

Minimum before AdSense review request:

- 12 strong published blog posts
- 3 to 5 strong public event pages, if active events exist
- Complete About page
- Complete How It Works page
- Complete FAQ page
- Complete Contact page
- Complete policy pages

Better before review:

- 18 to 25 strong blog posts
- 5 or more complete event pages
- At least 3 internal links per main public page

---

# Phase 9: Suggested implementation order

Use this order for Codex tasks.

## Task group A: crawler files

1. Add or verify `/robots.txt`.
2. Add or verify `/ads.txt`.
3. Confirm `/sitemap.xml` excludes noindex pages.
4. Add tests for sitemap, robots, and ads.txt.

## Task group B: route-level ad safety

1. Create a single helper that decides if ads can render on the current page.
2. Block ads on noindex pages.
3. Block ads on app-only pages.
4. Block ads on error pages.
5. Block ads on thin filter or search pages.
6. Add tests for ad-safe and ad-blocked routes.

## Task group C: public page content

1. Improve home page content.
2. Improve events page content.
3. Improve event detail template.
4. Improve How It Works page.
5. Improve FAQ page.
6. Improve About page.
7. Improve Contact page.

## Task group D: blog quality

1. Audit existing published posts.
2. Flag posts under 700 words for improvement.
3. Add missing excerpt, SEO description, category, tags, cover image, alt text.
4. Add internal links to each post.
5. Add noindex for weak category and tag pages.
6. Publish at least 12 strong posts before review.

## Task group E: policy and trust

1. Verify all policy pages.
2. Add effective dates.
3. Add contact details.
4. Check privacy and cookie disclosures against actual app behavior.
5. Link all policy pages in the footer.

## Task group F: structured data and metadata

1. Add Organization JSON-LD.
2. Add BlogPosting JSON-LD.
3. Add FAQPage JSON-LD.
4. Add Event JSON-LD where accurate.
5. Add BreadcrumbList JSON-LD.
6. Validate metadata and structured data.

## Task group G: live verification

1. Deploy.
2. Check live URLs.
3. Submit sitemap in Search Console.
4. Inspect key URLs.
5. Wait for crawl updates.
6. Request AdSense review only after public pages are stable.

---

# Phase 10: Definition of done

Do not request AdSense review until all of these are true:

- `robots.txt` works.
- `ads.txt` works with the correct publisher ID.
- `sitemap.xml` works and contains only useful public URLs.
- App-only pages are noindexed.
- Public pages are indexable.
- Home page has strong visible content.
- How It Works page is comprehensive.
- FAQ page is comprehensive.
- About and Contact pages are complete.
- All policy pages are complete.
- At least 12 strong blog posts are published.
- Event pages have unique useful content.
- No empty categories or tag pages are indexable.
- No ads appear on login, register, dashboards, checkout, orders, API, error, or thin pages.
- Footer links all work.
- Mobile layout is clean.
- No placeholders remain.
- Google Search Console can inspect and crawl the key pages.

---

# Final review question

Before clicking Request review in AdSense, open the site as a first-time public visitor and answer:

Can someone learn enough from HelloRun without logging in to trust it, use it, and return later?

If the answer is not clearly yes, continue improving public content before requesting review.
---

# Phase 11: Content writing prompts for AdSense-quality articles

Use these prompts when drafting or improving HelloRun blog posts, event pages, and public guide pages.

The goal is not to produce filler content. The goal is to create useful public pages that answer real runner and organizer questions.

## 11.1 Initial article introduction prompt

Use this prompt when writing the introduction for any HelloRun article or guide:

```txt
Write an engaging, punchy introduction for the website article.

Please alternate between short and long sentences. Avoid jargon and clichés.

Make it engaging and suited for a professional audience. Give specific, actionable information that provides deep value to readers.

The tone should be professional and slightly conversational.

Use burstiness in the sentences by combining short and long sentences to create a human-like flow.

Use human writing elements such as occasional exclamation points and first-person perspective when natural.

The introduction should include a statistic, quotation, sharp observation, or practical hook that pulls the reader in.

Avoid starting with “Did you know?”

Include the primary SEO keyword and secondary SEO keywords naturally throughout the introduction and the whole article.
```

## 11.2 Full article drafting prompt

Use this after the topic, primary keyword, and secondary keywords are already selected:

```txt
Write a complete HelloRun article for the topic: [TOPIC].

Primary SEO keyword: [PRIMARY KEYWORD]
Secondary SEO keywords: [SECONDARY KEYWORDS]

Audience:
- Beginner and casual runners
- Virtual run participants
- Event organizers
- Fitness community members in the Philippines

Writing requirements:
- Write in a professional and slightly conversational tone.
- Use short and long sentences for a natural human rhythm.
- Avoid jargon, clichés, vague motivational lines, and generic AI-sounding advice.
- Give specific, actionable information.
- Use examples connected to virtual runs, running proof submission, leaderboards, certificates, and HelloRun workflows when relevant.
- Include the primary keyword naturally in the title, introduction, at least one heading, and conclusion.
- Include secondary keywords naturally throughout the article.
- Do not keyword-stuff.
- Do not create claims that need proof unless a source or reasonable context is provided.

Structure:
- SEO title
- Meta description under 160 characters
- Introduction with a strong hook
- Clear H2 and H3 sections
- Practical examples
- Common mistakes or checklist section
- Internal link suggestions to relevant HelloRun pages
- Short conclusion with a useful next step

Length:
- 800 to 1,500 words

Output:
- Markdown format
- Include suggested slug
- Include suggested category
- Include 3 to 5 tags
- Include image alt text suggestion
```

## 11.3 Article improvement prompt

Use this when improving existing thin or generic blog posts:

```txt
Improve this HelloRun article so it can better support AdSense approval and reader value.

Current article:
[PASTE ARTICLE]

Primary SEO keyword:
[PRIMARY KEYWORD]

Secondary SEO keywords:
[SECONDARY KEYWORDS]

Improve it by:
- Removing generic filler.
- Adding specific, actionable advice.
- Expanding thin sections.
- Adding examples connected to HelloRun, virtual runs, proof submission, leaderboards, certificates, or organizer workflows.
- Making the introduction punchier.
- Improving headings.
- Adding internal link suggestions.
- Adding a practical checklist or takeaway section.
- Keeping the tone professional and slightly conversational.
- Avoiding jargon, clichés, and keyword stuffing.

Return:
- Improved Markdown article
- SEO title
- Meta description
- Suggested slug
- Suggested category
- Suggested tags
- Suggested image alt text
```

## 11.4 Event page content prompt

Use this when creating or improving a public event detail page:

```txt
Write a complete public event detail page for HelloRun.

Event name:
[EVENT NAME]

Event type:
[Virtual, On-site, Hybrid]

Distances:
[DISTANCES]

Registration period:
[REGISTRATION PERIOD]

Run or submission period:
[RUN PERIOD]

Audience:
[WHO THIS EVENT IS FOR]

Primary SEO keyword:
[PRIMARY KEYWORD]

Secondary SEO keywords:
[SECONDARY KEYWORDS]

The page should include:
- Event overview
- Who should join
- Distance guide
- Registration instructions
- Proof submission rules
- Leaderboard rules
- Certificate or badge details
- Safety reminders
- Event-specific FAQ
- Related HelloRun links

Writing requirements:
- Make the content unique to this event.
- Avoid simply repeating the same event template.
- Use clear, professional, slightly conversational language.
- Include actionable details.
- Use SEO keywords naturally.
- Avoid overpromising.

Target length:
- 400 to 700 words minimum
```

## 11.5 Content quality checklist before publishing

Before publishing any blog post or event page, verify:

- The page answers a real user question.
- The intro gives readers a reason to continue.
- The content gives specific advice, not generic motivation.
- The primary keyword appears naturally.
- Secondary keywords appear naturally.
- The page has internal links.
- The page has a useful title and meta description.
- The page has a category and tags.
- The page has a cover image or meaningful visual when possible.
- The image has alt text.
- The page has no placeholder text.
- The page does not repeat another HelloRun page with minor wording changes.
- The page can stand alone as useful public content.

