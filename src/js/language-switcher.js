/*
 * =====================================================
 * Vinsert Editor - 言語切り替えUI実装
 * =====================================================
 */

import { changeLanguage, getCurrentLanguage, getAvailableLanguages } from './locales.js';

/**
 * 言語切り替えUIを作成してメニューバーに追加
 */
export function createLanguageSwitcher() {
    console.log('🌐 Creating language switcher...');
    
    const menuBar = document.querySelector('.menu-bar');
    if (!menuBar) {
        console.error('Menu bar not found');
        return;
    }
    
    // 既存の言語切り替えがあれば削除
    const existingSwitcher = document.getElementById('language-switcher');
    if (existingSwitcher) {
        existingSwitcher.remove();
    }
    
    // 言語切り替えコンテナを作成
    const languageSwitcher = document.createElement('div');
    languageSwitcher.className = 'language-switcher';
    languageSwitcher.id = 'language-switcher';
    
    // 利用可能な言語を取得
    const availableLanguages = getAvailableLanguages();
    const currentLang = getCurrentLanguage();
    
    // 各言語のボタンを作成
    availableLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.className = 'language-btn';
        button.setAttribute('data-lang', lang.code);
        button.textContent = lang.code.toUpperCase();
        button.title = lang.name;
        
        // 現在の言語の場合はactiveクラスを追加
        if (lang.code === currentLang) {
            button.classList.add('active');
        }
        
        languageSwitcher.appendChild(button);
    });
    
    // メニューバーに追加
    menuBar.appendChild(languageSwitcher);
    
    // イベントリスナーを設定
    setupLanguageSwitcherEvents(languageSwitcher);
    
    console.log('✅ Language switcher created with current language:', currentLang);
}

/**
 * 言語切り替えのイベントリスナーを設定
 */
function setupLanguageSwitcherEvents(languageSwitcher) {
    languageSwitcher.addEventListener('click', async (e) => {
        if (e.target.classList.contains('language-btn')) {
            const selectedLang = e.target.getAttribute('data-lang');
            const currentLang = getCurrentLanguage();
            
            // 同じ言語が選択された場合は何もしない
            if (selectedLang === currentLang) {
                console.log(`🌐 Already using language: ${selectedLang}`);
                return;
            }
            
            console.log(`🌐 Switching from ${currentLang} to ${selectedLang}`);
            
            try {
                // ボタンを一時的に無効化
                const allButtons = languageSwitcher.querySelectorAll('.language-btn');
                allButtons.forEach(btn => btn.disabled = true);
                
                // 言語変更を実行
                const success = await changeLanguage(selectedLang);
                
                if (success) {
                    // UI更新
                    updateLanguageSwitcherUI(selectedLang);
                    console.log(`✅ Language switched to: ${selectedLang}`);
                } else {
                    console.error(`❌ Failed to switch to language: ${selectedLang}`);
                }
                
                // ボタンを再有効化
                allButtons.forEach(btn => btn.disabled = false);
                
            } catch (error) {
                console.error('Language switch error:', error);
                
                // エラー時もボタンを再有効化
                const allButtons = languageSwitcher.querySelectorAll('.language-btn');
                allButtons.forEach(btn => btn.disabled = false);
            }
        }
    });
}

/**
 * 言語切り替えUIの状態を更新
 */
function updateLanguageSwitcherUI(activeLang) {
    const languageButtons = document.querySelectorAll('.language-btn');
    
    languageButtons.forEach(button => {
        const buttonLang = button.getAttribute('data-lang');
        
        if (buttonLang === activeLang) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * 現在の言語状態に基づいてUIを更新
 */
export function updateLanguageSwitcherState() {
    const currentLang = getCurrentLanguage();
    updateLanguageSwitcherUI(currentLang);
}

/**
 * 言語切り替えUIを削除
 */
export function removeLanguageSwitcher() {
    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher) {
        languageSwitcher.remove();
        console.log('🗑️ Language switcher removed');
    }
}

/**
 * 言語切り替えUIを再初期化
 */
export function reinitializeLanguageSwitcher() {
    console.log('🔄 Reinitializing language switcher...');
    removeLanguageSwitcher();
    
    // DOM更新を待ってから再作成
    setTimeout(() => {
        createLanguageSwitcher();
    }, 100);
}