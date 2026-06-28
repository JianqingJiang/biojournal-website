const axios = require('axios');
const xml2js = require('xml2js');

// 生物医药关键词（用于过滤非相关新闻）
const BIOMED_KEYWORDS = [
  // 英文关键词
  'medicine', 'medical', 'biomedical', 'clinical', 'drug', 'therapy', 'treatment',
  'disease', 'cancer', 'tumor', 'patient', 'FDA', 'approval', 'vaccine',
  'pharmaceutical', 'biotech', 'gene therapy', 'CRISPR', 'protein',
  'antibody', 'virus', 'bacteria', 'immune', 'autoimmune', 'diabetes',
  'Alzheimer', 'Parkinson', 'heart', 'liver', 'lung', 'brain', 'trial',
  'hospital', 'doctor', 'nurse', 'surgery', 'transplant', 'stem cell',
  'biomarker', 'diagnostic', 'therapeutic', 'FDA', 'EMA', 'clinical trial',
  'pubmed', 'NEJM', 'Lancet', 'JAMA', 'BMJ', 'Nature Medicine', 'Cell',
  // 中文关键词
  '医学', '医药', '临床', '药物', '治疗', '疾病', '癌症', '肿瘤',
  '患者', 'FDA', '批准', '疫苗', '生物', '基因', '抗体', '病毒',
  '免疫', '糖尿病', '阿尔茨海默', '心脏', '肝脏', '肺部', '脑部',
  '试验', '医院', '医生', '手术', '移植', '干细胞', '诊断', '疗法'
];

// 检查新闻是否与生物医药相关
function isBiomedicalRelated(newsItem) {
  const title = (newsItem.title || '').toLowerCase();
  const summary = (newsItem.summary || '').toLowerCase();
  const content = title + ' ' + summary;
  
  // 检查是否包含至少一个关键词
  for (const keyword of BIOMED_KEYWORDS) {
    if (content.includes(keyword.toLowerCase())) {
      return true;
    }
  }
  
  // 检查来源是否是已知生物医学期刊
  const journal = (newsItem.journal || '').toLowerCase();
  const biomedicalJournals = [
    'science', 'bmj', 'nature', 'cell', 'lancet', 'jama', 'nejm',
    'stat news', 'sciencedaily', 'medical news', 'healthline', 'webmd'
  ];
  
  for (const journalName of biomedicalJournals) {
    if (journal.includes(journalName)) {
      return true;
    }
  }
  
  // 不匹配
  return false;
}

// 翻译文本（英文→中文），使用Google Translate API
async function translateToChinese(text) {
  if (!text || text.trim() === '') return '';
  
  try {
    // 使用Google Translate的非官方API（免费）
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BioJournalBot/1.0)'
      }
    });
    
    // 解析响应格式：[[["翻译结果","原文",null,null,null]],null,"en"]
    if (response.data && response.data[0] && response.data[0][0]) {
      return response.data[0][0][0] || text;
    }
    
    return text; // 翻译失败，返回原文
  } catch (error) {
    console.error(`❌ Translation failed: ${error.message}`);
    return text; // 翻译失败，返回原文
  }
}

// 已验证的真实生物医药News RSS源（2026-06-28已验证）
// 只保留已验证的源，移除所有未验证的源
const INTERNATIONAL_SOURCES = [
  {
    name: 'STAT News',
    nameCn: 'STAT新闻',
    url: 'https://www.statnews.com/feed/',
    verified: true,
    maxItems: 3,
    description: '专注于医疗健康、生命科学、医药行业报道'
  },
  {
    name: 'ScienceDaily Health & Medicine',
    nameCn: 'ScienceDaily健康与医学',
    url: 'https://www.sciencedaily.com/rss/health_medicine.xml',
    verified: true,
    maxItems: 3,
    description: '大众健康与医学领域的最新研究资讯'
  },
  {
    name: 'BMJ News',
    nameCn: '英国医学杂志新闻',
    url: 'https://www.bmj.com/rss/recent.xml',
    verified: true,
    maxItems: 3,
    description: 'BMJ最新医学新闻'
  },
  {
    name: 'Google News - Biomedicine',
    nameCn: 'Google新闻-生物医药',
    url: 'https://news.google.com/rss/search?q=biomedicine+clinical+drug+FDA+vaccine&hl=en-US&gl=US&ceid=US:en',
    verified: true,
    maxItems: 3,
    description: 'Google News生物医药相关新闻'
  },
  {
    name: 'BBC Health',
    nameCn: 'BBC健康栏目',
    url: 'http://feeds.bbci.co.uk/news/health/rss.xml',
    verified: true,
    maxItems: 2,
    description: 'BBC健康新闻'
  },
  {
    name: 'New York Times Health',
    nameCn: '纽约时报健康栏目',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
    verified: true,
    maxItems: 2,
    description: '纽约时报健康新闻'
  },
  {
    name: 'Science Magazine News',
    nameCn: '科学杂志新闻',
    url: 'https://www.science.org/rss/news_current.xml',
    verified: true,
    maxItems: 2,
    description: 'Science杂志新闻（会过滤非生物医药内容）'
  }
];

// 国内生物医药新闻RSS源（已注释 - 用户同意不需要国内源）
// const DOMESTIC_SOURCES = [
//   {
//     name: 'Google News - 生物医药',
//     nameCn: 'Google新闻-生物医药（中文）',
//     url: 'https://news.google.com/rss/search?q=%E7%94%9F%E7%89%A9%E5%8C%BB%E8%8D%AF+%E5%8C%BB%E5%AD%A6+%E4%B8%B4%E5%BA%8A+%E8%8D%AF%E7%89%A9&hl=zh-CN&gl=CN&ceid=CN:zh-Hans',
//     verified: true,
//     maxItems: 3,
//     description: 'Google News中文生物医药相关新闻'
//   }
// ];

// 解析RSS XML
async function parseRSS(url, sourceName) {
  try {
    console.log(`📡 Fetching RSS: ${sourceName} (${url})`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BioJournalBot/1.0)'
      },
      timeout: 15000,
      validateStatus: function(status) {
        return status < 500;
      }
    });
    
    if (response.status !== 200) {
      console.error(`❌ HTTP ${response.status} for ${sourceName}`);
      return null;
    }
    
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      ignoreAttrs: true
    });
    
    const result = await parser.parseStringPromise(response.data);
    
    console.log(`✅ Successfully parsed RSS: ${sourceName}`);
    return result;
  } catch (error) {
    console.error(`❌ Failed to fetch RSS: ${sourceName}`, error.message);
    return null;
  }
}

// 从RSS数据中提取新闻（异步，包含翻译）
async function extractNewsFromRSS(rssData, source) {
  const news = [];
  const maxItems = source.maxItems || 3;
  
  try {
    // 处理RSS 2.0格式
    if (rssData.rss && rssData.rss.channel && rssData.rss.channel.item) {
      let items = rssData.rss.channel.item;
      
      if (!Array.isArray(items)) {
        items = [items];
      }
      
      items = items.slice(0, maxItems * 2); // 先取2倍，过滤后再限制
      
      for (const item of items) {
        if (!item.title || item.title === 'No title') {
          continue;
        }
        
        const newsItem = {
          id: `${source.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: item.title || 'No title',
          titleCn: '', // 将在翻译后填充
          summary: item.description || item.summary || 'No summary available',
          summaryCn: '', // 将在翻译后填充
          journal: source.name,
          journalCn: source.nameCn,
          pubDate: item.pubDate || item.published || new Date().toISOString(),
          url: item.link || item.guid || '#',
          type: source.type || 'international',
          language: source.language || 'en'
        };
        
        // 翻译标题和摘要（异步）
        try {
          newsItem.titleCn = await translateToChinese(newsItem.title);
          // 只翻译摘要的前500字符，避免过长
          const summaryToTranslate = newsItem.summary.substring(0, 500);
          newsItem.summaryCn = await translateToChinese(summaryToTranslate);
        } catch (translateError) {
          console.error(`⚠️ Translation failed for: ${newsItem.title}`, translateError.message);
          newsItem.titleCn = newsItem.title; // 翻译失败，使用原文
          newsItem.summaryCn = newsItem.summary;
        }
        
        // 过滤：只保留生物医药相关新闻
        if (isBiomedicalRelated(newsItem)) {
          news.push(newsItem);
        } else {
          console.log(`⚠️ Skipping non-biomedical news: ${newsItem.title}`);
        }
      }
    }
    
    // 处理Atom格式
    else if (rssData.feed && rssData.feed.entry) {
      let entries = rssData.feed.entry;
      
      if (!Array.isArray(entries)) {
        entries = [entries];
      }
      
      entries = entries.slice(0, maxItems * 2);
      
      for (const entry of entries) {
        if (!entry.title || entry.title === 'No title') {
          continue;
        }
        
        let link = '#';
        if (entry.link) {
          if (typeof entry.link === 'string') {
            link = entry.link;
          } else if (entry.link.$ && entry.link.$.href) {
            link = entry.link.$.href;
          }
        }
        
        const newsItem = {
          id: `${source.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          title: entry.title || 'No title',
          titleCn: '', // 将在翻译后填充
          summary: entry.summary || entry.content || 'No summary available',
          summaryCn: '', // 将在翻译后填充
          journal: source.name,
          journalCn: source.nameCn,
          pubDate: entry.published || entry.updated || new Date().toISOString(),
          url: link,
          type: source.type || 'international',
          language: source.language || 'en'
        };
        
        // 翻译标题和摘要（异步）
        try {
          newsItem.titleCn = await translateToChinese(newsItem.title);
          // 只翻译摘要的前500字符，避免过长
          const summaryToTranslate = newsItem.summary.substring(0, 500);
          newsItem.summaryCn = await translateToChinese(summaryToTranslate);
        } catch (translateError) {
          console.error(`⚠️ Translation failed for: ${newsItem.title}`, translateError.message);
          newsItem.titleCn = newsItem.title; // 翻译失败，使用原文
          newsItem.summaryCn = newsItem.summary;
        }
        
        // 过滤：只保留生物医药相关新闻
        if (isBiomedicalRelated(newsItem)) {
          news.push(newsItem);
        } else {
          console.log(`⚠️ Skipping non-biomedical news: ${newsItem.title}`);
        }
      }
    }
    
    else {
      console.warn(`⚠️ Unknown RSS format for ${source.name}`);
    }
  } catch (error) {
    console.error(`❌ Failed to extract news from ${source.name}:`, error.message);
  }
  
  // 限制条数：只返回前 maxItems 条（已过滤）
  return news.slice(0, maxItems);
}

// 获取所有新闻
async function fetchAllNews() {
  const allNews = [];
  
  // 获取国际来源的新闻
  for (const source of INTERNATIONAL_SOURCES) {
    if (source.verified || source.url) {
      const rssData = await parseRSS(source.url, source.name);
      
      if (rssData) {
        const news = await extractNewsFromRSS(rssData, {
          ...source,
          type: 'international',
          language: 'en'
        });
        allNews.push(...news);
        console.log(`📰 Got ${news.length} biomedical news from ${source.name}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 已注释：国内源不需要（用户同意）
  // for (const source of DOMESTIC_SOURCES) {
  //   ...
  // }
  
  // 如果没有获取到足够的新闻，返回空数组（不再使用备用数据）
  if (allNews.length < 10) {
    console.log(`⚠️ Only got ${allNews.length} biomedical news, which is less than expected. But we will NOT generate fake news.`);
  }
  
  // 去重
  const uniqueNews = [];
  const seenUrls = new Set();
  const seenTitles = new Set();
  
  for (const news of allNews) {
    const urlKey = news.url ? news.url.toLowerCase().trim() : '';
    const titleKey = news.title ? news.title.toLowerCase().trim() : '';
    
    if (!urlKey || urlKey === '#' || urlKey === '') {
      uniqueNews.push(news);
      continue;
    }
    
    if (!seenUrls.has(urlKey) && !seenTitles.has(titleKey)) {
      seenUrls.add(urlKey);
      seenTitles.add(titleKey);
      uniqueNews.push(news);
    } else {
      console.log(`🔄 Skipping duplicate: ${news.title}`);
    }
  }
  
  // 按发布日期排序（最新的在前）
  uniqueNews.sort((a, b) => {
    try {
      return new Date(b.pubDate) - new Date(a.pubDate);
    } catch (e) {
      return 0;
    }
  });
  
  // 返回前20条（或所有）
  const finalNews = uniqueNews.slice(0, 20);
  
  console.log(`✅ Final news count: ${finalNews.length} (after filtering & deduplication)`);
  
  return finalNews;
}

// 注意：已移除 generateFallbackNews() 函数，不再生成虚假新闻

// Netlify Function 主函数
exports.handler = async function(event, context) {
  try {
    console.log('🚀 Starting biomedical news fetch...');
    
    const news = await fetchAllNews();
    
    console.log(`✅ Total news fetched: ${news.length}`);
    
    const internationalCount = news.filter(n => n.type === 'international').length;
    
    console.log(`📊 Statistics: ${internationalCount} international, 0 domestic (domestic sources disabled)`);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=3600'
      },
      body: JSON.stringify({
        success: true,
        count: news.length,
        statistics: {
          international: internationalCount,
          domestic: 0  // 国内源已禁用
        },
        updateTime: new Date().toISOString(),
        news: news
      })
    };
  } catch (error) {
    console.error('❌ Error fetching news:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        news: []
      })
    };
  }
};
