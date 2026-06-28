// js/data.js - BioJournal 新闻数据配置
// 注意：不再使用虚假数据，所有数据从PubMed API获取

// 期刊配置 - 只使用真实的生物医药期刊
const JOURNALS = {
    international: [
        { id: 'nejm', name: 'New England Journal of Medicine', short: 'NEJM', color: '#2563eb' },
        { id: 'lancet', name: 'The Lancet', short: 'Lancet', color: '#7c3aed' },
        { id: 'jama', name: 'JAMA', short: 'JAMA', color: '#dc2626' },
        { id: 'nature_med', name: 'Nature Medicine', short: 'Nat Med', color: '#059669' },
        { id: 'cell', name: 'Cell', short: 'Cell', color: '#ea580c' },
        { id: 'science', name: 'Science', short: 'Science', color: '#4f46e5' },
        { id: 'nat_biotech', name: 'Nature Biotechnology', short: 'Nat Biotechnol', color: '#0891b2' },
        { id: 'nat_genet', name: 'Nature Genetics', short: 'Nat Genet', color: '#65a30d' },
        { id: 'bmj', name: 'BMJ', short: 'BMJ', color: '#ca8a04' },
        { id: 'pnas', name: 'PNAS', short: 'PNAS', color: '#0d9488' }
    ],
    domestic: [
        { id: 'cmj', name: 'Chinese Medical Journal', short: 'CMJ', color: '#b91c1c' },
        { id: 'zhyx', name: '中华医学杂志', short: '中华医学', color: '#dc2626' },
        { id: 'zgsci', name: '中国科学: 生命科学', short: '中国科学', color: '#1d4ed8' }
    ]
};

// PubMed API配置
const PUBMED_CONFIG = {
    baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
    journals: {
        nejm: '"N Engl J Med"[Journal]',
        lancet: '"Lancet"[Journal]',
        jama: '"JAMA"[Journal]',
        nature_med: '"Nat Med"[Journal]',
        cell: '"Cell"[Journal]',
        science: '"Science"[Journal]',
        nat_biotech: '"Nat Biotechnol"[Journal]',
        nat_genet: '"Nat Genet"[Journal]',
        bmj: '"BMJ"[Journal]',
        pnas: '"PNAS"[Journal]'
    }
};

// 导出
window.JOURNALS = JOURNALS;
window.PUBMED_CONFIG = PUBMED_CONFIG;
