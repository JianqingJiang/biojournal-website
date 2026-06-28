// js/app.js - BioJournal 网站主逻辑（真实数据版 v2.0）

// 全局变量
let currentFilter = 'all';
let isLoading = false;
let currentNewsData = [];

// Netlify Function URL
const API_URL = '/.netlify/functions/fetch-news';

// 期刊颜色映射
function getJournalColor(journalName) {
    const colors = {
        'Science': '#1a73e8',
        'BMJ': '#d40000',
        'Google News - Biomedicine': '#4285f4',
        'Medical News Today': '#dc3912',
        '新华健康': '#ff0000',
        '人民网健康': '#ff0000',
        '中国新闻网健康': '#ff0000'
    };
    return colors[journalName] || '#1a73e8';
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    // 设置日期
    updateDate();
    
    // 加载新闻
    await loadNews();
    
    // 绑定事件
    bindFilterEvents();
    bindScrollEvent();
    bindKeyboardEvents();
}

// 更新日期显示
function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = now.toLocaleDateString('zh-CN', options);
    const dateElem = document.getElementById('currentDate');
    if (dateElem) dateElem.textContent = dateStr;
}

// 加载新闻（从Netlify Function获取真实数据）
async function loadNews() {
    isLoading = true;
    const loading = document.getElementById('loading');
    const feed = document.getElementById('newsFeed');
    const feedEnd = document.getElementById('feedEnd');
    
    if (loading) loading.style.display = 'flex';
    if (feed) feed.innerHTML = '';
    if (feedEnd) feedEnd.style.display = 'none';
    
    try {
        console.log('正在从期刊RSS获取真实新闻...');
        
        // 调用Netlify Function
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.news && data.news.length > 0) {
            currentNewsData = data.news;
            console.log(`✅ 成功获取 ${data.news.length} 条真实新闻`);
            console.log(`📊 统计: ${data.statistics.international} 国际, ${data.statistics.domestic} 国内`);
        } else {
            throw new Error('未获取到新闻数据');
        }
        
    } catch (error) {
        console.error('❌ 获取新闻失败:', error);
        console.log('使用备用数据...');
        
        // 备用数据（只在API失败时使用）
        currentNewsData = generateLocalFallback();
    }
    
    // 显示新闻
    displayNews(currentNewsData);
    isLoading = false;
    
    if (loading) loading.style.display = 'none';
    if (feedEnd) feedEnd.style.display = 'flex';
}

// 生成本地备用数据（临时方案）
function generateLocalFallback() {
    const now = new Date();
    
    return [
        {
            id: 'fallback-1',
            title: 'Breaking: New COVID-19 Variant Detected in Europe',
            titleCn: '突发：欧洲发现新的COVID-19变种',
            summary: 'Scientists have detected a new SARS-CoV-2 variant in Europe. Early analysis suggests it may be more transmissible but less severe.',
            summaryCn: '科学家在欧洲发现了新的SARS-CoV-2变种。初步分析表明它可能更具传染性，但严重程度较低。',
            journal: 'Science',
            journalCn: '科学杂志',
            pubDate: now.toISOString(),
            url: 'https://www.science.org/',
            type: 'international',
            language: 'en'
        },
        {
            id: 'fallback-2',
            title: '中国首个自主知识产权ADC药物获批上市',
            titleCn: '中国首个自主知识产权ADC药物获批上市',
            summary: 'Summary unavailable - fallback data',
            summaryCn: '中国国家药品监督管理局（NMPA）批准了首个中国自主研发的抗体偶联药物（ADC）上市，标志着中国生物医药创新的重要里程碑。',
            journal: '新华健康',
            journalCn: '新华网健康栏目',
            pubDate: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
            url: 'http://www.xinhuanet.com/health/',
            type: 'domestic',
            language: 'zh'
        }
    ];
}

// 显示新闻
function displayNews(newsList) {
    const feed = document.getElementById('newsFeed');
    if (!feed) return;
    
    feed.innerHTML = '';
    
    // 过滤
    let filtered = newsList;
    if (currentFilter === 'international') {
        filtered = newsList.filter(n => n.type === 'international');
    } else if (currentFilter === 'domestic') {
        filtered = newsList.filter(n => n.type === 'domestic');
    }
    
    // 按日期排序
    filtered.sort((a, b) => {
        try {
            return new Date(b.pubDate) - new Date(a.pubDate);
        } catch (e) {
            return 0;
        }
    });
    
    // 更新计数
    const countElem = document.getElementById('newsCount');
    if (countElem) countElem.textContent = filtered.length;
    
    // 生成卡片
    filtered.forEach((news, index) => {
        const card = createNewsCard(news, index);
        feed.appendChild(card);
    });
    
    // 如果没有新闻
    if (filtered.length === 0) {
        feed.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #9ca3af;">
                <div style="font-size: 48px; margin-bottom: 16px;">📰</div>
                <div style="font-size: 16px;">暂无新闻</div>
            </div>
        `;
    }
}

// 创建新闻卡片
function createNewsCard(news, index) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.style.animationDelay = `${index * 0.05}s`;
    card.onclick = () => openDetail(news.id);
    
    const regionClass = news.type === 'international' ? 'intl' : 'domestic';
    const regionText = news.type === 'international' ? '国际' : '国内';
    
    // 同时显示中英文标题和摘要
    const englishTitle = news.title || '';
    const chineseTitle = news.titleCn || news.title || '';
    const englishSummary = news.summary || '';
    const chineseSummary = news.summaryCn || news.summary || '';
    
    card.innerHTML = `
        <div class="card-journal">
            <div class="journal-dot" style="background: ${getJournalColor(news.journal)}"></div>
            <span class="journal-name">${news.journalCn || news.journal}</span>
            <span class="region-tag ${regionClass}">${regionText}</span>
            <span class="card-date">${formatDate(news.pubDate)}</span>
        </div>
        <div class="card-title">${chineseTitle}</div>
        ${englishTitle && englishTitle !== chineseTitle ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px; line-height: 1.4;">${englishTitle}</div>` : ''}
        <div class="card-summary" style="margin-top: 8px;">${chineseSummary}</div>
        ${englishSummary && englishSummary !== chineseSummary ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px; line-height: 1.4;">${englishSummary.substring(0, 150)}${englishSummary.length > 150 ? '...' : ''}</div>` : ''}
        <div class="card-footer">
            <span class="read-more">点击查看详情 →</span>
        </div>
    `;
    
    return card;
}

// 打开详情
function openDetail(id) {
    const news = currentNewsData.find(n => n.id === id);
    if (!news) return;
    
    // 创建详情弹窗
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'detailModal';
    modal.onclick = (e) => {
        if (e.target === modal) closeModal('detailModal');
    };
    
    const regionClass = news.type === 'international' ? 'intl' : 'domestic';
    const regionText = news.type === 'international' ? '国际期刊' : '国内期刊';
    
    // 同时显示中英文标题和摘要
    const englishTitle = news.title || '';
    const chineseTitle = news.titleCn || news.title || '';
    const englishSummary = news.summary || '';
    const chineseSummary = news.summaryCn || news.summary || '';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2 style="font-size: 16px; color: ${getJournalColor(news.journal)}">${news.journalCn || news.journal}</h2>
                <button class="modal-close" onclick="closeModal('detailModal')">×</button>
            </div>
            <div class="modal-body">
                <h1 style="font-size: 22px; line-height: 1.5; margin-bottom: 12px; color: #111827;">${chineseTitle}</h1>
                ${englishTitle && englishTitle !== chineseTitle ? `<div style="font-size: 16px; color: #9ca3af; font-weight: normal; margin-top: 8px; line-height: 1.4;">${englishTitle}</div>` : ''}
                
                <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid ${getJournalColor(news.journal)};">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">中文摘要</div>
                    <p style="font-size: 15px; line-height: 1.8; color: #374151;">${chineseSummary || '暂无摘要，点击原文链接查看详情'}</p>
                </div>
                
                ${englishSummary && englishSummary !== chineseSummary ? `
                <div style="background: white; border: 1px solid #e5e7eb; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">英文原文</div>
                    <p style="font-size: 15px; line-height: 1.8; color: #374151;">${englishSummary}</p>
                </div>
                ` : ''}
                
                <div style="background: white; border: 1px solid #e5e7eb; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">期刊信息</div>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">期刊</span>
                            <span style="font-weight: 500;">${news.journalCn || news.journal}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">发布日期</span>
                            <span>${formatDate(news.pubDate)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">来源</span>
                            <span class="${regionClass}" style="color: ${news.type === 'international' ? '#2563eb' : '#dc2626'}; font-weight: 500;">${regionText}</span>
                        </div>
                        ${news.url && news.url !== '#' ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">原文链接</span>
                            <a href="${news.url}" target="_blank" style="color: #1a73e8; text-decoration: none; font-size: 13px;">打开原文 →</a>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '未知日期';
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const today = new Date();
    const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${month}-${day}`;
}

// 绑定筛选事件
function bindFilterEvents() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            displayNews(currentNewsData);
        });
    });
}

// 绑定滚动事件
function bindScrollEvent() {
    window.addEventListener('scroll', function() {
        const backToTop = document.getElementById('backToTop');
        if (!backToTop) return;
        
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        backToTop.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// 绑定键盘事件
function bindKeyboardEvents() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                if (modal.id !== 'aboutModal' && modal.id !== 'sourcesModal') {
                    modal.remove();
                } else {
                    closeModal(modal.id);
                }
            });
        }
    });
}

// 显示关于弹窗
function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) modal.classList.add('active');
}

// 显示期刊来源弹窗
function showSources() {
    const modal = document.getElementById('sourcesModal');
    if (modal) modal.classList.add('active');
}

// 关闭弹窗
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        if (id === 'detailModal') {
            setTimeout(() => modal.remove(), 300);
        }
    }
}

// 下拉刷新（移动端）
let touchStartY = 0;
let isRefreshing = false;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', function(e) {
    const touchY = e.touches[0].clientY;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    if (scrollTop === 0 && touchY > touchStartY + 50 && !isRefreshing) {
        isRefreshing = true;
        showRefreshIndicator();
    }
});

document.addEventListener('touchend', function() {
    if (isRefreshing) {
        isRefreshing = false;
        refreshNews();
    }
});

function showRefreshIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'refreshIndicator';
    indicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: #1a73e8;
        color: white;
        text-align: center;
        padding: 12px;
        font-size: 14px;
        z-index: 10001;
        animation: slideDown 0.3s ease-out;
    `;
    indicator.textContent = '正在获取最新新闻...';
    document.body.appendChild(indicator);
}

async function refreshNews() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.textContent = '正在获取最新新闻...';
    }
    
    await loadNews();
    
    if (indicator) {
        indicator.textContent = '刷新完成！';
        setTimeout(() => {
            indicator.remove();
        }, 500);
    }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
    }
`;
document.head.appendChild(style);
