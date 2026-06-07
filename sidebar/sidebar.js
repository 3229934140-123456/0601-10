// sidebar.js - 侧边栏主逻辑

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initQuickActions();
  initInputSection();
  initPromptLibrary();
  initSummary();
  initBatch();
  initAudit();
  initHistory();
  initSettings();
  loadUsageStats();
  initMessageListener();
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });
      
      const target = document.getElementById(`tab-${tabName}`);
      if (target) {
        target.classList.add('active');
        target.style.display = 'block';
      }
    });
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    showSettings();
  });

  document.getElementById('back-from-settings').addEventListener('click', () => {
    hideSettings();
  });
}

function showSettings() {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  
  const settingsTab = document.getElementById('tab-settings');
  settingsTab.classList.add('active');
  settingsTab.style.display = 'block';
  
  loadSettings();
}

function hideSettings() {
  document.querySelector('.nav-tab[data-tab="home"]').click();
}

function initQuickActions() {
  const actionCards = document.querySelectorAll('.action-card');
  
  actionCards.forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      handleQuickAction(action);
    });
  });
}

function handleQuickAction(action) {
  const textarea = document.getElementById('input-textarea');
  const text = textarea.value.trim();
  
  if (!text) {
    showToast('请先输入文本内容', 'error');
    return;
  }
  
  processAIAction(action, text);
}

function initInputSection() {
  const processBtn = document.getElementById('process-btn');
  const clearBtn = document.getElementById('clear-btn');
  const pasteBtn = document.getElementById('paste-btn');
  const textarea = document.getElementById('input-textarea');
  
  processBtn.addEventListener('click', () => {
    const action = document.getElementById('action-select').value;
    const text = textarea.value.trim();
    
    if (!text) {
      showToast('请输入文本内容', 'error');
      return;
    }
    
    processAIAction(action, text);
  });
  
  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('compare-section').style.display = 'none';
  });
  
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      textarea.value = text;
      showToast('已粘贴');
    } catch (err) {
      showToast('粘贴失败，请手动粘贴', 'error');
    }
  });

  document.getElementById('copy-result-btn').addEventListener('click', () => {
    const result = document.getElementById('result-content').textContent;
    copyToClipboard(result);
  });

  document.getElementById('compare-btn').addEventListener('click', toggleCompare);
  
  document.getElementById('save-favorite-btn').addEventListener('click', () => {
    const result = document.getElementById('result-content').textContent;
    addToPromptLibrary(result);
  });
}

function processAIAction(action, text) {
  const loadingSection = document.getElementById('loading-section');
  const resultSection = document.getElementById('result-section');
  
  loadingSection.style.display = 'block';
  resultSection.style.display = 'none';
  
  const prompt = generatePrompt(action, text);
  
  chrome.runtime.sendMessage({
    type: 'CALL_AI',
    prompt
  }, (response) => {
    loadingSection.style.display = 'none';
    
    if (response && response.success) {
      showResult(response.result, text);
      saveToHistory(action, text, response.result);
      updateUsageStats();
    } else {
      showToast('处理失败，请稍后重试', 'error');
    }
  });
}

function generatePrompt(action, text) {
  switch (action) {
    case 'rewrite':
      return `请改写以下文本，使其表达更清晰、更流畅，保持原意不变：\n\n${text}`;
    case 'tone_formal':
      return `请将以下文本转换为正式、专业的语气：\n\n${text}`;
    case 'tone_casual':
      return `请将以下文本转换为轻松、友好的语气：\n\n${text}`;
    case 'tone_professional':
      return `请将以下文本转换为专业、严谨的语气：\n\n${text}`;
    case 'tone_humorous':
      return `请将以下文本转换为幽默、风趣的语气：\n\n${text}`;
    case 'summarize':
      return `请为以下文本生成简洁的摘要，保留核心信息：\n\n${text}`;
    case 'key_points':
      return `请提取以下文本的核心要点，以列表形式呈现：\n\n${text}`;
    case 'reply':
      return `请根据以下内容生成一个合适的回复：\n\n${text}`;
    case 'titles':
      return `请为以下内容生成5个备选标题，风格多样：\n\n${text}`;
    case 'sensitive':
      return `请检测以下文本中是否包含敏感词、违规内容，并给出提示和修改建议：\n\n${text}`;
    case 'table_explain':
      return `请解释以下表格内容的含义，并总结关键信息：\n\n${text}`;
    case 'translate_en':
      return `请将以下文本翻译成英文：\n\n${text}`;
    case 'translate_ja':
      return `请将以下文本翻译成日文：\n\n${text}`;
    case 'translate_ko':
      return `请将以下文本翻译成韩文：\n\n${text}`;
    case 'tone':
      return `请将以下文本转换为更专业的语气：\n\n${text}`;
    case 'translate':
      return `请将以下文本翻译成英文：\n\n${text}`;
    default:
      return text;
  }
}

function showResult(result, originalText) {
  const resultSection = document.getElementById('result-section');
  const resultContent = document.getElementById('result-content');
  
  resultContent.textContent = result;
  resultSection.style.display = 'block';
  
  resultSection.dataset.original = originalText;
  
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function toggleCompare() {
  const compareSection = document.getElementById('compare-section');
  const resultSection = document.getElementById('result-section');
  
  if (compareSection.style.display === 'none' || !compareSection.style.display) {
    const original = resultSection.dataset.original || '';
    const result = document.getElementById('result-content').textContent;
    
    document.getElementById('compare-original').textContent = original;
    document.getElementById('compare-result').textContent = result;
    
    compareSection.style.display = 'flex';
  } else {
    compareSection.style.display = 'none';
  }
}

function initPromptLibrary() {
  loadPrompts();
  
  document.getElementById('add-prompt-btn').addEventListener('click', () => {
    openPromptDetail(null);
  });
  
  document.getElementById('close-prompt-detail').addEventListener('click', () => {
    document.getElementById('prompt-detail').style.display = 'none';
  });
  
  document.getElementById('cancel-prompt-btn').addEventListener('click', () => {
    document.getElementById('prompt-detail').style.display = 'none';
  });
  
  document.getElementById('save-prompt-btn').addEventListener('click', savePrompt);
  
  document.getElementById('delete-prompt-btn').addEventListener('click', deletePrompt);
  
  document.getElementById('use-prompt-btn').addEventListener('click', usePrompt);
  
  document.getElementById('prompt-search').addEventListener('input', (e) => {
    filterPrompts(e.target.value);
  });
  
  document.querySelectorAll('.category-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      filterPromptsByCategory(tag.dataset.category);
    });
  });
}

function loadPrompts() {
  chrome.storage.local.get(['promptLibrary'], (result) => {
    const prompts = result.promptLibrary || [];
    renderPrompts(prompts);
  });
}

function renderPrompts(prompts) {
  const list = document.getElementById('prompt-list');
  
  if (prompts.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <p>暂无提示词</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = prompts.map(prompt => `
    <div class="prompt-item" data-id="${prompt.id}">
      <div class="prompt-item-header">
        <span class="prompt-item-name">${escapeHtml(prompt.name)}</span>
        <span class="prompt-item-category">${escapeHtml(prompt.category || '自定义')}</span>
      </div>
      <div class="prompt-item-preview">${escapeHtml(prompt.content.substring(0, 60))}...</div>
      <div class="prompt-item-footer">
        <span class="prompt-item-vars">
          ${prompt.variables && prompt.variables.length > 0 ? `变量: ${prompt.variables.join(', ')}` : '无变量'}
        </span>
        <div class="prompt-item-actions">
          <button class="favorite-btn ${prompt.favorite ? 'active' : ''}" data-id="${prompt.id}" title="收藏">
            ${prompt.favorite ? '⭐' : '☆'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
  
  list.querySelectorAll('.prompt-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('favorite-btn')) return;
      const id = item.dataset.id;
      openPromptDetail(id);
    });
  });
  
  list.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.id);
    });
  });
}

function openPromptDetail(id) {
  const detail = document.getElementById('prompt-detail');
  
  if (id) {
    chrome.storage.local.get(['promptLibrary'], (result) => {
      const prompts = result.promptLibrary || [];
      const prompt = prompts.find(p => p.id === id);
      
      if (prompt) {
        detail.dataset.id = id;
        document.getElementById('prompt-detail-title').textContent = '编辑提示词';
        document.getElementById('prompt-name-input').value = prompt.name;
        document.getElementById('prompt-category-select').value = prompt.category || '自定义';
        document.getElementById('prompt-content-input').value = prompt.content;
        document.getElementById('delete-prompt-btn').style.display = 'inline-flex';
        
        renderVariables(prompt.variables || []);
      }
      
      detail.style.display = 'block';
    });
  } else {
    detail.dataset.id = '';
    document.getElementById('prompt-detail-title').textContent = '新建提示词';
    document.getElementById('prompt-name-input').value = '';
    document.getElementById('prompt-category-select').value = '自定义';
    document.getElementById('prompt-content-input').value = '';
    document.getElementById('delete-prompt-btn').style.display = 'none';
    renderVariables([]);
    detail.style.display = 'block';
  }
}

function renderVariables(variables) {
  const container = document.getElementById('prompt-variables');
  
  if (variables.length === 0) {
    container.innerHTML = '<span style="color:#9ca3af;font-size:12px;">暂无变量</span>';
    return;
  }
  
  container.innerHTML = variables.map(v => `
    <div class="variable-input">
      <span class="variable-name">${escapeHtml(v)}</span>
      <input type="text" data-var="${escapeHtml(v)}" placeholder="值">
    </div>
  `).join('');
}

function extractVariables(content) {
  const regex = /\{\{(\w+)\}\}/g;
  const variables = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

function savePrompt() {
  const detail = document.getElementById('prompt-detail');
  const id = detail.dataset.id;
  const name = document.getElementById('prompt-name-input').value.trim();
  const category = document.getElementById('prompt-category-select').value;
  const content = document.getElementById('prompt-content-input').value.trim();
  
  if (!name || !content) {
    showToast('请填写名称和内容', 'error');
    return;
  }
  
  const variables = extractVariables(content);
  
  chrome.storage.local.get(['promptLibrary'], (result) => {
    let prompts = result.promptLibrary || [];
    
    if (id) {
      const index = prompts.findIndex(p => p.id === id);
      if (index !== -1) {
        prompts[index] = { ...prompts[index], name, category, content, variables };
      }
    } else {
      const newPrompt = {
        id: Date.now().toString(),
        name,
        category,
        content,
        variables,
        favorite: false,
        createTime: new Date().toISOString()
      };
      prompts.unshift(newPrompt);
    }
    
    chrome.storage.local.set({ promptLibrary: prompts }, () => {
      showToast('保存成功');
      loadPrompts();
      detail.style.display = 'none';
    });
  });
}

function deletePrompt() {
  const detail = document.getElementById('prompt-detail');
  const id = detail.dataset.id;
  
  if (!id) return;
  
  if (!confirm('确定要删除这个提示词吗？')) return;
  
  chrome.storage.local.get(['promptLibrary'], (result) => {
    let prompts = result.promptLibrary || [];
    prompts = prompts.filter(p => p.id !== id);
    
    chrome.storage.local.set({ promptLibrary: prompts }, () => {
      showToast('删除成功');
      loadPrompts();
      detail.style.display = 'none';
    });
  });
}

function usePrompt() {
  const content = document.getElementById('prompt-content-input').value;
  const variableInputs = document.querySelectorAll('.variable-input input');
  
  let finalContent = content;
  variableInputs.forEach(input => {
    const varName = input.dataset.var;
    const value = input.value || `{{${varName}}}`;
    finalContent = finalContent.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
  });
  
  document.querySelector('.nav-tab[data-tab="home"]').click();
  document.getElementById('input-textarea').value = finalContent;
  
  document.getElementById('prompt-detail').style.display = 'none';
  showToast('已应用到输入框');
}

function toggleFavorite(id) {
  chrome.storage.local.get(['promptLibrary'], (result) => {
    let prompts = result.promptLibrary || [];
    const index = prompts.findIndex(p => p.id === id);
    
    if (index !== -1) {
      prompts[index].favorite = !prompts[index].favorite;
      chrome.storage.local.set({ promptLibrary: prompts }, () => {
        loadPrompts();
      });
    }
  });
}

function filterPrompts(keyword) {
  chrome.storage.local.get(['promptLibrary'], (result) => {
    let prompts = result.promptLibrary || [];
    
    if (keyword) {
      prompts = prompts.filter(p => 
        p.name.toLowerCase().includes(keyword.toLowerCase()) ||
        p.content.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    
    const activeCategory = document.querySelector('.category-tag.active').dataset.category;
    if (activeCategory !== 'all') {
      if (activeCategory === 'favorite') {
        prompts = prompts.filter(p => p.favorite);
      } else {
        prompts = prompts.filter(p => p.category === activeCategory);
      }
    }
    
    renderPrompts(prompts);
  });
}

function filterPromptsByCategory(category) {
  const searchKeyword = document.getElementById('prompt-search').value;
  
  chrome.storage.local.get(['promptLibrary'], (result) => {
    let prompts = result.promptLibrary || [];
    
    if (category !== 'all') {
      if (category === 'favorite') {
        prompts = prompts.filter(p => p.favorite);
      } else {
        prompts = prompts.filter(p => p.category === category);
      }
    }
    
    if (searchKeyword) {
      prompts = prompts.filter(p => 
        p.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        p.content.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    renderPrompts(prompts);
  });
}

function addToPromptLibrary(text) {
  chrome.storage.local.get(['promptLibrary'], (result) => {
    let prompts = result.promptLibrary || [];
    
    const newPrompt = {
      id: Date.now().toString(),
      name: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
      category: '自定义',
      content: text,
      variables: [],
      favorite: true,
      createTime: new Date().toISOString()
    };
    
    prompts.unshift(newPrompt);
    
    chrome.storage.local.set({ promptLibrary: prompts }, () => {
      showToast('已添加到提示词库');
    });
  });
}

function initSummary() {
  document.getElementById('summarize-page-btn').addEventListener('click', summarizeCurrentPage);
  
  document.getElementById('copy-summary-btn').addEventListener('click', () => {
    const content = document.getElementById('summary-content').textContent;
    copyToClipboard(content);
  });
  
  loadCurrentPageInfo();
}

function loadCurrentPageInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      document.getElementById('page-title').textContent = tabs[0].title || '暂无数据';
    }
  });
}

function summarizeCurrentPage() {
  const btn = document.getElementById('summarize-page-btn');
  btn.disabled = true;
  btn.textContent = '总结中...';
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      btn.disabled = false;
      btn.textContent = '📄 总结当前页面';
      return;
    }
    
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: extractPageContentJS
    }, (results) => {
      if (results && results[0]) {
        const pageContent = results[0].result;
        const summaryType = document.querySelector('input[name="summary-type"]:checked').value;
        
        let prompt = '';
        switch (summaryType) {
          case 'brief':
            prompt = `请为以下网页内容生成简短摘要，不超过100字：\n\n${pageContent}`;
            break;
          case 'detailed':
            prompt = `请为以下网页内容生成详细摘要，包含主要观点和结论：\n\n${pageContent}`;
            break;
          case 'points':
            prompt = `请提取以下网页内容的核心要点，以列表形式呈现：\n\n${pageContent}`;
            break;
        }
        
        chrome.runtime.sendMessage({
          type: 'CALL_AI',
          prompt
        }, (response) => {
          btn.disabled = false;
          btn.textContent = '📄 总结当前页面';
          
          if (response && response.success) {
            showSummaryResult(response.result);
            saveToHistory('page_summary', pageContent.substring(0, 500), response.result);
            updateUsageStats();
          } else {
            showToast('总结失败，请重试', 'error');
          }
        });
      } else {
        btn.disabled = false;
        btn.textContent = '📄 总结当前页面';
        showToast('无法获取页面内容', 'error');
      }
    });
  });
}

function extractPageContentJS() {
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

function showSummaryResult(result) {
  const resultSection = document.getElementById('summary-result');
  const resultContent = document.getElementById('summary-content');
  
  resultContent.textContent = result;
  resultSection.style.display = 'block';
}

function initBatch() {
  document.querySelectorAll('.batch-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.batch-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.batchTab;
      document.querySelectorAll('.batch-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`batch-${tabName}`).classList.add('active');
      
      if (tabName === 'tabs') {
        loadTabsList();
      }
    });
  });
  
  document.getElementById('start-batch-btn').addEventListener('click', startBatchProcess);
  
  document.getElementById('export-batch-btn').addEventListener('click', exportBatchResults);
  
  document.getElementById('select-all-tabs-btn').addEventListener('click', toggleSelectAllTabs);
  
  document.getElementById('start-tabs-batch-btn').addEventListener('click', startTabsBatch);
}

function startBatchProcess() {
  const input = document.getElementById('batch-input').value.trim();
  const action = document.getElementById('batch-action').value;
  
  if (!input) {
    showToast('请输入批量处理内容', 'error');
    return;
  }
  
  const items = input.split('\n').filter(line => line.trim());
  
  if (items.length === 0) {
    showToast('没有可处理的内容', 'error');
    return;
  }
  
  const progressSection = document.getElementById('batch-progress');
  const resultsSection = document.getElementById('batch-results');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  progressSection.style.display = 'block';
  resultsSection.style.display = 'none';
  progressFill.style.width = '0%';
  progressText.textContent = `0 / ${items.length}`;
  
  const results = [];
  let current = 0;
  
  function processNext() {
    if (current >= items.length) {
      renderBatchResults(results);
      return;
    }
    
    const item = items[current];
    const prompt = generatePrompt(action, item);
    
    chrome.runtime.sendMessage({
      type: 'CALL_AI',
      prompt
    }, (response) => {
      results.push({
        original: item,
        result: response && response.success ? response.result : '处理失败'
      });
      
      current++;
      progressFill.style.width = `${(current / items.length) * 100}%`;
      progressText.textContent = `${current} / ${items.length}`;
      
      setTimeout(processNext, 500);
    });
  }
  
  processNext();
}

function renderBatchResults(results) {
  const section = document.getElementById('batch-results');
  const list = document.getElementById('batch-results-list');
  
  list.innerHTML = results.map((r, i) => `
    <div class="batch-result-item">
      <div class="batch-result-original">${i + 1}. ${escapeHtml(r.original.substring(0, 50))}...</div>
      <div class="batch-result-text">${escapeHtml(r.result.substring(0, 100))}...</div>
    </div>
  `).join('');
  
  section.style.display = 'block';
  section.dataset.results = JSON.stringify(results);
}

function exportBatchResults() {
  const section = document.getElementById('batch-results');
  const results = JSON.parse(section.dataset.results || '[]');
  
  if (results.length === 0) {
    showToast('没有可导出的结果', 'error');
    return;
  }
  
  let text = '';
  results.forEach((r, i) => {
    text += `=== ${i + 1} ===\n`;
    text += `原文: ${r.original}\n\n`;
    text += `结果: ${r.result}\n\n\n`;
  });
  
  downloadFile(text, `batch-results-${Date.now()}.txt`, 'text/plain');
  showToast('导出成功');
}

function loadTabsList() {
  const list = document.getElementById('tabs-list');
  
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    list.innerHTML = tabs.map(tab => `
      <div class="tab-item" data-id="${tab.id}">
        <input type="checkbox" class="tab-checkbox" value="${tab.id}">
        <img src="${tab.favIconUrl || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><text y=%2214%22 font-size=%2214%22>📄</text></svg>'}" 
             class="tab-item-favicon" alt="">
        <span class="tab-item-title" title="${escapeHtml(tab.title || '')}">${escapeHtml(tab.title || '无标题')}</span>
      </div>
    `).join('');
  });
}

function toggleSelectAllTabs() {
  const checkboxes = document.querySelectorAll('.tab-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
  });
}

function startTabsBatch() {
  const checkboxes = document.querySelectorAll('.tab-checkbox:checked');
  const action = document.getElementById('tabs-batch-action').value;
  
  if (checkboxes.length === 0) {
    showToast('请选择至少一个标签页', 'error');
    return;
  }
  
  const tabIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
  
  showToast(`开始处理 ${tabIds.length} 个标签页...`);
  
  const results = [];
  let completed = 0;
  
  tabIds.forEach((tabId, index) => {
    chrome.tabs.get(tabId, (tab) => {
      if (tab) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: extractPageContentJS
        }, (scriptResults) => {
          const content = scriptResults && scriptResults[0] ? scriptResults[0].result : '';
          const prompt = generatePrompt(action, content);
          
          chrome.runtime.sendMessage({
            type: 'CALL_AI',
            prompt
          }, (response) => {
            results.push({
              title: tab.title,
              url: tab.url,
              result: response && response.success ? response.result : '处理失败'
            });
            
            completed++;
            if (completed === tabIds.length) {
              saveToHistory('batch_tabs', `共${tabIds.length}个标签页`, 
                results.map(r => `${r.title}\n${r.result}`).join('\n\n'));
              showToast(`批量处理完成，共 ${results.length} 个`);
            }
          });
        });
      }
    });
  });
}

function initAudit() {
  loadAuditRecords();
  
  document.getElementById('audit-filter').addEventListener('change', (e) => {
    filterAuditRecords(e.target.value);
  });
  
  document.getElementById('export-audit-btn').addEventListener('click', exportAuditRecords);
}

function loadAuditRecords() {
  chrome.storage.local.get(['auditRecords'], (result) => {
    const records = result.auditRecords || [];
    renderAuditRecords(records);
    updateAuditStats(records);
  });
}

function renderAuditRecords(records) {
  const list = document.getElementById('audit-list');
  
  if (records.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>暂无审核记录</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = records.map(record => `
    <div class="audit-item">
      <div class="audit-item-header">
        <span class="audit-item-type">${escapeHtml(record.type || '内容审核')}</span>
        <span class="audit-item-status ${record.status || 'pass'}">
          ${record.status === 'warning' ? '需关注' : '通过'}
        </span>
      </div>
      <div class="audit-item-content">${escapeHtml(record.content?.substring(0, 100) || '')}</div>
      <div class="audit-item-time">${formatTime(record.timestamp)}</div>
    </div>
  `).join('');
}

function updateAuditStats(records) {
  document.getElementById('audit-total').textContent = records.length;
  document.getElementById('audit-warning').textContent = records.filter(r => r.status === 'warning').length;
  document.getElementById('audit-pass').textContent = records.filter(r => r.status === 'pass').length;
}

function filterAuditRecords(type) {
  chrome.storage.local.get(['auditRecords'], (result) => {
    let records = result.auditRecords || [];
    
    if (type !== 'all') {
      records = records.filter(r => r.type === type);
    }
    
    renderAuditRecords(records);
  });
}

function exportAuditRecords() {
  chrome.storage.local.get(['auditRecords'], (result) => {
    const records = result.auditRecords || [];
    
    if (records.length === 0) {
      showToast('没有可导出的记录', 'error');
      return;
    }
    
    let csv = '类型,状态,内容,时间,URL\n';
    records.forEach(r => {
      csv += `"${r.type || ''}","${r.status || ''}","${(r.content || '').replace(/"/g, '""')}","${r.timestamp || ''}","${r.url || ''}"\n`;
    });
    
    downloadFile(csv, `audit-records-${Date.now()}.csv`, 'text/csv');
    showToast('导出成功');
  });
}

function initHistory() {
  loadHistory();
  
  document.getElementById('clear-history-btn').addEventListener('click', () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      chrome.storage.local.set({ history: [] }, () => {
        loadHistory();
        showToast('历史记录已清空');
      });
    }
  });
}

function loadHistory() {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    renderHistory(history);
  });
}

function renderHistory(history) {
  const list = document.getElementById('history-list');
  
  if (history.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🕐</div>
        <p>暂无历史记录</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = history.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-header">
        <span class="history-item-action">${escapeHtml(item.action || '')}</span>
        <span class="history-item-time">${formatTime(item.timestamp)}</span>
      </div>
      <div class="history-item-preview">${escapeHtml((item.result || '').substring(0, 80))}...</div>
    </div>
  `).join('');
  
  list.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      viewHistoryItem(id);
    });
  });
}

function viewHistoryItem(id) {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    const item = history.find(h => h.id === id);
    
    if (item) {
      document.querySelector('.nav-tab[data-tab="home"]').click();
      document.getElementById('input-textarea').value = item.originalText || '';
      showResult(item.result, item.originalText || '');
    }
  });
}

function saveToHistory(action, originalText, result) {
  chrome.storage.local.get(['history', 'settings'], (data) => {
    const settings = data.settings || {};
    if (!settings.autoSaveHistory) return;
    
    const history = data.history || [];
    const historyItem = {
      id: Date.now().toString(),
      action: getActionName(action),
      originalText,
      result,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    history.unshift(historyItem);
    if (history.length > 100) history.pop();
    
    chrome.storage.local.set({ history });
  });
}

function getActionName(action) {
  const names = {
    rewrite: '文本改写',
    tone_formal: '正式语气',
    tone_casual: '轻松语气',
    tone_professional: '专业语气',
    tone_humorous: '幽默语气',
    summarize: '长文摘要',
    key_points: '要点提取',
    reply: '回复生成',
    titles: '标题备选',
    sensitive: '敏感词检测',
    table_explain: '表格解释',
    translate_en: '英文翻译',
    translate_ja: '日文翻译',
    translate_ko: '韩文翻译',
    page_summary: '网页摘要',
    batch_tabs: '标签页批处理'
  };
  return names[action] || action;
}

function initSettings() {
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
  document.getElementById('reset-settings-btn').addEventListener('click', resetSettings);
  
  document.getElementById('setting-temperature').addEventListener('input', (e) => {
    document.getElementById('temp-value').textContent = e.target.value;
  });
  
  document.getElementById('import-team-btn').addEventListener('click', importTeamTemplates);
  document.getElementById('export-team-btn').addEventListener('click', exportTeamTemplates);
}

function loadSettings() {
  chrome.storage.local.get(['settings', 'usageStats'], (result) => {
    const settings = result.settings || {};
    const stats = result.usageStats || {};
    
    document.getElementById('setting-api-key').value = settings.apiKey || '';
    document.getElementById('setting-api-endpoint').value = settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    document.getElementById('setting-model').value = settings.model || 'gpt-3.5-turbo';
    document.getElementById('setting-temperature').value = settings.temperature || 0.7;
    document.getElementById('temp-value').textContent = settings.temperature || 0.7;
    document.getElementById('setting-daily-quota').value = settings.dailyQuota || 100;
    document.getElementById('setting-show-reminder').checked = settings.showUsageReminder !== false;
    document.getElementById('setting-auto-save').checked = settings.autoSaveHistory !== false;
    document.getElementById('setting-floating-menu').checked = settings.floatingMenu !== false;
    document.getElementById('setting-theme').value = settings.theme || 'light';
    
    document.getElementById('usage-today').textContent = `${stats.todayCalls || 0} 次`;
    document.getElementById('usage-month').textContent = `${stats.monthlyCalls || 0} 次`;
    document.getElementById('usage-total-count').textContent = `${stats.totalCalls || 0} 次`;
  });
}

function saveSettings() {
  const settings = {
    apiKey: document.getElementById('setting-api-key').value,
    apiEndpoint: document.getElementById('setting-api-endpoint').value,
    model: document.getElementById('setting-model').value,
    temperature: parseFloat(document.getElementById('setting-temperature').value),
    dailyQuota: parseInt(document.getElementById('setting-daily-quota').value) || 100,
    showUsageReminder: document.getElementById('setting-show-reminder').checked,
    autoSaveHistory: document.getElementById('setting-auto-save').checked,
    floatingMenu: document.getElementById('setting-floating-menu').checked,
    theme: document.getElementById('setting-theme').value
  };
  
  chrome.storage.local.set({ settings: settings }, () => {
    showToast('设置已保存');
    loadUsageStats();
  });
}

function resetSettings() {
  if (!confirm('确定要恢复默认设置吗？')) return;
  
  const defaultSettings = {
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    language: 'zh-CN',
    theme: 'light',
    autoSaveHistory: true,
    showUsageReminder: true,
    floatingMenu: true,
    dailyQuota: 100
  };
  
  chrome.storage.local.set({ settings: defaultSettings }, () => {
    loadSettings();
    showToast('已恢复默认设置');
  });
}

function importTeamTemplates() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const templates = JSON.parse(event.target.result);
        
        chrome.storage.local.get(['promptLibrary'], (result) => {
          let prompts = result.promptLibrary || [];
          
          templates.forEach(t => {
            prompts.unshift({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              ...t,
              category: '团队共享',
              createTime: new Date().toISOString()
            });
          });
          
          chrome.storage.local.set({ promptLibrary: prompts }, () => {
            showToast(`成功导入 ${templates.length} 个模板`);
          });
        });
      } catch (err) {
        showToast('导入失败，文件格式不正确', 'error');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

function exportTeamTemplates() {
  chrome.storage.local.get(['promptLibrary'], (result) => {
    const prompts = result.promptLibrary || [];
    
    const data = prompts.map(p => ({
      name: p.name,
      content: p.content,
      variables: p.variables || [],
      category: p.category
    }));
    
    downloadFile(JSON.stringify(data, null, 2), 'team-templates.json', 'application/json');
    showToast('导出成功');
  });
}

function loadUsageStats() {
  chrome.storage.local.get(['usageStats', 'settings'], (result) => {
    const stats = result.usageStats || {};
    const settings = result.settings || {};
    
    document.getElementById('usage-count').textContent = stats.todayCalls || 0;
    
    const quota = settings.dailyQuota || 100;
    document.querySelector('.usage-total').textContent = `/ ${quota}`;
    
    const badge = document.getElementById('usage-badge');
    const usagePercent = ((stats.todayCalls || 0) / quota) * 100;
    
    if (usagePercent >= 80) {
      badge.style.background = 'rgba(239, 68, 68, 0.3)';
    } else if (usagePercent >= 50) {
      badge.style.background = 'rgba(245, 158, 11, 0.3)';
    } else {
      badge.style.background = 'rgba(255, 255, 255, 0.2)';
    }
  });
}

function updateUsageStats() {
  chrome.storage.local.get(['usageStats'], (result) => {
    const stats = result.usageStats || {};
    const today = new Date().toDateString();
    const thisMonth = new Date().toISOString().slice(0, 7);
    
    if (stats.lastResetDate !== today) {
      stats.todayCalls = 0;
      stats.lastResetDate = today;
    }
    
    if (stats.lastMonthReset !== thisMonth) {
      stats.monthlyCalls = 0;
      stats.lastMonthReset = thisMonth;
    }
    
    stats.totalCalls = (stats.totalCalls || 0) + 1;
    stats.todayCalls = (stats.todayCalls || 0) + 1;
    stats.monthlyCalls = (stats.monthlyCalls || 0) + 1;
    
    chrome.storage.local.set({ usageStats: stats }, () => {
      loadUsageStats();
    });
  });
}

function initMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_RESULT') {
      loadUsageStats();
      loadHistory();
    } else if (message.type === 'USAGE_UPDATED') {
      loadUsageStats();
      const settingsTab = document.getElementById('tab-settings');
      if (settingsTab && settingsTab.style.display !== 'none') {
        loadSettings();
      }
    } else if (message.type === 'SWITCH_TAB') {
      switchTab(message.tab);
    } else if (message.type === 'SET_FEATURE') {
      switchTab('home');
      const actionSelect = document.getElementById('action-select');
      if (actionSelect) {
        const featureMap = {
          rewrite: 'rewrite',
          translate: 'translate_en',
          summarize: 'summarize',
          reply: 'reply',
          titles: 'titles',
          sensitive: 'sensitive',
          key_points: 'key_points',
          table_explain: 'table_explain',
          tone: 'tone_formal'
        };
        if (featureMap[message.feature]) {
          actionSelect.value = featureMap[message.feature];
        }
      }
    } else if (message.type === 'NEW_AUDIT_RECORD') {
      loadAuditRecords();
    }
  });
}

function switchTab(tabName) {
  if (tabName === 'settings') {
    showSettings();
    return;
  }
  
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(t => t.classList.remove('active'));
  tabContents.forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });
  
  const activeTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  const target = document.getElementById(`tab-${tabName}`);
  if (target) {
    target.classList.add('active');
    target.style.display = 'block';
  }
  
  if (tabName === 'summary') {
    loadCurrentPageInfo();
  } else if (tabName === 'history') {
    loadHistory();
  } else if (tabName === 'audit') {
    loadAuditRecords();
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制到剪贴板');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('已复制到剪贴板');
  });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  
  return date.toLocaleDateString('zh-CN');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
