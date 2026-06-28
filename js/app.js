// js/app.js - BioJournal 网站主逻辑

// 全局变量
let currentFilter = 'all';
let isLoading = false;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // 设置日期
    updateDate();
    
    // 加载新闻
    loadNews();
    
    // 绑定筛选按钮事件
    bindFilterEvents();
    
    // 绑定滚动事件
    bindScrollEvent();
    
    // 绑定键盘事件
    bindKeyboardEvents();
}

// 更新日期显示
function updateDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = now.toLocaleDateString('zh-CN', options);
    document.getElementById('currentDate').textContent = dateStr;
}

// 加载新闻
function loadNews() {
    isLoading = true;
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('newsFeed').innerHTML = '';
    document.getElementById('feedEnd').style.display = 'none';
    
    // 模拟加载延迟
    setTimeout(() => {
        displayNews(NEWS_DATA);
        isLoading = false;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('feedEnd').style.display = 'flex';
    }, 800);
}

// 显示新闻
function displayNews(newsList) {
    const feed = document.getElementById('newsFeed');
    feed.innerHTML = '';
    
    // 过滤
    let filtered = newsList;
    if (currentFilter === 'international') {
        filtered = newsList.filter(n => n.isInternational);
    } else if (currentFilter === 'domestic') {
        filtered = newsList.filter(n => !n.isInternational);
    }
    
    // 按日期排序
    filtered.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // 更新计数
    document.getElementById('newsCount').textContent = filtered.length;
    
    // 生成卡片
    filtered.forEach((news, index) => {
        const card = createNewsCard(news, index);
        feed.appendChild(card);
    });
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
        <div class="card-title">${news.titleCn || news.title}</div>
        ${news.titleCn && news.title !== news.titleCn ? `<div class="card-title-en">${news.title}</div>` : ''}
        <div class="card-summary">${news.summaryCn || news.summary}</div>
        <div class="card-tags">
            ${news.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
        <div class="card-footer">
            <span class="read-more">点击查看详情 →</span>
        </div>
    `;
    
    return card;
}

// 打开详情
function openDetail(id) {
    const news = NEWS_DATA.find(n => n.id === id);
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
                <h1 style="font-size: 22px; line-height: 1.5; margin-bottom: 12px; color: #111827;">${news.titleCn || news.title}</h1>
                ${news.titleCn && news.title !== news.titleCn ? `<p style="font-style: italic; color: #6b7280; margin-bottom: 16px; font-size: 14px;">${news.title}</p>` : ''}
                
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
                    ${news.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                
                <div style="background: #f9fafb; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid ${news.journalColor};">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">内容摘要</div>
                    <p style="font-size: 15px; line-height: 1.8; color: #374151;">${news.summaryCn || news.summary}</p>
                </div>
                
                <div style="background: #fefce8; padding: 16px; border-radius: 12px; margin-bottom: 16px; border-left: 4px solid #eab308;">
                    <div style="font-size: 12px; color: #9ca3af; margin-bottom: 4px;">English Summary</div>
                    <p style="font-size: 14px; line-height: 1.8; color: #713f12;">${news.summary}</p>
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
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
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
            // 更新活跃状态
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 更新筛选
            currentFilter = this.dataset.filter;
            loadNews();
        });
    });
}

// 绑定滚动事件
function bindScrollEvent() {
    window.addEventListener('scroll', function() {
        const backToTop = document.getElementById('backToTop');
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    // 回到顶部按钮
    document.getElementById('backToTop').addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// 绑定键盘事件
function bindKeyboardEvents() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // 关闭所有弹窗
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
    document.getElementById('aboutModal').classList.add('active');
}

// 显示期刊来源弹窗
function showSources() {
    document.getElementById('sourcesModal').classList.add('active');
}

// 关闭弹窗
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        // 如果是详情弹窗，延迟移除DOM
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
    
    // 在顶部下拉
    if (scrollTop === 0 && touchY > touchStartY + 50 && !isRefreshing) {
        isRefreshing = true;
        // 显示刷新提示
        showRefreshIndicator();
    }
});

document.addEventListener('touchend', function() {
    if (isRefreshing) {
        isRefreshing = false;
        // 执行刷新
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
    indicator.textContent = '正在刷新...';
    document.body.appendChild(indicator);
}

function refreshNews() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.textContent = '刷新完成！';
        setTimeout(() => {
            indicator.remove();
            loadNews();
        }, 500);
    } else {
        loadNews();
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
