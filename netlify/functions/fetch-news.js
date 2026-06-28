// Netlify Function: 从PubMed获取真实生物医药期刊文章
// 文件路径: netlify/functions/fetch-news.js

const https = require('https');

// 期刊列表 - 只使用真实的生物医药期刊
const JOURNALS = [
    { id: 'nejm', name: 'New England Journal of Medicine', short: 'NEJM', color: '#2563eb', query: '"N Engl J Med"[Journal]' },
    { id: 'lancet', name: 'The Lancet', short: 'Lancet', color: '#7c3aed', query: '"Lancet"[Journal]' },
    { id: 'jama', name: 'JAMA', short: 'JAMA', color: '#dc2626', query: '"JAMA"[Journal]' },
    { id: 'nat_med', name: 'Nature Medicine', short: 'Nat Med', color: '#059669', query: '"Nat Med"[Journal]' },
    { id: 'cell', name: 'Cell', short: 'Cell', color: '#ea580c', query: '"Cell"[Journal]' },
    { id: 'nat_biotech', name: 'Nature Biotechnology', short: 'Nat Biotechnol', color: '#0891b2', query: '"Nat Biotechnol"[Journal]' },
    { id: 'nat_genet', name: 'Nature Genetics', short: 'Nat Genet', color: '#65a30d', query: '"Nat Genet"[Journal]' },
    { id: 'bmj', name: 'BMJ', short: 'BMJ', color: '#ca8a04', query: '"BMJ"[Journal]' },
    { id: 'pnas', name: 'PNAS', short: 'PNAS', color: '#0d9488', query: '"PNAS"[Journal]' },
    { id: 'science', name: 'Science', short: 'Science', color: '#4f46e5', query: '"Science"[Journal]' }
];

// 使用Promise封装https请求
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

// 从PubMed搜索文章
async function searchPubMed(journalQuery, retmax = 3) {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(journalQuery)}&retmax=${retmax}&sort=date&sort_order=descending`;
    
    try {
        const searchData = await httpsGet(searchUrl);
        const ids = [];
        const idRegex = /<Id>(\d+)<\/Id>/g;
        let match;
        while ((match = idRegex.exec(searchData)) !== null) {
            ids.push(match[1]);
        }
        return ids;
    } catch (error) {
        console.error(`Search error for ${journalQuery}:`, error.message);
        return [];
    }
}

// 从PubMed获取文章详情
async function fetchArticleDetails(pmid) {
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml`;
    
    try {
        const xmlData = await httpsGet(fetchUrl);
        
        // 解析标题
        const titleMatch = xmlData.match(/<ArticleTitle>(.*?)<\/ArticleTitle>/);
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : 'No title';
        
        // 解析期刊
        const journalMatch = xmlData.match(/<Title>(.*?)<\/Title>/);
        const journal = journalMatch ? journalMatch[1] : 'Unknown Journal';
        
        // 解析发表日期
        const pubDateMatch = xmlData.match(/<PubDate>[\s\S]*?<Year>(\d+)<\/Year>[\s\S]*?<Month>(\w+)<\/Month>[\s\S]*?<\/PubDate>/);
        let pubDate = new Date().toISOString().split('T')[0];
        if (pubDateMatch) {
            const year = pubDateMatch[1];
            const month = pubDateMatch[2];
            // 将月份缩写转换为数字
            const monthMap = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
                              'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };
            const monthNum = monthMap[month] || '01';
            pubDate = `${year}-${monthNum}-01`;
        }
        
        // 解析摘要
        const abstractMatch = xmlData.match(/<AbstractText>(.*?)<\/AbstractText>/);
        const summary = abstractMatch ? abstractMatch[1].replace(/<[^>]+>/g, '').substring(0, 300) : '';
        
        // 解析DOI
        const doiMatch = xmlData.match(/<ELocationID EIdType="doi"[^>]*>(.*?)<\/ELocationID>/);
        const doi = doiMatch ? doiMatch[1] : '';
        const url = doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
        
        return {
            pmid: pmid,
            title: title,
            journal: journal,
            pubDate: pubDate,
            summary: summary,
            url: url
        };
    } catch (error) {
        console.error(`Fetch error for PMID ${pmid}:`, error.message);
        return null;
    }
}

// 主函数
exports.handler = async function(event, context) {
    const allNews = [];
    const errors = [];
    
    console.log('开始从PubMed获取真实生物医药期刊文章...');
    
    // 获取国际期刊文章（70%）
    for (const journal of JOURNALS) {
        try {
            console.log(`正在获取 ${journal.name} 的文章...`);
            
            // 搜索该期刊的最新文章
            const pmids = await searchPubMed(journal.query, 3);
            
            if (pmids.length === 0) {
                console.warn(`未找到 ${journal.name} 的文章`);
                continue;
            }
            
            // 获取每篇文章的详情
            for (const pmid of pmids) {
                const article = await fetchArticleDetails(pmid);
                
                if (article) {
                    // 找到对应的期刊配置
                    const journalConfig = JOURNALS.find(j => j.query === journal.query) || journal;
                    
                    allNews.push({
                        id: `pubmed_${pmid}`,
                        journalId: journal.id,
                        journalName: journal.name,
                        journalShort: journal.short,
                        isInternational: true, // 这些都是国际期刊
                        journalColor: journal.color,
                        title: article.title,
                        titleCn: '', // 暂未翻译
                        summary: article.summary || '点击查看文章详情',
                        summaryCn: '',
                        pubDate: article.pubDate,
                        url: article.url,
                        tags: extractTags(article.title + ' ' + article.summary),
                        source: 'PubMed',
                        pmid: pmid
                    });
                }
                
                // 避免请求过快
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            console.log(`✓ ${journal.name}: 获取到 ${pmids.length} 篇文章`);
            
        } catch (error) {
            console.error(`✗ ${journal.name}: ${error.message}`);
            errors.push({ journal: journal.name, error: error.message });
        }
    }
    
    // 按日期排序
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    console.log(`总共获取到 ${allNews.length} 篇真实文章`);
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: true,
            count: allNews.length,
            news: allNews,
            errors: errors,
            timestamp: new Date().toISOString(),
            note: '所有文章均从PubMed获取，均为真实发表的生物医药研究'
        })
    };
};

// 从标题和摘要中提取标签
function extractTags(text) {
    const tags = [];
    const keywords = {
        'cancer': 'Cancer',
        'tumor': 'Tumor',
        'immune': 'Immunology',
        'vaccine': 'Vaccine',
        'gene': 'Genetics',
        'CRISPR': 'CRISPR',
        'protein': 'Protein',
        'cell': 'Cell Biology',
        'clinical trial': 'Clinical Trial',
        'drug': 'Drug Discovery',
        'therapeutic': 'Therapeutics',
        'diagnosis': 'Diagnostics',
        'biomarker': 'Biomarker',
        'antibody': 'Antibody',
        'COVID': 'COVID-19',
        'Alzheimer': 'Alzheimer',
        'Parkinson': 'Parkinson',
        'diabetes': 'Diabetes',
        'obesity': 'Obesity',
        'cardiovascular': 'Cardiovascular',
        'infection': 'Infectious Disease',
        'virus': 'Virology',
        'bacteria': 'Bacteriology',
        'fungal': 'Mycology'
    };
    
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(keywords)) {
        if (lowerText.includes(key.toLowerCase()) && !tags.includes(value)) {
            tags.push(value);
        }
    }
    
    return tags.length > 0 ? tags : ['Research'];
}
