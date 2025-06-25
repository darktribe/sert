/*
 * =====================================================
 * Sert Editor - メインエントリーポイント
 * アプリケーションの初期化を行う
 * =====================================================
 */

import { initializeApp } from './core/app.js';

/**
 * ページ読み込み時の初期化処理
 */
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 Sert Editor starting up...');
    await initializeApp();
});