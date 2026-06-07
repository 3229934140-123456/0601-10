// content.js - 内容脚本，与页面交互
(function() {
  let isPanelVisible = false;
  let isFloatingMenuVisible = false;
  let selectedText = '';
  let currentResult = '';
  let settings = {
    floatingMenu: true
  };

  loadSettings();

  function loadSettings() {
    chrome.storage.local.get(['settings'], (result) => {
      if (result.settings) {
        settings.floatingMenu = result.settings.floatingMenu !== false;
      }
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      settings.floatingMenu = changes.settings.newValue?.floatingMenu !== false;
    }
  });

  function createFloatingMenu() {
    const menu = document.createElement('div');
    menu.id = 'ai-assistant-floating-menu';
    menu.className = 'ai-assistant-floating-menu';
    menu.innerHTML = `
      <div class="ai-menu-header">
        <span>AI 助手</span>
        <button class="ai-menu-close" title="关闭">×</button>
      </div>
      <div class="ai-menu-actions">
        <button class="ai-menu-btn" data-action="rewrite">✍️ 改写</button>
        <button class="ai-menu-btn" data-action="summarize">📝 摘要</button>
        <button class="ai-menu-btn" data-action="translate">🌍 翻译</button>
        <button class="ai-menu-btn" data-action="reply">💬 回复</button>
        <button class="ai-menu-btn" data-action="titles">📌 标题</button>
        <button class="ai-menu-btn" data-action="tone">🎭 语气</button>
        <button class="ai-menu-btn" data-action="sensitive">⚠️ 检测</button>
        <button class="ai-menu-btn ai-menu-btn-more" data-action="more">⋯ 更多</button>
      </div>
      <div class="ai-menu-more-actions" style="display:none;">
        <button class="ai-menu-btn" data-action="key_points">🎯 要点提取</button>
        <button class="ai-menu-btn" data-action="table_explain">📊 表格解释</button>
        <button class="ai-menu-btn" data-action="add_favorite">⭐ 收藏提示词</button>
      </div>
    `;
    document.body.appendChild(menu);

    menu.querySelector('.ai-menu-close').addEventListener('click', hideFloatingMenu);
    
    menu.querySelectorAll('.ai-menu-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        handleMenuAction(action);
      });
    });

    return menu;
  }

  function showFloatingMenu(x, y) {
    let menu = document.getElementById('ai-assistant-floating-menu');
    if (!menu) {
      menu = createFloatingMenu();
    }
    
    const menuWidth = 320;
    const menuHeight = 120;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x + 10;
    let top = y + 10;
    
    if (left + menuWidth > viewportWidth + window.scrollX) {
      left = x - menuWidth - 10;
    }
    if (top + menuHeight > viewportHeight + window.scrollY) {
      top = y - menuHeight - 10;
    }
    
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.display = 'block';
    isFloatingMenuVisible = true;
  }

  function hideFloatingMenu() {
    const menu = document.getElementById('ai-assistant-floating-menu');
    if (menu) {
      menu.style.display = 'none';
    }
    isFloatingMenuVisible = false;
  }

  function handleMenuAction(action) {
    if (!selectedText) return;

    hideFloatingMenu();
    showLoadingPanel(action);

    chrome.runtime.sendMessage({
      type: 'CALL_AI',
      prompt: generatePrompt(action, selectedText)
    }, (response) => {
      if (response && response.success) {
        showResultPanel(action, response.result);
        saveToHistory(action, response.result);
      } else {
        showResultPanel(action, '处理失败，请重试');
      }
    });
  }

  function generatePrompt(action, text) {
    switch (action) {
      case 'rewrite':
        return `请改写以下文本，使其表达更清晰、更流畅：\n\n${text}`;
      case 'summarize':
        return `请为以下文本生成简洁的摘要：\n\n${text}`;
      case 'translate':
        return `请将以下文本翻译成英文：\n\n${text}`;
      case 'reply':
        return `请根据以下内容生成一个合适的回复：\n\n${text}`;
      case 'titles':
        return `请为以下内容生成5个备选标题：\n\n${text}`;
      case 'tone':
        return `请将以下文本转换为更专业的语气：\n\n${text}`;
      case 'sensitive':
        return `请检测以下文本是否包含敏感内容：\n\n${text}`;
      case 'key_points':
        return `请提取以下文本的核心要点：\n\n${text}`;
      case 'table_explain':
        return `请解释以下表格内容的含义：\n\n${text}`;
      default:
        return text;
    }
  }

  function showLoadingPanel(action) {
    let panel = document.getElementById('ai-assistant-result-panel');
    if (!panel) {
      panel = createResultPanel();
    }
    
    panel.querySelector('.ai-panel-content').innerHTML = `
      <div class="ai-loading">
        <div class="ai-spinner"></div>
        <p>正在${getActionName(action)}中，请稍候...</p>
      </div>
    `;
    
    panel.style.display = 'block';
    isPanelVisible = true;
  }

  function showResultPanel(action, result) {
    let panel = document.getElementById('ai-assistant-result-panel');
    if (!panel) {
      panel = createResultPanel();
    }
    
    currentResult = result;
    
    panel.querySelector('.ai-panel-title span').textContent = getActionName(action) + '结果';
    panel.querySelector('.ai-panel-content').innerHTML = `
      <div class="ai-result-text">${formatResult(result)}</div>
      <div class="ai-result-original">
        <div class="ai-result-label">原文：</div>
        <div class="ai-result-original-text">${escapeHtml(selectedText.substring(0, 200))}${selectedText.length > 200 ? '...' : ''}</div>
      </div>
    `;
    
    panel.style.display = 'block';
    isPanelVisible = true;
  }

  function createResultPanel() {
    const panel = document.createElement('div');
    panel.id = 'ai-assistant-result-panel';
    panel.className = 'ai-assistant-result-panel';
    panel.innerHTML = `
      <div class="ai-panel-header">
        <div class="ai-panel-title">
          <span>AI 处理结果</span>
        </div>
        <div class="ai-panel-actions">
          <button class="ai-panel-btn" title="复制结果" id="ai-copy-btn">📋 复制</button>
          <button class="ai-panel-btn" title="对比原文" id="ai-compare-btn">📊 对比</button>
          <button class="ai-panel-btn" title="重新生成" id="ai-regenerate-btn">🔄 重做</button>
          <button class="ai-panel-btn ai-panel-close" title="关闭" id="ai-close-panel">×</button>
        </div>
      </div>
      <div class="ai-panel-content"></div>
      <div class="ai-panel-footer">
        <span class="ai-panel-hint">💡 提示：结果可编辑，点击复制按钮一键复制</span>
      </div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#ai-close-panel').addEventListener('click', () => {
      panel.style.display = 'none';
      isPanelVisible = false;
    });

    panel.querySelector('#ai-copy-btn').addEventListener('click', () => {
      copyToClipboard(currentResult);
      showToast('已复制到剪贴板');
    });

    panel.querySelector('#ai-compare-btn').addEventListener('click', () => {
      showCompareView();
    });

    panel.querySelector('#ai-regenerate-btn').addEventListener('click', () => {
      const action = panel.querySelector('.ai-panel-title span').textContent.replace('结果', '');
      handleMenuAction(getActionKey(action));
    });

    return panel;
  }

  function showCompareView() {
    const panel = document.getElementById('ai-assistant-result-panel');
    const content = panel.querySelector('.ai-panel-content');
    
    content.innerHTML = `
      <div class="ai-compare-container">
        <div class="ai-compare-col">
          <div class="ai-compare-header">原文</div>
          <div class="ai-compare-content">${escapeHtml(selectedText)}</div>
        </div>
        <div class="ai-compare-divider"></div>
        <div class="ai-compare-col">
          <div class="ai-compare-header">AI 处理结果</div>
          <div class="ai-compare-content">${formatResult(currentResult)}</div>
        </div>
      </div>
    `;
  }

  function getActionName(action) {
    const names = {
      rewrite: '文本改写',
      summarize: '长文摘要',
      translate: '翻译',
      reply: '回复生成',
      titles: '标题备选',
      tone: '语气转换',
      sensitive: '敏感词检测',
      key_points: '要点提取',
      table_explain: '表格解释',
      page_summary: '网页摘要'
    };
    return names[action] || '处理';
  }

  function getActionKey(name) {
    const keys = {
      '文本改写': 'rewrite',
      '长文摘要': 'summarize',
      '翻译': 'translate',
      '回复生成': 'reply',
      '标题备选': 'titles',
      '语气转换': 'tone',
      '敏感词检测': 'sensitive',
      '要点提取': 'key_points',
      '表格解释': 'table_explain'
    };
    return keys[name] || 'rewrite';
  }

  function formatResult(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'ai-assistant-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function saveToHistory(action, result) {
    chrome.storage.local.get(['history'], (data) => {
      const history = data.history || [];
      history.unshift({
        id: Date.now().toString(),
        action: getActionName(action),
        originalText: selectedText,
        result,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        title: document.title
      });
      if (history.length > 100) history.pop();
      chrome.storage.local.set({ history });
    });
  }

  function showTranslateDialog(text) {
    const dialog = document.createElement('div');
    dialog.className = 'ai-assistant-dialog';
    dialog.innerHTML = `
      <div class="ai-dialog-mask"></div>
      <div class="ai-dialog-box">
        <div class="ai-dialog-title">选择翻译目标语言</div>
        <div class="ai-dialog-content">
          <select id="ai-target-lang" class="ai-select">
            <option value="en">英语</option>
            <option value="ja">日语</option>
            <option value="ko">韩语</option>
            <option value="fr">法语</option>
            <option value="de">德语</option>
            <option value="es">西班牙语</option>
            <option value="zh">中文（简体）</option>
          </select>
        </div>
        <div class="ai-dialog-footer">
          <button class="ai-btn ai-btn-secondary" id="ai-dialog-cancel">取消</button>
          <button class="ai-btn ai-btn-primary" id="ai-dialog-confirm">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector('#ai-dialog-cancel').addEventListener('click', () => dialog.remove());
    dialog.querySelector('.ai-dialog-mask').addEventListener('click', () => dialog.remove());
    
    dialog.querySelector('#ai-dialog-confirm').addEventListener('click', () => {
      const lang = dialog.querySelector('#ai-target-lang').value;
      dialog.remove();
      
      selectedText = text;
      showLoadingPanel('translate');
      
      chrome.runtime.sendMessage({
        type: 'CALL_AI',
        prompt: `请将以下文本翻译成${getLangName(lang)}：\n\n${text}`
      }, (response) => {
        if (response && response.success) {
          showResultPanel('translate', response.result);
          saveToHistory('translate', response.result);
        }
      });
    });
  }

  function getLangName(code) {
    const names = {
      en: '英语',
      ja: '日语',
      ko: '韩语',
      fr: '法语',
      de: '德语',
      es: '西班牙语',
      zh: '中文'
    };
    return names[code] || '英语';
  }

  document.addEventListener('mouseup', (e) => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      
      if (text && text.length > 1 && e.button === 0 && settings.floatingMenu) {
        selectedText = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showFloatingMenu(rect.left + window.scrollX, rect.bottom + window.scrollY);
      } else if (!e.target.closest('#ai-assistant-floating-menu') && 
                 !e.target.closest('#ai-assistant-result-panel')) {
        hideFloatingMenu();
      }
    }, 10);
  });

  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('#ai-assistant-floating-menu') && 
        !e.target.closest('#ai-assistant-result-panel')) {
      hideFloatingMenu();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_RESULT') {
      selectedText = message.originalText;
      showResultPanel(message.action, message.result);
    } else if (message.type === 'SHOW_TRANSLATE_DIALOG') {
      showTranslateDialog(message.text);
    }
  });

  function extractPageContent() {
    let content = '';
    const article = document.querySelector('article') || 
                      document.querySelector('.article') ||
                      document.querySelector('.content') ||
                      document.querySelector('.post-content') ||
                      document.body;
    
    if (article) {
      const paragraphs = article.querySelectorAll('p');
      paragraphs.forEach(p => {
        content += p.textContent + '\n\n';
      });
    }
    
    if (content.length < 100) {
      content = document.body.innerText;
    }
    
    return content.substring(0, 8000);
  }

})();
