/*
 * =====================================================
 * Vinsert Editor - 多言語化システム（確実なフォールバック版）
 * =====================================================
 */

// 現在の言語設定
let currentLanguage = 'ja';
let languageData = {};
let availableLanguages = [];
let localesDirectory = null;
let isExternalSystemEnabled = false;

// ハードコードされた完全な言語データ（フォールバック用）
const FALLBACK_LANGUAGES = {
    ja: {
        _meta: { code: 'ja', name: '日本語', nativeName: '日本語', version: '1.0.0' },
        menu: {
            file: 'ファイル',
            edit: '編集', 
            view: '表示',
            search: '検索'
        },
        fileMenu: {
            new: '新規作成',
            open: '開く',
            save: '上書き保存',
            saveAs: '名前をつけて保存',
            exit: '終了'
        },
        editMenu: {
            undo: '元に戻す',
            redo: 'やりなおし',
            cut: '切り取り',
            copy: 'コピー',
            paste: '貼り付け',
            selectAll: 'すべて選択'
        },
        viewMenu: {
            fontSettings: 'フォント設定',
            fontSizeInput: 'フォントサイズ指定',
            increaseFontSize: 'フォントサイズを大きく',
            decreaseFontSize: 'フォントサイズを小さく',
            lineHighlight: '行ハイライト',
            typewriterMode: 'タイプライターモード'
        },
        searchMenu: {
            find: '検索',
            replace: '置換'
        },
        editor: {
            placeholder: 'ここにテキストを入力してください...'
        },
        statusBar: {
            line: '行',
            column: '列',
            encoding: 'UTF-8',
            fontSize: 'フォント',
            charCount: '総文字数',
            selectionCount: '選択中'
        },
        window: {
            defaultTitle: 'Vinsert - 名前なし',
            titleFormat: 'Vinsert - {filename}'
        },
        messages: {
            messageTitle: 'メッセージ',
            ok: 'OK'
        },
        fonts: {
            title: 'フォント設定',
            buttons: {
                apply: '適用',
                reset: 'リセット',
                cancel: 'キャンセル'
            }
        },
        dialogs: {
            newFile: {
                title: '内容に変更があります',
                message: '保存せずに新規作成すると、変更内容は失われます。',
                cancel: 'キャンセル'
            }
        }
    },
    en: {
        _meta: { code: 'en', name: 'English', nativeName: 'English', version: '1.0.0' },
        menu: {
            file: 'File',
            edit: 'Edit',
            view: 'View', 
            search: 'Search'
        },
        fileMenu: {
            new: 'New',
            open: 'Open',
            save: 'Save',
            saveAs: 'Save As',
            exit: 'Exit'
        },
        editMenu: {
            undo: 'Undo',
            redo: 'Redo',
            cut: 'Cut',
            copy: 'Copy',
            paste: 'Paste',
            selectAll: 'Select All'
        },
        viewMenu: {
            fontSettings: 'Font Settings',
            fontSizeInput: 'Font Size Input',
            increaseFontSize: 'Increase Font Size',
            decreaseFontSize: 'Decrease Font Size',
            lineHighlight: 'Line Highlight',
            typewriterMode: 'Typewriter Mode'
        },
        searchMenu: {
            find: 'Find',
            replace: 'Replace'
        },
        editor: {
            placeholder: 'Please enter text here...'
        },
        statusBar: {
            line: 'Line',
            column: 'Column',
            encoding: 'UTF-8',
            fontSize: 'Font',
            charCount: 'Character count',
            selectionCount: 'Selection'
        },
        window: {
            defaultTitle: 'Vinsert - Untitled',
            titleFormat: 'Vinsert - {filename}'
        },
        messages: {
            messageTitle: 'Message',
            ok: 'OK'
        },
        fonts: {
            title: 'Font Settings',
            buttons: {
                apply: 'Apply',
                reset: 'Reset',
                cancel: 'Cancel'
            }
        },
        dialogs: {
            newFile: {
                title: 'Unsaved Changes',
                message: 'Creating a new file without saving will lose your changes.',
                cancel: 'Cancel'
            }
        }
    }
};

/**
 * OS固有の設定ディレクトリを取得してlocalesフォルダのパスを構築
 */
async function getLocalesDirectory() {
    try {
        if (window.__TAURI__ && window.__TAURI__.path) {
            const { appDataDir, join } = window.__TAURI__.path;
            
            // アプリデータディレクトリを取得
            const appData = await appDataDir();
            
            // localesディレクトリのパスを構築
            const localesPath = await join(appData, 'locales');
            
            console.log('🌐 Locales directory path:', localesPath);
            return localesPath;
        } else {
            throw new Error('Tauri path API not available');
        }
    } catch (error) {
        console.warn('⚠️ Could not get app data directory:', error);
        return null;
    }
}

/**
 * localesディレクトリを作成（存在しない場合）
 */
async function ensureLocalesDirectory() {
    try {
        if (!localesDirectory || !window.__TAURI__?.fs) {
            return false;
        }

        const { exists, createDir } = window.__TAURI__.fs;
        
        // ディレクトリが存在するかチェック
        const dirExists = await exists(localesDirectory);
        
        if (!dirExists) {
            console.log('📁 Creating locales directory:', localesDirectory);
            await createDir(localesDirectory, { recursive: true });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create locales directory:', error);
        return false;
    }
}

/**
 * フォールバックシステムを初期化
 */
function initializeFallbackSystem() {
    console.log('🔄 Initializing fallback i18n system...');
    
    // 利用可能な言語を設定
    availableLanguages = [
        { code: 'ja', name: '日本語', nativeName: '日本語', version: '1.0.0' },
        { code: 'en', name: 'English', nativeName: 'English', version: '1.0.0' }
    ];
    
    // デフォルト言語を設定
    const preferredLanguage = loadLanguageFromStorage();
    const selectedLang = FALLBACK_LANGUAGES[preferredLanguage] || FALLBACK_LANGUAGES['ja'];
    const { _meta, ...langData } = selectedLang;
    
    languageData = langData;
    currentLanguage = _meta.code;
    isExternalSystemEnabled = false;
    
    console.log(`✅ Fallback i18n system initialized with language: ${_meta.name} (${currentLanguage})`);
    console.log('📋 Available languages:', availableLanguages.map(l => `${l.nativeName} (${l.code})`));
}

/**
 * キーに基づいて文字列を取得する
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
        
        // フォールバック: 英語からキーを取得を試行
        if (currentLanguage !== 'en') {
            try {
                const keys = key.split('.');
                let value = FALLBACK_LANGUAGES.en;
                
                for (const k of keys) {
                    if (value && typeof value === 'object' && k in value) {
                        value = value[k];
                    } else {
                        throw new Error('Key not found in English fallback');
                    }
                }
                
                if (typeof value === 'string') {
                    return value;
                }
            } catch (fallbackError) {
                // 何もしない
            }
        }
        
        return key; // 最終フォールバック: キーをそのまま返す
    }
}

/**
 * 現在の言語を取得
 */
export function getCurrentLanguage() {
    return currentLanguage;
}

/**
 * 利用可能な言語一覧を取得
 */
export function getAvailableLanguages() {
    return [...availableLanguages];
}

/**
 * ブラウザの言語設定を取得
 */
export function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.substring(0, 2).toLowerCase();
    
    // サポートされている言語かチェック
    const supportedLanguages = Object.keys(FALLBACK_LANGUAGES);
    
    if (supportedLanguages.includes(langCode)) {
        return langCode;
    }
    
    // デフォルトは日本語
    return 'ja';
}

/**
 * ローカルストレージから言語設定を読み込み
 */
export function loadLanguageFromStorage() {
    try {
        const savedLanguage = localStorage.getItem('vinsert-language');
        if (savedLanguage) {
            const supportedLanguages = Object.keys(FALLBACK_LANGUAGES);
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
 */
export function saveLanguageToStorage(language) {
    try {
        localStorage.setItem('vinsert-language', language);
        console.log(`💾 Language saved to storage: ${language}`);
    } catch (error) {
        console.warn('⚠️ Could not save language to localStorage:', error);
    }
}

/**
 * 言語を変更してUIを更新
 */
export async function changeLanguage(languageCode) {
    console.log(`🌐 Changing language to: ${languageCode}`);
    
    // フォールバックシステムの言語データから選択
    if (FALLBACK_LANGUAGES[languageCode]) {
        const selectedLang = FALLBACK_LANGUAGES[languageCode];
        const { _meta, ...langData } = selectedLang;
        
        languageData = langData;
        currentLanguage = _meta.code;
        
        saveLanguageToStorage(languageCode);
        
        // UI更新イベントを発火
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: languageCode, languageInfo: _meta }
        }));
        
        console.log(`✅ Language changed to: ${_meta.name} (${languageCode})`);
        return true;
    } else {
        console.error(`❌ Language not found: ${languageCode}`);
        return false;
    }
}

/**
 * 多言語化システムを初期化
 */
export async function initializeI18n() {
    console.log('🌐 Initializing i18n system...');
    
    // まずフォールバックシステムを確実に初期化
    initializeFallbackSystem();
    
    // 外部ファイルシステムを試行（バックグラウンドで）
    try {
        console.log('🔍 Attempting to initialize external file system...');
        await tryExternalFileSystem();
    } catch (error) {
        console.warn('⚠️ External file system not available, using fallback:', error);
    }
    
    return true;
}

/**
 * 外部ファイルシステムを試行
 */
async function tryExternalFileSystem() {
    // まだ外部システムが有効でない場合のみ試行
    if (isExternalSystemEnabled) {
        return;
    }
    
    // この機能は将来の実装用
    console.log('📂 External file system will be implemented in future updates');
}

/**
 * HTMLの属性やテキストコンテンツを更新するヘルパー関数
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
 * localesディレクトリのパスを取得（デバッグ用）
 */
export function getLocalesDirectoryPath() {
    return localesDirectory || '(Fallback system - no external directory)';
}

/**
 * システム情報を取得（デバッグ用）
 */
export function getSystemInfo() {
    return {
        currentLanguage,
        availableLanguages: availableLanguages.length,
        isExternalSystemEnabled,
        localesDirectory: localesDirectory || '(not set)',
        hasLanguageData: Object.keys(languageData).length > 0
    };
}