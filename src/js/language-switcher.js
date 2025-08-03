/*
 * =====================================================
 * Vinsert Editor - セレクトボックス形式言語切り替えUI（修正版）
 * =====================================================
 */

import { changeLanguage, getCurrentLanguage, getAvailableLanguages, getLocalesDirectoryPath, getSystemInfo } from './locales.js';

/**
 * セレクトボックス形式の言語切り替えUIを作成
 */
export function createLanguageSwitcher() {
    console.log('🌐 Creating language switcher (select box)...');
    
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
    
    // セレクトボックスを作成
    const languageSelect = document.createElement('select');
    languageSelect.className = 'language-select';
    languageSelect.id = 'language-select';
    languageSelect.title = 'Select Language / 言語選択';
    
    // 利用可能な言語を取得してオプションを作成
    const availableLanguages = getAvailableLanguages();
    const currentLang = getCurrentLanguage();
    
    console.log('🌐 Available languages for selector:', availableLanguages);
    console.log('🎯 Current language:', currentLang);
    
    if (availableLanguages.length === 0) {
        console.warn('⚠️ No languages available for selector, using fallback');
        
        // フォールバック: 最小限のオプション
        const fallbackOptions = [
            { code: 'ja', nativeName: '日本語' },
            { code: 'en', nativeName: 'English' }
        ];
        
        fallbackOptions.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.nativeName} (${lang.code.toUpperCase()})`;
            option.title = lang.nativeName;
            
            if (lang.code === currentLang) {
                option.selected = true;
            }
            
            languageSelect.appendChild(option);
        });
    } else {
        // 各言語のオプションを作成
        availableLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.nativeName} (${lang.code.toUpperCase()})`;
            option.title = `${lang.name} - ${lang.nativeName}`;
            
            // 現在の言語の場合は選択状態にする
            if (lang.code === currentLang) {
                option.selected = true;
            }
            
            languageSelect.appendChild(option);
        });
    }
    
    // デバッグ用: システム情報表示ボタン
    const debugButton = document.createElement('button');
    debugButton.className = 'debug-button';
    debugButton.textContent = '🔍';
    debugButton.title = 'Show system info (Debug)';
    debugButton.style.cssText = `
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 12px;
        margin-left: 4px;
        padding: 2px 4px;
        border-radius: 2px;
        transition: background-color 0.2s;
    `;
    
    debugButton.addEventListener('click', () => {
        const systemInfo = getSystemInfo();
        const localesPath = getLocalesDirectoryPath();
        
        console.log('🔍 System Info:', systemInfo);
        console.log('📁 Locales directory:', localesPath);
        
        const infoText = `Language System Info:
Directory: ${localesPath}
Current: ${systemInfo.currentLanguage}
Available: ${systemInfo.availableLanguages} languages
External System: ${systemInfo.isExternalSystemEnabled ? 'Enabled' : 'Disabled (using fallback)'}
Language Data: ${systemInfo.hasLanguageData ? 'Loaded' : 'Not loaded'}

Languages:
${getAvailableLanguages().map(l => `- ${l.nativeName} (${l.code})`).join('\n')}`;
        
        alert(infoText);
    });
    
    debugButton.addEventListener('mouseenter', () => {
        debugButton.style.backgroundColor = '#37373d';
    });
    
    debugButton.addEventListener('mouseleave', () => {
        debugButton.style.backgroundColor = 'transparent';
    });
    
    // コンテナに追加
    languageSwitcher.appendChild(languageSelect);
    languageSwitcher.appendChild(debugButton);
    
    // メニューバーに追加
    menuBar.appendChild(languageSwitcher);
    
    // イベントリスナーを設定
    setupLanguageSwitcherEvents(languageSelect);
    
    console.log(`✅ Language switcher created with ${availableLanguages.length || 2} languages`);
    console.log('Current language:', currentLang);
}

/**
 * 言語切り替えのイベントリスナーを設定
 */
function setupLanguageSwitcherEvents(languageSelect) {
    languageSelect.addEventListener('change', async (e) => {
        const selectedLang = e.target.value;
        const currentLang = getCurrentLanguage();
        
        console.log(`🌐 Language selection changed: ${currentLang} -> ${selectedLang}`);
        
        // 同じ言語が選択された場合は何もしない
        if (selectedLang === currentLang) {
            console.log(`🌐 Already using language: ${selectedLang}`);
            return;
        }
        
        try {
            // セレクトボックスを一時的に無効化
            languageSelect.disabled = true;
            
            // ローディング表示は短時間のみ
            const originalText = languageSelect.options[languageSelect.selectedIndex].textContent;
            languageSelect.options[languageSelect.selectedIndex].textContent = 'Loading...';
            
            // 言語変更を実行（フォールバックシステムなので即座に完了）
            const success = await changeLanguage(selectedLang);
            
            // ローディング表示を元に戻す
            setTimeout(() => {
                if (success) {
                    // 成功時：UI更新を確実に実行
                    updateLanguageSwitcherState();
                    console.log(`✅ Language switched to: ${selectedLang}`);
                } else {
                    // 失敗時：元の言語に戻す
                    console.error(`❌ Failed to switch to language: ${selectedLang}`);
                    languageSelect.value = currentLang;
                    languageSelect.options[languageSelect.selectedIndex].textContent = originalText;
                }
            }, 100); // 短時間の遅延でローディング効果
            
        } catch (error) {
            console.error('Language switch error:', error);
            
            // エラー時は元の言語に戻す
            languageSelect.value = currentLang;
        } finally {
            // セレクトボックスを再有効化
            setTimeout(() => {
                languageSelect.disabled = false;
            }, 150);
        }
    });
    
    // マウスオーバーでヘルプを表示
    languageSelect.addEventListener('mouseenter', () => {
        const currentLang = getCurrentLanguage();
        const availableLanguages = getAvailableLanguages();
        const currentLangInfo = availableLanguages.find(lang => lang.code === currentLang);
        
        if (currentLangInfo) {
            languageSelect.title = `Current: ${currentLangInfo.nativeName} (${currentLang.toUpperCase()})`;
        } else {
            languageSelect.title = `Current: ${currentLang.toUpperCase()}`;
        }
    });
}

/**
 * 現在の言語状態に基づいてUIを更新
 */
export function updateLanguageSwitcherState() {
    console.log('🔄 Updating language switcher state...');
    
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect) {
        console.warn('⚠️ Language select not found');
        return;
    }
    
    const currentLang = getCurrentLanguage();
    const availableLanguages = getAvailableLanguages();
    
    console.log('🎯 Current language for update:', currentLang);
    console.log('🌐 Available languages for update:', availableLanguages);
    
    // セレクトボックスの選択状態を更新
    languageSelect.value = currentLang;
    
    // オプションのテキストを更新
    for (let i = 0; i < languageSelect.options.length; i++) {
        const option = languageSelect.options[i];
        const lang = availableLanguages.find(l => l.code === option.value);
        
        if (lang) {
            option.textContent = `${lang.nativeName} (${lang.code.toUpperCase()})`;
            option.title = `${lang.name} - ${lang.nativeName}`;
        } else {
            // フォールバック表示
            const langCode = option.value;
            const fallbackNames = { 'ja': '日本語', 'en': 'English' };
            const nativeName = fallbackNames[langCode] || langCode.toUpperCase();
            option.textContent = `${nativeName} (${langCode.toUpperCase()})`;
        }
    }
    
    console.log('✅ Language switcher state updated');
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

/**
 * 言語ファイルを再読み込み（現在はフォールバックシステムのため効果なし）
 */
export async function refreshLanguages() {
    console.log('🔄 Refreshing languages (fallback system)...');
    
    try {
        // フォールバックシステムでは即座に完了
        reinitializeLanguageSwitcher();
        
        // 言語変更イベントを発火してUI全体を更新
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: getCurrentLanguage() }
        }));
        
        console.log('✅ Languages refreshed successfully');
    } catch (error) {
        console.error('❌ Error refreshing languages:', error);
    }
}