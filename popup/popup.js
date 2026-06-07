// popup.js - 弹出窗口逻辑

document.addEventListener('DOMContentLoaded', () => {
  loadUsage();
  initButtons();
});

function loadUsage() {
  chrome.storage.local.get(['usageStats'], (result) => {
    const stats = result.usageStats || {};
    document.getElementById('popup-usage').textContent = stats.todayCalls || 0;
  });
}

function initButtons() {
  document.querySelectorAll('.quick-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleQuickAction(action);
    });
  });

  document.querySelectorAll('.feature-item').forEach(item => {
    item.addEventListener('click', () => {
      const feature = item.dataset.feature;
      openSidebarWithFeature(feature);
    });
  });

  document.getElementById('settings-link').addEventListener('click', () => {
    openSidebarWithTab('settings');
  });

  document.getElementById('history-link').addEventListener('click', () => {
    openSidebarWithTab('history');
  });
}

function handleQuickAction(action) {
  switch (action) {
    case 'sidebar':
      openSidebar();
      break;
    case 'summary':
      openSidebarWithTab('summary');
      break;
    case 'prompt':
      openSidebarWithTab('prompt');
      break;
    case 'batch':
      openSidebarWithTab('batch');
      break;
  }
}

function openSidebar() {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  window.close();
}

function openSidebarWithTab(tabName) {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }, () => {
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'SWITCH_TAB',
        tab: tabName
      });
    }, 200);
  });
  window.close();
}

function openSidebarWithFeature(feature) {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }, () => {
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'SET_FEATURE',
        feature
      });
    }, 200);
  });
  window.close();
}
