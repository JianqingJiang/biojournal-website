// js/app.js - BioJournal 网站主逻辑（真实数据版）

// 全局变量
let currentFilter = 'all';
let isLoading = false;
let currentNewsData = [];

// Netlify Function URL（部署后自动生效）
const API_URL = '/.netlify/functions/fetch-news';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

async function initApp() {
    // 设置日期
    updateDate();
    
    // 加载新闻（从PubMed获取真实数据）
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
        console.log('正在从PubMed获取真实生物医药期刊文章...');
        
        // 调用Netlify Function
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.news && data.news.length > 0) {
            currentNewsData = data.news;
            console.log(`成功获取 ${data.news.length} 篇真实文章`);
            console.log('数据来源：', data.note);
        } else {
            throw new Error('未获取到新闻数据');
        }
        
    } catch (error) {
        console.error('获取新闻失败:', error);
        console.log('使用备用数据...');
        
        // 备用数据（只在API失败时使用，且必须是真实数据）
        currentNewsData = FALLBACK_NEWS;
    }
    
    // 显示新闻
    displayNews(currentNewsData);
    isLoading = false;
    
    if (loading) loading.style.display = 'none';
    if (feedEnd) feedEnd.style.display = 'flex';
}

// 显示新闻
function displayNews(newsList) {
    const feed = document.getElementById('newsFeed');
    if (!feed) return;
    
    feed.innerHTML = '';
    
    // 过滤
    let filtered = newsList;
    if (currentFilter === 'international') {
        filtered = newsList.filter(n => n.isInternational);
    } else if (currentFilter === 'domestic') {
        filtered = newsList.filter(n => !n.isInternational);
    }
    
    // 按日期排序
    filtered.sort((a, b) => {
        const dateA = new Date(a.pubDate);
        const dateB = new Date(b.pubDate);
        return dateB - dateA;
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
    
    const regionClass = news.isInternational ? 'intl' : 'domestic';
    const regionText = news.isInternational ? '国际' : '国内';
    
    card.innerHTML = `
        <div class="card-journal">
            <div class="journal-dot" style="background: ${news.journalColor}"></div>
            <span class="journal-name">${news.journalShort}</span>
            <span class="region-tag ${regionClass}">${regionText}</span>
            <span class="card-date">${formatDate(news.pubDate)}</span>
        </div>
        <div class="card-title">${news.title}</div>
        <div class="card-summary">${news.summary || '点击查看详情'}</div>
        <div class="card-tags">
            ${(news.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
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
    
    const regionClass = news.isInternational ? 'intl' : 'domestic';
    const regionText = news.isInternational ? '国际期刊' : '国内期刊';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2 style="font-size: 16px; color: ${news.journalColor}">${news.journalShort}</h2>
                <button class="modal-close" onclick="closeModal('detailModal')">×</button>
            </div>
            <div class="modal-body">
                <h1 style="font-size: 22px; line-height: 1.5; margin-bottom: 12px; color: #111827;">${news.title}</h1>
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
                    ${(news.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                
                <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid ${news.journalColor};">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">内容摘要</div>
                    <p style="font-size: 15px; line-height: 1.8; color: #374151;">${news.summary || '暂无摘要，点击原文链接查看详情'}</p>
                </div>
                
                <div style="background: white; border: 1px solid #e5e7eb; padding: 16px; border-radius: 12px;">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">期刊信息</div>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">期刊</span>
                            <span style="font-weight: 500;">${news.journalName} (${news.journalShort})</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">发布日期</span>
                            <span>${news.pubDate}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">来源</span>
                            <span class="${regionClass}" style="color: ${news.isInternational ? '#2563eb' : '#dc2626'}; font-weight: 500;">${regionText}</span>
                        </div>
                        ${news.url ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">原文链接</span>
                            <a href="${news.url}" target="_blank" style="color: #1a73e8; text-decoration: none; font-size: 13px;">打开原文 →</a>
                        </div>
                        ` : ''}
                        ${news.pmid ? `
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #6b7280;">PubMed ID</span>
                            <a href="https://pubmed.ncbi.nlm.nih.gov/${news.pmid}/" target="_blank" style="color: #1a73e8; text-decoration: none; font-size: 13px;">${news.pmid}</a>
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

// 备用数据（只在API失败时使用，且必须是真实数据）
const FALLBACK_NEWS = [
    {
        id: 'pubmed_42341323',
        journalId: 'nejm',
        journalName: 'New England Journal of Medicine',
        journalShort: 'NEJM',
        isInternational: true,
        journalColor: '#2563eb',
        title: 'Clinical Characteristics of Patients Infected with Bundibugyo Virus, DRC 2026',
        titleCn: '2026年刚果民主共和国Bundibugyo病毒感染患者的临床特征',
        summary: 'Bundibugyo virus, a filovirus, is currently spreading in the Democratic Republic of Congo. This report presents early data on symptoms and illness severity as well as diagnostic challenges.',
        summaryCn: 'Bundibugyo病毒是一种丝状病毒，目前正在刚果民主共和国传播。本报告提供了关于症状、疾病严重程度以及诊断挑战的早期数据。',
        pubDate: '2026-06-24',
        url: 'https://doi.org/10.1056/NEJMc2608070',
        tags: ['Virology', 'Infectious Disease', 'Outbreak'],
        source: 'PubMed',
        pmid: '42341323'
    }
];

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
    indicator.textContent = '正在从PubMed获取最新文章...';
    document.body.appendChild(indicator);
}

async function refreshNews() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.textContent = '正在获取最新文章...';
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
