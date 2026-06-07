// background.js - 背景服务脚本，插件核心
const AI_ACTIONS = {
  REWRITE: 'rewrite',
  TONE: 'tone_change',
  SUMMARIZE: 'summarize',
  KEY_POINTS: 'key_points',
  REPLY: 'reply_generate',
  TITLES: 'titles_alternative',
  SENSITIVE: 'sensitive_check',
  TABLE_EXPLAIN: 'table_explain',
  TRANSLATE: 'translate',
  OCR: 'ocr',
  PAGE_SUMMARY: 'page_summary'
};

const CONTEXT_MENU_ITEMS = [
  { id: 'ai-parent', title: 'AI 智能助手', contexts: ['selection', 'page', 'image'], type: 'normal' },
  { id: 'rewrite', title: '✍️ 文本改写', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'tone-formal', title: '🎩 转换为正式语气', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'tone-casual', title: '😊 转换为轻松语气', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'tone-professional', title: '💼 转换为专业语气', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'tone-humorous', title: '😄 转换为幽默语气', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'summarize', title: '📝 长文摘要', parentId: 'ai-parent', contexts: ['selection', 'page'] },
  { id: 'key-points', title: '🎯 要点提取', parentId: 'ai-parent', contexts: ['selection', 'page'] },
  { id: 'reply', title: '💬 回复生成', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'titles', title: '📌 标题备选', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'sensitive', title: '⚠️ 敏感词检测', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'table-explain', title: '📊 表格内容解释', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'translate-en', title: '🌍 翻译成英文', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'translate-ja', title: '🇯🇵 翻译成日文', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'translate-ko', title: '🇰🇷 翻译成韩文', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'translate-custom', title: '🔄 自定义翻译...', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'ocr', title: '📷 截图识别文字', parentId: 'ai-parent', contexts: ['image'] },
  { id: 'page-summary', title: '📄 网页摘要', parentId: 'ai-parent', contexts: ['page'] },
  { id: 'add-to-prompt', title: '⭐ 收藏为提示词', parentId: 'ai-parent', contexts: ['selection'] },
  { id: 'open-sidebar', title: '📂 打开侧边栏', parentId: 'ai-parent', contexts: ['page', 'selection', 'image'] }
];

chrome.runtime.onInstalled.addListener(() => {
  console.log('AI 智能助手插件已安装');
  
  CONTEXT_MENU_ITEMS.forEach(item => {
    chrome.contextMenus.create({
      id: item.id,
      title: item.title,
      contexts: item.contexts,
      parentId: item.parentId,
      type: item.type || 'normal'
    });
  });

  chrome.storage.local.get(['settings', 'promptLibrary', 'history', 'usageStats'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
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
          dailyQuota: 100,
          teamTemplates: []
        }
      });
    }
    if (!result.promptLibrary) {
      chrome.storage.local.set({
        promptLibrary: [
          { id: '1', name: '客服回复模板', category: '客服', content: '请作为专业的客服人员，对以下内容进行回复：{{content}}', variables: ['content'], favorite: true },
          { id: '2', name: '产品介绍改写', category: '运营', content: '请将以下产品介绍改写得更有吸引力：{{content}}', variables: ['content'], favorite: false },
          { id: '3', name: '文章摘要', category: '内容', content: '请为以下文章生成一个简洁的摘要，不超过200字：{{content}}', variables: ['content'], favorite: true },
          { id: '4', name: '标题生成', category: '内容', content: '请为以下内容生成5个吸引人的标题：{{content}}', variables: ['content'], favorite: false },
          { id: '5', name: '邮件回复', category: '客服', content: '请作为专业的商务人士，对以下邮件进行回复：{{content}}', variables: ['content'], favorite: false }
        ]
      });
    }
    if (!result.history) {
      chrome.storage.local.set({ history: [] });
    }
    if (!result.usageStats) {
      chrome.storage.local.set({
        usageStats: {
          totalCalls: 0,
          todayCalls: 0,
          lastResetDate: new Date().toDateString(),
          monthlyCalls: 0,
          lastMonthReset: new Date().toISOString().slice(0, 7)
        }
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuId = info.menuItemId;
  const selectedText = info.selectionText || '';
  const imageUrl = info.srcUrl || '';

  if (menuId === 'open-sidebar') {
    openSidebar();
    return;
  }

  if (menuId === 'add-to-prompt' && selectedText) {
    addToPromptLibrary(selectedText);
    return;
  }

  if (menuId === 'page-summary') {
    handlePageSummary(tab);
    return;
  }

  if (menuId === 'ocr' && imageUrl) {
    handleOCR(imageUrl, tab);
    return;
  }

  if (selectedText) {
    handleTextAction(menuId, selectedText, tab);
  }
});

chrome.action.onClicked.addListener(() => {
  openSidebar();
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (command === 'open-sidebar') {
    openSidebar();
  } else if (command === 'summarize-page' && tab) {
    handlePageSummary(tab);
  }
});

function openSidebar() {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
}

function handleTextAction(action, text, tab) {
  let prompt = '';
  let actionName = '';

  switch (action) {
    case 'rewrite':
      prompt = `请改写以下文本，使其表达更清晰、更流畅，保持原意不变：\n\n${text}`;
      actionName = '文本改写';
      break;
    case 'tone-formal':
      prompt = `请将以下文本转换为正式、专业的语气：\n\n${text}`;
      actionName = '正式语气';
      break;
    case 'tone-casual':
      prompt = `请将以下文本转换为轻松、友好的语气：\n\n${text}`;
      actionName = '轻松语气';
      break;
    case 'tone-professional':
      prompt = `请将以下文本转换为专业、严谨的语气：\n\n${text}`;
      actionName = '专业语气';
      break;
    case 'tone-humorous':
      prompt = `请将以下文本转换为幽默、风趣的语气：\n\n${text}`;
      actionName = '幽默语气';
      break;
    case 'summarize':
      prompt = `请为以下文本生成简洁的摘要，保留核心信息：\n\n${text}`;
      actionName = '长文摘要';
      break;
    case 'key-points':
      prompt = `请提取以下文本的核心要点，以列表形式呈现：\n\n${text}`;
      actionName = '要点提取';
      break;
    case 'reply':
      prompt = `请根据以下内容生成一个合适的回复：\n\n${text}`;
      actionName = '回复生成';
      break;
    case 'titles':
      prompt = `请为以下内容生成5个备选标题，风格多样：\n\n${text}`;
      actionName = '标题备选';
      break;
    case 'sensitive':
      prompt = `请检测以下文本中是否包含敏感词、违规内容，并给出提示和修改建议：\n\n${text}`;
      actionName = '敏感词检测';
      break;
    case 'table-explain':
      prompt = `请解释以下表格内容的含义，并总结关键信息：\n\n${text}`;
      actionName = '表格解释';
      break;
    case 'translate-en':
      prompt = `请将以下文本翻译成英文：\n\n${text}`;
      actionName = '英文翻译';
      break;
    case 'translate-ja':
      prompt = `请将以下文本翻译成日文：\n\n${text}`;
      actionName = '日文翻译';
      break;
    case 'translate-ko':
      prompt = `请将以下文本翻译成韩文：\n\n${text}`;
      actionName = '韩文翻译';
      break;
    case 'translate-custom':
      chrome.tabs.sendMessage(tab.id, { type: 'SHOW_TRANSLATE_DIALOG', text });
      return;
    default:
      return;
  }

  processAIAction(actionName, prompt, text, tab);
}

async function processAIAction(actionName, prompt, originalText, tab) {
  const result = await callAI(prompt);
  
  chrome.storage.local.get(['history', 'autoSaveHistory'], (data) => {
    const history = data.history || [];
    const historyItem = {
      id: Date.now().toString(),
      action: actionName,
      originalText,
      result,
      prompt,
      timestamp: new Date().toISOString(),
      url: tab?.url || '',
      title: tab?.title || ''
    };
    
    history.unshift(historyItem);
    if (history.length > 100) history.pop();
    
    chrome.storage.local.set({ history });
  });

  if (actionName === '敏感词检测') {
    saveAuditRecord({
      type: '敏感词检测',
      content: originalText,
      result: result,
      url: tab?.url || '',
      status: analyzeSensitiveResult(result)
    });
  }

  if (tab) {
    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_RESULT',
      action: actionName,
      result,
      originalText
    });
  }

  chrome.runtime.sendMessage({
    type: 'NEW_RESULT',
    action: actionName,
    result,
    originalText,
    timestamp: new Date().toISOString()
  });

  return result;
}

async function callAI(prompt) {
  const { settings } = await chrome.storage.local.get('settings');
  
  let result;
  
  if (!settings?.apiKey) {
    result = mockAIResponse(prompt);
  } else {
    try {
      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: settings.temperature,
          max_tokens: settings.maxTokens
        })
      });

      const data = await response.json();
      result = data.choices?.[0]?.message?.content || '无返回结果';
    } catch (error) {
      console.error('AI调用失败:', error);
      result = `调用失败: ${error.message}\n\n当前为演示模式，以下是模拟结果:\n\n` + mockAIResponse(prompt);
    }
  }
  
  updateUsageStats();
  broadcastUsageUpdate();
  
  return result;
}

function broadcastUsageUpdate() {
  chrome.storage.local.get(['usageStats'], (result) => {
    chrome.runtime.sendMessage({
      type: 'USAGE_UPDATED',
      stats: result.usageStats || {}
    });
  });
}

function mockAIResponse(prompt) {
  if (prompt.includes('改写')) {
    return '【改写结果】\n\n这是经过优化改写的文本版本。原文的核心意思得到了保留，同时表达更加流畅自然，措辞更加精准。整体结构更加清晰，逻辑性更强，读者能够更容易理解和接受其中传达的信息。';
  } else if (prompt.includes('正式') || prompt.includes('专业')) {
    return '【正式/专业版】\n\n尊敬的相关方：\n\n特此就上述事宜进行说明。经审慎考量，我方认为所述内容具备充分的合理性与可行性。建议按既定方案稳步推进，如有任何疑问，请随时与我方联系。\n\n此致\n敬礼';
  } else if (prompt.includes('轻松') || prompt.includes('友好')) {
    return '【轻松版】\n\n嘿～ 这个事儿其实挺简单的！咱们就按之前说的来，有问题随时找我聊哈～ 不用太客气，大家都是朋友嘛 😊';
  } else if (prompt.includes('幽默') || prompt.includes('风趣')) {
    return '【幽默版】\n\n话说这事儿啊，说难不难说简单也不简单。就像煮泡面，水开了面放进去，等三分钟就能吃——但调料包放多少，全看你口味重不重～ 🎉';
  } else if (prompt.includes('摘要')) {
    return '【内容摘要】\n\n本文主要探讨了相关主题的核心要点。首先介绍了背景信息，接着分析了主要问题，最后提出了解决方案。关键观点包括：\n• 观点一：核心问题的识别\n• 观点二：分析框架的应用\n• 观点三：实践建议的提出\n\n总体而言，文章为读者提供了有价值的参考思路。';
  } else if (prompt.includes('要点')) {
    return '【核心要点】\n\n1. 主要背景：介绍了事件的来龙去脉和基本情况\n2. 关键问题：指出了当前面临的核心挑战和痛点\n3. 分析结论：通过数据和案例分析得出的主要结论\n4. 建议方案：针对问题提出的具体解决措施\n5. 注意事项：实施过程中需要关注的重点和风险点';
  } else if (prompt.includes('回复')) {
    return '【回复内容】\n\n您好！感谢您的来信/咨询。\n\n关于您提到的问题，我来为您详细解答：\n\n1. 首先，关于第一点...\n2. 其次，关于第二点...\n3. 最后，关于第三点...\n\n如果您还有其他疑问，请随时告诉我。祝您工作顺利！\n\n此致\n敬礼';
  } else if (prompt.includes('标题')) {
    return '【5个备选标题】\n\n1. 《深度解析：如何高效完成工作的秘诀》\n2. 《从零开始：手把手教你掌握这项技能》\n3. 《行业内鲜为人知的3个真相，看完颠覆认知》\n4. 《为什么90%的人都做错了？答案在这里》\n5. 《实战干货｜提升效率的5个实用方法，亲测有效》';
  } else if (prompt.includes('敏感')) {
    return '【敏感词检测报告】\n\n检测结果：未发现明显违规敏感词。\n\n建议注意事项：\n• 部分表述可进一步优化，避免歧义\n• 建议增加合规性表述\n• 可适当调整语气，降低风险\n\n总体评价：内容整体合规，可正常使用。';
  } else if (prompt.includes('表格')) {
    return '【表格内容解释】\n\n表格概述：该表格展示了相关数据的对比情况。\n\n关键数据：\n• 总量：呈现稳步增长趋势\n• 增长率：较上期提升显著\n• 占比：核心指标占比较大\n\n结论：整体表现良好，各项指标均达标。';
  } else if (prompt.includes('翻译') || prompt.includes('translate')) {
    if (prompt.includes('英文')) {
      return '【English Translation】\n\nHello everyone! This is the English translation of the text. The content has been carefully translated to ensure accuracy and natural expression in English. Thank you for reading!';
    } else if (prompt.includes('日文')) {
      return '【日本語翻訳】\n\n皆さん、こんにちは！これはテキストの日本語訳です。内容は正確さと自然な表現を確保するために注意深く翻訳されています。お読みいただきありがとうございます！';
    } else if (prompt.includes('韩文')) {
      return '【한국어 번역】\n\n안녕하세요! 이것은 텍스트의 한국어 번역입니다. 내용은 정확성과 자연스러운 표현을 보장하기 위해 세심하게 번역되었습니다. 읽어주셔서 감사합니다!';
    }
  }
  
  return '【AI处理结果】\n\n这是模拟的AI响应结果。在实际使用中，请配置有效的API密钥以获得真实的AI服务响应。\n\n当前提示词：\n' + prompt.substring(0, 200) + '...';
}

function handlePageSummary(tab) {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: extractPageContent
  }, async (results) => {
    if (results && results[0]) {
      const pageContent = results[0].result;
      const prompt = `请为以下网页内容生成详细摘要，包含核心观点、关键信息和结论：\n\n标题：${tab.title}\n\n内容：\n${pageContent}`;
      
      processAIAction('网页摘要', prompt, pageContent.substring(0, 500), tab);
    }
  });
}

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

function handleOCR(imageUrl, tab) {
  performOCRWithImage(imageUrl, tab);
}

async function performOCRWithImage(imageUrl, tab) {
  try {
    const result = await mockOCRResult();
    
    await updateUsageStats();
    await broadcastUsageUpdate();
    
    const record = {
      id: Date.now(),
      type: 'ocr',
      action: '截图识别',
      imageUrl: imageUrl,
      result: result,
      sourceUrl: tab.url,
      sourceTitle: tab.title,
      timestamp: Date.now()
    };
    
    chrome.storage.local.get({ history: [] }, (data) => {
      const history = data.history || [];
      history.unshift(record);
      if (history.length > 100) history.pop();
      chrome.storage.local.set({ history });
    });
    
    if (chrome.sidePanel && chrome.sidePanel.open) {
      chrome.sidePanel.open({ windowId: tab.windowId });
    }
    
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'OCR_RESULT_FROM_MENU',
        imageUrl: imageUrl,
        result: result,
        sourceUrl: tab.url,
        sourceTitle: tab.title
      });
    }, 500);
    
  } catch (error) {
    console.error('OCR 处理失败:', error);
  }
}

function addToPromptLibrary(text) {
  chrome.storage.local.get(['promptLibrary'], (result) => {
    const library = result.promptLibrary || [];
    const newPrompt = {
      id: Date.now().toString(),
      name: text.substring(0, 20) + '...',
      category: '自定义',
      content: text,
      variables: [],
      favorite: false,
      createTime: new Date().toISOString()
    };
    library.unshift(newPrompt);
    chrome.storage.local.set({ promptLibrary: library });
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon48.png',
      title: '收藏成功',
      message: '已添加到提示词库'
    });
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
    
    chrome.storage.local.set({ usageStats: stats });
    
    chrome.storage.local.get(['settings'], (settingResult) => {
      const settings = settingResult.settings || {};
      if (settings.showUsageReminder && settings.dailyQuota) {
        const usagePercent = (stats.todayCalls / settings.dailyQuota) * 100;
        if (usagePercent >= 80) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: '../icons/icon48.png',
            title: '使用额度提醒',
            message: `今日已使用 ${stats.todayCalls} 次，占每日额度 ${Math.round(usagePercent)}%`
          });
        }
      }
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'CALL_AI':
      callAI(message.prompt).then(result => {
        sendResponse({ success: true, result });
      });
      return true;
      
    case 'GET_USAGE_STATS':
      chrome.storage.local.get(['usageStats'], (result) => {
        sendResponse(result.usageStats || {});
      });
      return true;
      
    case 'BATCH_PROCESS':
      handleBatchProcess(message.data, sender).then(result => {
        sendResponse(result);
      });
      return true;
      
    case 'COMPARE_RESULTS':
      sendResponse({ success: true, compared: true });
      break;
      
    case 'SAVE_AUDIT_RECORD':
      saveAuditRecord(message.record);
      sendResponse({ success: true });
      break;
      
    case 'SWITCH_TAB':
      chrome.runtime.sendMessage({
        type: 'SWITCH_TAB',
        tab: message.tab
      });
      sendResponse({ success: true });
      break;
      
    case 'SET_FEATURE':
      chrome.runtime.sendMessage({
        type: 'SET_FEATURE',
        feature: message.feature
      });
      sendResponse({ success: true });
      break;
      
    case 'GET_PROMPT_LIBRARY':
      chrome.storage.local.get(['promptLibrary'], (result) => {
        sendResponse({ success: true, data: result.promptLibrary || [] });
      });
      return true;
      
    case 'GET_HISTORY':
      chrome.storage.local.get(['history'], (result) => {
        sendResponse({ success: true, data: result.history || [] });
      });
      return true;
      
    case 'GET_AUDIT_RECORDS':
      chrome.storage.local.get(['auditRecords'], (result) => {
        sendResponse({ success: true, data: result.auditRecords || [] });
      });
      return true;
      
    case 'OCR_RECOGNIZE':
      handleOCRFromSidebar(message.imageData).then(result => {
        sendResponse(result);
      });
      return true;
      
    default:
      break;
  }
});

async function handleOCRFromSidebar(imageData) {
  try {
    const ocrResult = await mockOCRResult();
    
    await updateUsageStats();
    await broadcastUsageUpdate();
    
    return { success: true, result: ocrResult };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function mockOCRResult() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sampleTexts = [
        '这是一段示例识别文字。\n\n图片识别功能可以帮助您快速提取图片中的文字内容。\n\n支持多种图片格式，识别准确度高。\n\n您可以将识别结果复制到剪贴板，或保存到历史记录中。',
        '产品规格说明\n\n型号：AI-2024-Pro\n尺寸：180mm x 90mm\n重量：250g\n电池：5000mAh\n续航：12小时\n\n特点：\n• 智能语音交互\n• 多语言翻译\n• 快速响应\n• 轻薄便携',
        '会议纪要 2024年1月15日\n\n参会人员：张三、李四、王五\n\n议题一：Q1目标制定\n  - 完成产品迭代\n  - 用户增长20%\n  - 优化用户体验\n\n议题二：技术方案选型\n  方案A：成本低，开发周期短\n  方案B：性能好，扩展性强\n  最终决定采用方案B\n\n下次会议：1月22日'
      ];
      resolve(sampleTexts[Math.floor(Math.random() * sampleTexts.length)]);
    }, 1500);
  });
}

async function handleBatchProcess(data, sender) {
  const { items, action } = data;
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const prompt = generateBatchPrompt(action, item);
    const result = await callAI(prompt);
    
    results.push({
      id: item.id || i,
      original: item.text || item,
      result,
      status: 'completed'
    });
    
    chrome.runtime.sendMessage({
      type: 'BATCH_PROGRESS',
      current: i + 1,
      total: items.length,
      itemResult: results[results.length - 1]
    });
  }
  
  return { success: true, results };
}

function generateBatchPrompt(action, item) {
  const text = typeof item === 'string' ? item : item.text;
  
  switch (action) {
    case 'rewrite':
      return `请改写以下文本：\n\n${text}`;
    case 'translate':
      return `请将以下文本翻译成英文：\n\n${text}`;
    case 'summarize':
      return `请为以下文本生成摘要：\n\n${text}`;
    case 'titles':
      return `请为以下内容生成3个标题：\n\n${text}`;
    default:
      return text;
  }
}

function analyzeSensitiveResult(result) {
  const lowerResult = result.toLowerCase();
  
  const passPatterns = [
    '未发现', '未检出', '整体合规', '内容合规', '正常使用',
    '没有敏感', '无敏感', '安全', '通过', '合规', '无违规',
    '未包含', '未发现明显', '未检测到'
  ];
  
  const warningPatterns = [
    '存在违规', '包含敏感', '敏感词', '需要修改', '需修改',
    '风险较高', '高风险', '中风险', '存在风险', '违规内容',
    '建议修改', '需关注', '警告', '不符合', '不通过'
  ];
  
  for (const pattern of passPatterns) {
    if (lowerResult.includes(pattern.toLowerCase())) {
      return 'pass';
    }
  }
  
  for (const pattern of warningPatterns) {
    if (lowerResult.includes(pattern.toLowerCase())) {
      return 'warning';
    }
  }
  
  return 'pass';
}

function saveAuditRecord(record) {
  chrome.storage.local.get(['auditRecords'], (result) => {
    const records = result.auditRecords || [];
    const newRecord = {
      id: Date.now().toString(),
      ...record,
      timestamp: new Date().toISOString()
    };
    records.unshift(newRecord);
    if (records.length > 500) records.pop();
    chrome.storage.local.set({ auditRecords: records }, () => {
      chrome.runtime.sendMessage({
        type: 'NEW_AUDIT_RECORD',
        record: newRecord
      });
    });
  });
}

chrome.alarms.create('resetDailyStats', {
  when: getNextMidnight(),
  periodInMinutes: 1440
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyStats') {
    chrome.storage.local.get(['usageStats'], (result) => {
      const stats = result.usageStats || {};
      stats.todayCalls = 0;
      stats.lastResetDate = new Date().toDateString();
      chrome.storage.local.set({ usageStats: stats });
    });
  }
});
