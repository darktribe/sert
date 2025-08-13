/*
 * =====================================================
 * Vinsert Editor - 多言語化システム（テーマ機能対応版）
 * =====================================================
 */

// 現在の言語設定
let currentLanguage = 'ja';
let languageData = {};
let availableLanguages = [];
let localesDirectory = null;
let isExternalSystemEnabled = false;

// デバッグ用：アプリ起動時に必ずフラグをリセット
function resetExternalSystemFlag() {
    isExternalSystemEnabled = false;
    console.log('🔄 External system flag reset to false');
}
let configDirectory = null;

// ハードコードされた完全な言語データ（フォールバック用）
// FALLBACK_LANGUAGES の ja オブジェクトの修正版（該当部分のみ）
const FALLBACK_LANGUAGES = {
    ja: {
        _meta: { code: 'ja', name: '日本語', nativeName: '日本語', version: '1.0.0' },
        menu: {
            file: 'ファイル',
            edit: '編集', 
            view: '表示',
            search: '検索',
            extensions: '機能拡張'
        },
        fileMenu: {
            new: '新規作成',
            open: '開く',
            save: '上書き保存',
            saveAs: '名前をつけて保存',
            about: 'Vinsertについて',
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
            typewriterMode: 'タイプライターモード',
            whitespaceVisualization: '空白文字の可視化',
            whitespaceSettings: '空白文字の設定'
        },
        searchMenu: {
            find: '検索',
            replace: '置換'
        },
        extensionsMenu: {
            extensionSettings: '拡張機能設定',
            languageSettings: '言語設定',
            theme: 'テーマ',
            openAppFolder: 'アプリフォルダを開く'
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
            fontFamily: 'フォントファミリ',
            fontSize: 'フォントサイズ',
            preview: 'プレビュー',
            previewText: 'function example() {\n    // 日本語のコメント\n    console.log(\'Hello, World!\');\n    return 42;\n}',
            sizeInput: {
                title: 'フォントサイズ指定',
                label: 'フォントサイズ',
                placeholder: '8-32の数値を入力',
                rangeInfo: '指定可能範囲: {min}px ～ {max}px',
                invalidRange: 'フォントサイズは{min}px～{max}pxの範囲で指定してください'
            },
            buttons: {
                apply: '適用',
                reset: 'リセット',
                cancel: 'キャンセル'
            },
            messages: {
                resetConfirm: 'フォント設定をデフォルトに戻しますか？'
            }
        },
        theme: {
            title: 'テーマ設定',
            selectLabel: 'テーマを選択',
            preview: 'プレビュー',
            buttons: {
                apply: '適用',
                cancel: 'キャンセル'
            }
        },
        search: {
            searchTitle: '検索',
            replaceTitle: '置換',
            searchLabel: '検索文字:',
            searchPlaceholder: '検索する文字列を入力',
            replaceSearchLabel: '置換するテキスト:',
            replaceSearchPlaceholder: '置換するテキストを入力',
            replaceLabel: '置換後のテキスト:',
            replacePlaceholder: '置換後のテキストを入力',
            useRegex: '正規表現',
            caseSensitive: '大文字小文字を区別',
            resultCount: '結果: {count}件',
            resultPosition: '結果: {total}件 {current}/{total}',
            buttons: {
                search: '検索',
                replace: '置換',
                next: '次へ',
                previous: '前へ',
                replaceAll: 'すべて置換',
                clear: 'クリア',
                close: '閉じる'
            },
            messages: {
                noSearchText: '検索する文字列を入力して下さい',
                noReplaceText: '置換するテキストと置換後のテキストを入力して下さい',
                noResults: '検索結果：0件',
                noTarget: '置換する対象が選択されていません。次へ・前へで選択して下さい',
                noMatches: '置換する対象がありません',
                replaceAllComplete: '全{count}件を置換しました',
                regexError: '正規表現に問題があります。正規表現でなくその文字自体を検索したい場合、正規表現のチェックを外して下さい。'
            }
        },
        // about オブジェクトを search の外に移動（修正ポイント）
        about: {
            title: 'Vinsertについて',
            appName: 'Vinsert',
            description: 'Vinsert Is New Simple Editor by Rust and Tauri',
            version: 'Version 1.00',
            author: 'Author : Akihiko Ouchi a.k.a 如月 翔也（from 歳月堂）'
        },
        whitespace: {
            enable: '空白文字の可視化を有効にする',
            typeSettings: '表示する空白文字の種類',
            fullWidthSpace: '全角スペース（　）- 薄い青で表示',
            halfWidthSpace: '半角スペース（ ）- グレーのドットで表示',
            tabCharacter: 'タブ文字（→）- オレンジの矢印で表示'
        },
        dialogs: {
            newFile: {
                title: '内容に変更があります',
                message: '保存せずに新規作成すると、変更内容は失われます。',
                saveAndNew: '保存して新規作成',
                newWithoutSaving: '保存せずに新規作成',
                cancel: 'キャンセル'
            },
            openFile: {
                title: '内容に変更があります',
                message: '保存せずにファイルを開くと、変更内容は失われます。',
                saveAndOpen: '保存してから開く',
                openWithoutSaving: '保存せずに開く',
                cancel: 'キャンセル'
            },
            exit: {
                title: '内容に変更があります',
                message: '保存せずに終了すると、変更内容は失われます。',
                saveAndExit: '保存して終了',
                exitWithoutSaving: '保存せずに終了',
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
            search: 'Search',
            extensions: 'Extensions'
        },
        fileMenu: {
            new: 'New',
            open: 'Open',
            save: 'Save',
            saveAs: 'Save As',
            about: 'About Vinsert',
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
            typewriterMode: 'Typewriter Mode',
            whitespaceVisualization: 'Whitespace Visualization',
            whitespaceSettings: 'Whitespace Settings'
        },
        searchMenu: {
            find: 'Find',
            replace: 'Replace'
        },
        extensionsMenu: {
            extensionSettings: 'Extension Settings',
            languageSettings: 'Language Settings',
            theme: 'Theme',
            openAppFolder: 'Open App Folder'
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
        about: {
            title: 'About Vinsert',
            appName: 'Vinsert',
            description: 'Vinsert Is New Simple Editor by Rust and Tauri',
            version: 'Version 1.00',
            author: 'Author : Akihiko Ouchi a.k.a show-ya kisaragi（from saigetsudo）'
        },
        whitespace: {
            enable: 'Enable whitespace visualization',
            typeSettings: 'Types of whitespace to display',
            fullWidthSpace: 'Full-width space (　) - shown in light blue',
            halfWidthSpace: 'Half-width space ( ) - shown as gray dot',
            tabCharacter: 'Tab character (→) - shown as orange arrow'
        },
        fonts: {
            title: 'Font Settings',
            fontFamily: 'Font Family',
            fontSize: 'Font Size',
            preview: 'Preview',
            previewText: 'function example() {\n    // English comment\n    console.log(\'Hello, World!\');\n    return 42;\n}',
            sizeInput: {
                title: 'Font Size Input',
                label: 'Font Size',
                placeholder: 'Enter size 8-32',
                rangeInfo: 'Valid range: {min}px - {max}px',
                invalidRange: 'Font size must be between {min}px and {max}px'
            },
            buttons: {
                apply: 'Apply',
                reset: 'Reset',
                cancel: 'Cancel'
            },
            messages: {
                resetConfirm: 'Reset font settings to default?'
            }
        },
        theme: {
            title: 'Theme Settings',
            selectLabel: 'Select Theme',
            preview: 'Preview',
            buttons: {
                apply: 'Apply',
                cancel: 'Cancel'
            }
        },
        search: {
            searchTitle: 'Search',
            replaceTitle: 'Replace',
            searchLabel: 'Search for:',
            searchPlaceholder: 'Enter text to search',
            replaceSearchLabel: 'Text to replace:',
            replaceSearchPlaceholder: 'Enter text to replace',
            replaceLabel: 'Replace with:',
            replacePlaceholder: 'Enter replacement text',
            useRegex: 'Regular Expression',
            caseSensitive: 'Case Sensitive',
            resultCount: 'Results: {count}',
            resultPosition: 'Results: {total} ({current}/{total})',
            buttons: {
                search: 'Search',
                replace: 'Replace',
                next: 'Next',
                previous: 'Previous',
                replaceAll: 'Replace All',
                clear: 'Clear',
                close: 'Close'
            },
            messages: {
                noSearchText: 'Please enter text to search for',
                noReplaceText: 'Please enter both search text and replacement text',
                noResults: 'No results found',
                noTarget: 'No target selected for replacement. Use Next/Previous to select',
                noMatches: 'No matches to replace',
                replaceAllComplete: 'Replaced all {count} matches',
                regexError: 'Regular expression error. If you want to search for these characters literally, uncheck Regular Expression.'
            }
        },
        dialogs: {
            newFile: {
                title: 'Unsaved Changes',
                message: 'Creating a new file without saving will lose your changes.',
                saveAndNew: 'Save and New',
                newWithoutSaving: 'New Without Saving',
                cancel: 'Cancel'
            },
            openFile: {
                title: 'Unsaved Changes',
                message: 'Opening a file without saving will lose your changes.',
                saveAndOpen: 'Save and Open',
                openWithoutSaving: 'Open Without Saving',
                cancel: 'Cancel'
            },
            exit: {
                title: 'Unsaved Changes',
                message: 'Exiting without saving will lose your changes.',
                saveAndExit: 'Save and Exit',
                exitWithoutSaving: 'Exit Without Saving',
                cancel: 'Cancel'
            }
        }
    },
    fr: {
        _meta: { code: 'fr', name: 'French', nativeName: 'Français', version: '1.0.0' },
        menu: {
            file: 'Fichier',
            edit: 'Édition',
            view: 'Affichage',
            search: 'Recherche',
            extensions: 'Extensions'
        },
        fileMenu: {
            new: 'Nouveau',
            open: 'Ouvrir',
            save: 'Enregistrer',
            saveAs: 'Enregistrer sous',
            about: 'À propos de Vinsert',
            exit: 'Quitter'
        },
        editMenu: {
            undo: 'Annuler',
            redo: 'Rétablir',
            cut: 'Couper',
            copy: 'Copier',
            paste: 'Coller',
            selectAll: 'Tout sélectionner'
        },
        viewMenu: {
            fontSettings: 'Paramètres de police',
            fontSizeInput: 'Saisie de taille de police',
            increaseFontSize: 'Augmenter la taille de police',
            decreaseFontSize: 'Diminuer la taille de police',
            lineHighlight: 'Surbrillance de ligne',
            typewriterMode: 'Mode machine à écrire',
            whitespaceVisualization: 'Visualisation des espaces',
            whitespaceSettings: 'Paramètres des espaces'
        },
        searchMenu: {
            find: 'Rechercher',
            replace: 'Remplacer'
        },
        extensionsMenu: {
            extensionSettings: 'Paramètres d\'extension',
            languageSettings: 'Paramètres de langue',
            theme: 'Thème',
            openAppFolder: 'Ouvrir le dossier de l\'app'
        },
        editor: {
            placeholder: 'Veuillez saisir votre texte ici...'
        },
        statusBar: {
            line: 'Ligne',
            column: 'Colonne',
            encoding: 'UTF-8',
            fontSize: 'Police',
            charCount: 'Nombre de caractères',
            selectionCount: 'Sélection'
        },
        fonts: {
            title: 'Paramètres de police',
            fontFamily: 'Famille de police',
            fontSize: 'Taille de police',
            preview: 'Aperçu',
            previewText: 'function exemple() {\n    // Commentaire français\n    console.log(\'Bonjour, le monde!\');\n    return 42;\n}',
            sizeInput: {
                title: 'Saisie de taille de police',
                label: 'Taille de police',
                placeholder: 'Saisir taille 8-32',
                rangeInfo: 'Plage valide : {min}px - {max}px',
                invalidRange: 'La taille de police doit être entre {min}px et {max}px'
            },
            buttons: {
                apply: 'Appliquer',
                reset: 'Réinitialiser',
                cancel: 'Annuler'
            },
            messages: {
                resetConfirm: 'Réinitialiser les paramètres de police par défaut ?'
            }
        },
        theme: {
            title: 'Paramètres de thème',
            selectLabel: 'Sélectionner un thème',
            preview: 'Aperçu',
            buttons: {
                apply: 'Appliquer',
                cancel: 'Annuler'
            }
        },
        search: {
            searchTitle: 'Recherche',
            replaceTitle: 'Remplacer',
            searchLabel: 'Rechercher :',
            searchPlaceholder: 'Saisir le texte à rechercher',
            replaceSearchLabel: 'Texte à remplacer :',
            replaceSearchPlaceholder: 'Saisir le texte à remplacer',
            replaceLabel: 'Remplacer par :',
            replacePlaceholder: 'Saisir le texte de remplacement',
            useRegex: 'Expression régulière',
            caseSensitive: 'Sensible à la casse',
            resultCount: 'Résultats : {count}',
            resultPosition: 'Résultats : {total} ({current}/{total})',
            buttons: {
                search: 'Rechercher',
                replace: 'Remplacer',
                next: 'Suivant',
                previous: 'Précédent',
                replaceAll: 'Tout remplacer',
                clear: 'Effacer',
                close: 'Fermer'
            },
            messages: {
                noSearchText: 'Veuillez saisir un texte à rechercher',
                noReplaceText: 'Veuillez saisir le texte à rechercher et le texte de remplacement',
                noResults: 'Aucun résultat trouvé',
                noTarget: 'Aucune cible sélectionnée pour le remplacement',
                noMatches: 'Aucune correspondance à remplacer',
                replaceAllComplete: 'Toutes les {count} correspondances ont été remplacées',
                regexError: 'Erreur d\'expression régulière'
            }
        },
        dialogs: {
            newFile: {
                title: 'Modifications non sauvegardées',
                message: 'Créer un nouveau fichier sans sauvegarder fera perdre vos modifications.',
                saveAndNew: 'Sauvegarder et nouveau',
                newWithoutSaving: 'Nouveau sans sauvegarder',
                cancel: 'Annuler'
            },
            openFile: {
                title: 'Modifications non sauvegardées',
                message: 'Ouvrir un fichier sans sauvegarder fera perdre vos modifications.',
                saveAndOpen: 'Sauvegarder et ouvrir',
                openWithoutSaving: 'Ouvrir sans sauvegarder',
                cancel: 'Annuler'
            },
            exit: {
                title: 'Modifications non sauvegardées',
                message: 'Quitter sans sauvegarder fera perdre vos modifications.',
                saveAndExit: 'Sauvegarder et quitter',
                exitWithoutSaving: 'Quitter sans sauvegarder',
                cancel: 'Annuler'
            }
        },
        window: {
            defaultTitle: 'Vinsert - Sans titre',
            titleFormat: 'Vinsert - {filename}'
        },
        messages: {
            messageTitle: 'Message',
            ok: 'OK'
        },
        about: {
            title: 'À propos de Vinsert',
            appName: 'Vinsert',
            description: 'Vinsert Is New Simple Editor by Rust and Tauri',
            version: 'Version 1.00',
            author: 'Author : Akihiko Ouchi a.k.a show-ya kisaragi（from saigetsudo）'
        },
        whitespace: {
            enable: 'Activer la visualisation des espaces',
            typeSettings: 'Types d\'espaces à afficher',
            fullWidthSpace: 'Espace pleine largeur (　) - affiché en bleu clair',
            halfWidthSpace: 'Espace demi-largeur ( ) - affiché comme point gris',
            tabCharacter: 'Caractère de tabulation (→) - affiché comme flèche orange'
        },
    }
};

/**
 * OS固有の設定ディレクトリを取得してlocalesフォルダのパスを構築
 */
/**
 * OS固有の設定ディレクトリを取得
 */
/**
 * OS固有の設定ディレクトリを取得
 */
async function getConfigDirectory() {
    try {
        if (window.__TAURI__ && window.__TAURI__.path) {
            const { appDataDir, join } = window.__TAURI__.path;
            const appData = await appDataDir();
            // アプリ専用のサブディレクトリを作成
            const appConfigDir = await join(appData, 'vinsert');
            console.log('📁 Config directory path:', appConfigDir);
            
            // 実際のパスを確認するためのデバッグログ
            console.log('🔍 Debug - App data dir:', appData);
            console.log('🔍 Debug - Final config dir:', appConfigDir);
            
            return appConfigDir;
        } else {
            throw new Error('Tauri path API not available');
        }
    } catch (error) {
        console.warn('⚠️ Could not get app data directory:', error);
        return null;
    }
}

/**
 * OS固有の設定ディレクトリを取得してlocalesフォルダのパスを構築
 */
async function getLocalesDirectory() {
    try {
        if (window.__TAURI__ && window.__TAURI__.path) {
            const { join } = window.__TAURI__.path;
            
            if (!configDirectory) {
                configDirectory = await getConfigDirectory();
            }
            
            if (!configDirectory) {
                throw new Error('Config directory not available');
            }
            
            // localesディレクトリのパスを構築
            const localesPath = await join(configDirectory, 'locale');
            
            console.log('🌐 Locales directory path:', localesPath);
            return localesPath;
        } else {
            throw new Error('Tauri path API not available');
        }
    } catch (error) {
        console.warn('⚠️ Could not get locales directory:', error);
        return null;
    }
}

/**
 * localesディレクトリを作成（存在しない場合）
 */
/**
 * 設定ディレクトリを作成（存在しない場合）
 */
async function ensureConfigDirectory() {
    try {
        if (!configDirectory || !window.__TAURI__?.fs) {
            console.error('❌ Config directory or Tauri FS not available');
            return false;
        }

        const { exists, mkdir } = window.__TAURI__.fs;
        
        console.log('🔍 Checking config directory exists:', configDirectory);
        const dirExists = await exists(configDirectory);
        console.log('📁 Config directory exists:', dirExists);
        
        if (!dirExists) {
            console.log('📁 Creating config directory:', configDirectory);
            
            // 親ディレクトリも含めて再帰的に作成
            await mkdir(configDirectory, { 
                recursive: true
            });
            
            // 作成確認
            const createdExists = await exists(configDirectory);
            console.log('✅ Config directory created successfully:', createdExists);
            
            // Finderで確認できるように絶対パスをログ出力
            console.log('🗂️ FOLDER LOCATION FOR FINDER:', configDirectory);
            console.log('🗂️ Please check this path in Finder');
            
            if (!createdExists) {
                throw new Error('Directory creation appeared to succeed but directory still does not exist');
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create config directory:', error);
        console.error('❌ Error details:', error.message);
        return false;
    }
}

/**
 * localesディレクトリを作成（存在しない場合）
 */
async function ensureLocalesDirectory() {
    try {
        if (!localesDirectory || !window.__TAURI__?.fs) {
            console.error('❌ Locales directory or Tauri FS not available');
            return false;
        }

        const { exists, mkdir } = window.__TAURI__.fs;
        
        console.log('🔍 Checking locales directory exists:', localesDirectory);
        const dirExists = await exists(localesDirectory);
        console.log('📁 Locales directory exists:', dirExists);
        
        if (!dirExists) {
            console.log('📁 Creating locales directory:', localesDirectory);
            
            await mkdir(localesDirectory, { 
                recursive: true
            });
            
            // 作成確認
            const createdExists = await exists(localesDirectory);
            console.log('✅ Locales directory created successfully:', createdExists);
            
            if (!createdExists) {
                throw new Error('Directory creation appeared to succeed but directory still does not exist');
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create locales directory:', error);
        console.error('❌ Error details:', error.message);
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
    
    // 日本語で初期化
    const { _meta, ...langData } = FALLBACK_LANGUAGES['ja'];
    languageData = langData;
    currentLanguage = 'ja';
    isExternalSystemEnabled = false;
    
    console.log(`✅ Fallback i18n system initialized with Japanese`);
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
    console.log('🔍 getAvailableLanguages called, external system:', isExternalSystemEnabled);
    console.log('🔍 Available languages:', availableLanguages);
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
/**
 * 言語を変更してUIを更新
 */
export async function changeLanguage(languageCode) {
    console.log(`🌐 Changing language to: ${languageCode}`);
    
    let langData = null;
    let langInfo = null;
    
    // 外部システムが有効な場合は外部ファイルから読み込み
    if (isExternalSystemEnabled) {
        langData = await loadLanguageFromFile(languageCode);
        const langMeta = availableLanguages.find(l => l.code === languageCode);
        if (langMeta) {
            langInfo = langMeta;
        }
    }
    
    // 外部ファイルが読み込めない場合はフォールバックを使用
    if (!langData && FALLBACK_LANGUAGES[languageCode]) {
        const selectedLang = FALLBACK_LANGUAGES[languageCode];
        const { _meta, ...fallbackData } = selectedLang;
        langData = fallbackData;
        langInfo = _meta;
    }
    
    if (langData && langInfo) {
        languageData = langData;
        currentLanguage = langInfo.code;
        
        saveLanguageToStorage(languageCode);
        
        // UI更新イベントを発火
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { language: languageCode, languageInfo: langInfo }
        }));
        
        console.log(`✅ Language changed to: ${langInfo.name} (${languageCode})`);
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
    
    // 日本語で固定初期化
    availableLanguages = [
        { code: 'ja', name: '日本語', nativeName: '日本語', version: '1.0.0' },
        { code: 'en', name: 'English', nativeName: 'English', version: '1.0.0' }
    ];
    
    const { _meta, ...langData } = FALLBACK_LANGUAGES['ja'];
    languageData = langData;
    currentLanguage = 'ja';
    isExternalSystemEnabled = false;
    
    console.log('✅ I18n initialized with Japanese');
    return true;
}

/**
 * 外部ファイルシステムを安全に初期化（失敗してもアプリは継続）
 */
export async function tryExternalFileSystem() {
    // 必ずフラグをリセットしてから開始
    resetExternalSystemFlag();
    
    console.log('🔍 tryExternalFileSystem called - initializing folder structure');
    console.log('🔍 isExternalSystemEnabled after reset:', isExternalSystemEnabled);
    
    // Tauri APIの確認を最初に実行
    if (!window.__TAURI__ || !window.__TAURI__.path || !window.__TAURI__.fs) {
        console.warn('⚠️ Tauri APIs not available, using fallback');
        return false;
    }
    
    try {
        console.log('📂 Initializing external file system...');
        
        // 設定ディレクトリを取得・作成
        console.log('🔍 Getting config directory...');
        configDirectory = await getConfigDirectory();
        console.log('📁 Config directory path:', configDirectory);
        if (!configDirectory) {
            throw new Error('Config directory not available');
        }
        
        console.log('🔍 Ensuring config directory exists...');
        const configCreated = await ensureConfigDirectory();
        console.log('📁 Config directory creation result:', configCreated);
        if (!configCreated) {
            console.warn(`⚠️ Config directory could not be created: ${configDirectory}`);
            // エラーにせず続行
        }
        console.log('✅ Config directory confirmed');
        
        // localesディレクトリを取得・作成
        localesDirectory = await getLocalesDirectory();
        if (!localesDirectory) {
            throw new Error('Locales directory not available');
        }
        
        console.log('📁 Creating locales directory...');
        await ensureLocalesDirectory();
        
        // 言語ファイルを作成（重要：必ず実行）
        console.log('📝 Creating language files...');
        await createLanguageFiles();
        
        // 外部言語ファイルを読み込み
        console.log('📖 Loading external languages...');
        await loadExternalLanguages();
        
        isExternalSystemEnabled = true;
        console.log('✅ External file system initialized successfully');
        console.log('🔍 External system status:', isExternalSystemEnabled);
        console.log('🔍 Available languages count:', availableLanguages.length);
        console.log('🔍 Languages:', availableLanguages.map(l => `${l.nativeName} (${l.code})`));
        console.log('🗂️ Config directory should be at:', configDirectory);
        console.log('🗂️ Locales directory should be at:', localesDirectory);
        
        return true;
        
    } catch (error) {
        console.error('❌ External file system initialization failed:', error);
        
        // フォールバックシステムで継続（alertは表示しない）
        console.log('🔄 Falling back to internal language system');
        isExternalSystemEnabled = false;
        
        return false;
    }
}

/**
 * 言語ファイルを作成
 */
async function createLanguageFiles() {
    if (!window.__TAURI__?.fs || !localesDirectory) {
        console.warn('⚠️ Cannot create language files: Tauri FS or directory not available');
        return;
    }
    
    const { exists, writeTextFile } = window.__TAURI__.fs;
    const { join } = window.__TAURI__.path;
    
    console.log('📝 Creating language files in:', localesDirectory);
    
    for (const [langCode, langData] of Object.entries(FALLBACK_LANGUAGES)) {
        try {
            const filePath = await join(localesDirectory, `${langCode}.json`);
            const fileExists = await exists(filePath);
            
            if (!fileExists) {
                console.log(`📝 Creating language file: ${langCode}.json at ${filePath}`);
                await writeTextFile(filePath, JSON.stringify(langData, null, 2));
                console.log(`✅ Created ${langCode}.json successfully`);
            } else {
                console.log(`📄 Language file already exists: ${langCode}.json`);
            }
        } catch (error) {
            console.error(`❌ Failed to create ${langCode}.json:`, error);
        }
    }
    
    console.log('✅ Language file creation process completed');
}

/**
 * 外部言語ファイルを読み込み
 */
/**
 * 外部言語ファイルを読み込み（常に最新のディスク内容を読み込み）
 */
export async function loadExternalLanguages() {
    console.log('🔍 loadExternalLanguages called - scanning disk for latest files');
    
    if (!window.__TAURI__?.fs || !localesDirectory) {
        console.log('⚠️ Tauri FS or localesDirectory not available');
        return;
    }
    
    try {
        const { readDir, readTextFile } = window.__TAURI__.fs;
        const { join } = window.__TAURI__.path;
        
        // localeディレクトリの内容を読み取り
        const entries = await readDir(localesDirectory);
        const jsonFiles = entries.filter(entry => 
            entry.name.endsWith('.json') && !entry.isDirectory
        );
        
        const externalLanguages = [];
        
        for (const file of jsonFiles) {
            try {
                const filePath = await join(localesDirectory, file.name);
                const content = await readTextFile(filePath);
                const langData = JSON.parse(content);
                
                if (langData._meta && langData._meta.code) {
                    externalLanguages.push({
                        code: langData._meta.code,
                        name: langData._meta.name || langData._meta.code,
                        nativeName: langData._meta.nativeName || langData._meta.name || langData._meta.code,
                        version: langData._meta.version || '1.0.0'
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to load language file ${file.name}:`, error);
            }
        }
        
        if (externalLanguages.length > 0) {
            // 外部言語ファイルが見つかった場合は外部のみを使用
            availableLanguages = externalLanguages;
            console.log('🌐 External languages loaded (internal fallback ignored):', availableLanguages);
            console.log('📊 Language files found:', externalLanguages.length);
        } else {
            // 外部言語ファイルがない場合はフォールバックを使用
            availableLanguages = [
                { code: 'ja', name: '日本語', nativeName: '日本語', version: '1.0.0' },
                { code: 'en', name: 'English', nativeName: 'English', version: '1.0.0' }
            ];
            console.log('🌐 Using fallback languages (no external files found):', availableLanguages);
            console.log('📊 Using fallback with 2 languages');
        }
        
    } catch (error) {
        console.error('❌ Failed to load external languages:', error);
        throw error;
    }
}

/**
 * 外部言語ファイルから言語データを読み込み
 */
async function loadLanguageFromFile(languageCode) {
    if (!window.__TAURI__?.fs || !localesDirectory) {
        return null;
    }
    
    try {
        const { readTextFile } = window.__TAURI__.fs;
        const { join } = window.__TAURI__.path;
        const filePath = await join(localesDirectory, `${languageCode}.json`);
        const content = await readTextFile(filePath);
        const langData = JSON.parse(content);
        
        const { _meta, ...actualLangData } = langData;
        return actualLangData;
        
    } catch (error) {
        console.error(`❌ Failed to load language file ${languageCode}.json:`, error);
        return null;
    }
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