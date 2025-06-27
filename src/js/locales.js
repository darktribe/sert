/*
 * =====================================================
 * Sert Editor - 多言語化システム
 * =====================================================
 */

// 現在の言語設定
let currentLanguage = 'ja';
let languageData = {};

/**
 * 言語ファイルを読み込む
 * @param {string} language - 言語コード（例: 'ja', 'en', 'fr'）
 */
export async function loadLanguage(language = 'ja') {
    try {
        console.log(`🌐 Loading language: ${language}`);
        
        // 言語ファイルのパスを構築
        const languageFile = `./locales/${language}.json`;
        
        // fetch APIを使用して言語ファイルを読み込み
        const response = await fetch(languageFile);
        
        if (!response.ok) {
            throw new Error(`Language file not found: ${languageFile}`);
        }
        
        languageData = await response.json();
        currentLanguage = language;
        
        console.log(`✅ Language loaded successfully: ${language}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to load language ${language}:`, error);
        
        // フォールバック: デフォルト言語（日本語）を読み込み
        if (language !== 'ja') {
            console.log('🔄 Falling back to Japanese...');
            return await loadLanguage('ja');
        }
        
        // 日本語も読み込めない場合はエラー
        console.error('❌ Critical: Could not load any language file');
        return false;
    }
}

/**
 * キーに基づいて文字列を取得する
 * @param {string} key - ドット記法のキー（例: 'menu.file', 'dialogs.newFile.title'）
 * @param {Object} params - 置換パラメータ（例: {count: 5, filename: 'test.txt'}）
 * @returns {string} - 対応する文字列
 */
export function t(key, params = {}) {
    try {
        // キーをドット記法で分割
        const keys = key.split('.');
        let value = languageData;
        
        // ネストされたオブジェクトを辿る
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                throw new Error(`Key not found: ${key}`);
            }
        }
        
        // 文字列でない場合はエラー
        if (typeof value !== 'string') {
            throw new Error(`Value is not a string: ${key}`);
        }
        
        // パラメータを置換
        let result = value;
        for (const [paramKey, paramValue] of Object.entries(params)) {
            const placeholder = `{${paramKey}}`;
            result = result.replace(new RegExp(placeholder, 'g'), paramValue);
        }
        
        return result;
    } catch (error) {
        console.warn(`⚠️ Translation key not found: ${key}`);
        
        // フォールバック: キーをそのまま返す
        return key;
    }
}

/**
 * 現在の言語を取得
 * @returns {string} - 現在の言語コード
 */
export function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * 利用可能な言語一覧を取得
 * @returns {Array} - 利用可能な言語のリスト
 */
export function getAvailableLanguages() {
    return [
        { code: 'ja', name: '日本語' },
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'Français' }
    ];
}

/**
 * ブラウザの言語設定を取得
 * @returns {string} - ブラウザの言語コード
 */
export function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.substring(0, 2).toLowerCase();
    
    // サポートされている言語かチェック
    const supportedLanguages = getAvailableLanguages().map(lang => lang.code);
    
    if (supportedLanguages.includes(langCode)) {
        return langCode;
    }
    
    // デフォルトは日本語
    return 'ja';
}

/**
 * ローカルストレージから言語設定を読み込み
 * @returns {string} - 保存された言語コード
 */
export function loadLanguageFromStorage() {
    try {
        const savedLanguage = localStorage.getItem('sert-language');
        if (savedLanguage) {
            const supportedLanguages = getAvailableLanguages().map(lang => lang.code);
            if (supportedLanguages.includes(savedLanguage)) {
                return savedLanguage;
            }
        }
    } catch (error) {
        console.warn('⚠️ Could not load language from localStorage:', error);
    }
    
    // フォールバック: ブラウザ言語を検出
    return detectBrowserLanguage();
}

/**
 * 言語設定をローカルストレージに保存
 * @param {string} language - 言語コード
 */
export function saveLanguageToStorage(language) {
    try {
        localStorage.setItem('sert-language', language);
        console.log(`💾 Language saved to storage: ${language}`);
    } catch (error) {
        console.warn('⚠️ Could not save language to localStorage:', error);
    }
}

/**
 * 言語を変更してUIを更新
 * @param {string} language - 新しい言語コード
 */
export async function changeLanguage(language) {
    const success = await loadLanguage(language);
    
    if (success) {
        saveLanguageToStorage(language);
        
        // UI更新イベントを発火
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: language }
        }));
        
        console.log(`🌐 Language changed to: ${language}`);
        return true;
    }
    
    return false;
}

/**
 * 多言語化システムを初期化
 */
export async function initializeI18n() {
    console.log('🌐 Initializing i18n system...');
    
    // 保存された言語設定を読み込み
    const preferredLanguage = loadLanguageFromStorage();
    
    // 言語ファイルを読み込み
    const success = await loadLanguage(preferredLanguage);
    
    if (success) {
        console.log(`✅ I18n system initialized with language: ${currentLanguage}`);
    } else {
        console.error('❌ Failed to initialize i18n system');
    }
    
    return success;
}

/**
 * HTMLの属性やテキストコンテンツを更新するヘルパー関数
 * @param {string} selector - CSSセレクター
 * @param {string} key - 翻訳キー
 * @param {string} attribute - 更新する属性名（省略時はtextContent）
 * @param {Object} params - 置換パラメータ
 */
export function updateElementText(selector, key, attribute = null, params = {}) {
    const element = document.querySelector(selector);
    if (element) {
        const text = t(key, params);
        if (attribute) {
            element.setAttribute(attribute, text);
        } else {
            element.textContent = text;
        }
    }
}

/**
 * 複数の要素を一括更新するヘルパー関数
 * @param {Array} updates - 更新定義の配列
 */
export function updateMultipleElements(updates) {
    updates.forEach(update => {
        const { selector, key, attribute, params } = update;
        updateElementText(selector, key, attribute, params);
    });
}