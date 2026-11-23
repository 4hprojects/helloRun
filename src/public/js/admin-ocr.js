'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const navigation = document.querySelector('[data-ocr-section-nav]');
  const activeTab = navigation?.querySelector('[data-ocr-active-tab]');
  if (!navigation || !activeTab || navigation.scrollWidth <= navigation.clientWidth) return;

  const navigationRect = navigation.getBoundingClientRect();
  const activeRect = activeTab.getBoundingClientRect();
  const centeredOffset = activeRect.left - navigationRect.left - ((navigationRect.width - activeRect.width) / 2);
  navigation.scrollLeft += centeredOffset;
});
