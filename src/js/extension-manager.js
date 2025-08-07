/*
 * =====================================================
 * Vinsert Editor - 拡張機能管理システム（完全復旧版）
 * =====================================================
 */

import { editor, tauriInvoke } from './globals.js';
import { t } from './locales.js';
import { closeAllMenus } from './menu-controller.js';

// 拡張機能の状態管理
let extensionState = {
    extensions: [],
    enabledExtensions: [],
    suggestionBox: null,
    isInitialized: false,
    extensionsDirectory: null,
    lastInputEvent: null, // 重複イベント防止用（追加）
    // インクリメンタルサーチ用の状態（新規追加）
    htmlSearchState: {
        isActive: false,
        searchText: '',
        startPosition: -1,
        currentIndex: 0,
        filteredSuggestions: []
    }
};

/**
 * 拡張機能ディレクトリのパスを取得
 */
async function getExtensionsDirectory() {
    try {
        if (window.__TAURI__ && window.__TAURI__.path) {
            const { appDataDir, join } = window.__TAURI__.path;
            const appData = await appDataDir();
            const configDir = await join(appData, 'vinsert');
            const extensionsPath = await join(configDir, 'extension');
            
            console.log('🧩 Extensions directory path:', extensionsPath);
            return extensionsPath;
        } else {
            throw new Error('Tauri path API not available');
        }
    } catch (error) {
        console.warn('⚠️ Could not get extensions directory:', error);
        return null;
    }
}

/**
 * 拡張機能ディレクトリを作成
 */
async function ensureExtensionsDirectory() {
    try {
        if (!extensionState.extensionsDirectory || !window.__TAURI__?.fs) {
            throw new Error('拡張機能ファイル保存場所が利用できません');
        }

        const { exists, mkdir } = window.__TAURI__.fs;
        
        console.log('🔍 Checking extensions directory exists:', extensionState.extensionsDirectory);
        const dirExists = await exists(extensionState.extensionsDirectory);
        console.log('📁 Extensions directory exists:', dirExists);
        
        if (!dirExists) {
            console.log('📁 Creating extensions directory:', extensionState.extensionsDirectory);
            
            await mkdir(extensionState.extensionsDirectory, { 
                recursive: true,
                mode: 0o755
            });
            
            const createdExists = await exists(extensionState.extensionsDirectory);
            console.log('✅ Extensions directory created successfully:', createdExists);
            
            if (!createdExists) {
                throw new Error('ディレクトリの作成に成功したように見えますが、まだディレクトリが存在しません');
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Failed to create extensions directory:', error);
        throw new Error(`拡張機能ファイル保存場所（${extensionState.extensionsDirectory}）が開けませんでした`);
    }
}

/**
 * サンプル拡張機能を作成（修正されたPythonコード）
 */
async function createSampleExtension() {
    if (!window.__TAURI__?.fs || !extensionState.extensionsDirectory) {
        return;
    }
    
    const { exists, writeTextFile, mkdir, removeDir } = window.__TAURI__.fs;
    const { join } = window.__TAURI__.path;
    
    try {
        const sampleExtDir = await join(extensionState.extensionsDirectory, 'html-support');
        
        // 既存のディレクトリを削除して再作成（開発中のみ）
        const dirExists = await exists(sampleExtDir);
        if (dirExists) {
            console.log('🗑️ Removing existing html-support extension for update...');
            try {
                await removeDir(sampleExtDir, { recursive: true });
            } catch (e) {
                console.warn('Could not remove existing extension:', e);
            }
        }
        
        // ディレクトリを作成
        await mkdir(sampleExtDir, { recursive: true });
        
        // setting.json を作成
        const settings = {
            id: "html-support",
            name: "HTML作成支援",
            summary: "HTMLタグの入力補完と自動閉じタグ生成を提供します",
            version: "1.0.0",
            author: "Vinsert Team",
            main_file: "main.py",
            enabled: false
        };
        
        const settingsPath = await join(sampleExtDir, 'setting.json');
        await writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
        
        // 修正されたmain.py を作成
        const pythonCode = `
import json
import re

# HTMLタグの補完候補
HTML_TAGS = [
    'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'header', 'footer', 'nav', 'main', 'section', 'article',
    'table', 'tr', 'td', 'th', 'thead', 'tbody',
    'form', 'input', 'button', 'select', 'option', 'textarea',
    'script', 'style', 'link', 'meta'
]

# 自己完結型タグ
SELF_CLOSING_TAGS = ['img', 'input', 'br', 'hr', 'meta', 'link']

def on_event(event_type, event_data):
    """エディタからのイベントを処理"""
    try:
        data = json.loads(event_data)
        
        if event_type == "text_input":
            text = data.get("text", "")
            cursor_pos = data.get("cursor_position", 0)
            input_type = data.get("input_type", "")
            input_data = data.get("data", "")
            
            # '<'が入力された場合（どの行でも動作）
            if input_data == '<':
                # カーソル位置が正しいか確認
                if 0 <= cursor_pos <= len(text):
                    # '<'が実際に入力されたことを確認
                    # cursor_posは'<'の後の位置を指すため、1つ前をチェック
                    if cursor_pos > 0 and cursor_pos <= len(text):
                        if text[cursor_pos - 1] == '<':
                            suggestions = [{"tag": tag, "display": tag} for tag in HTML_TAGS]
                            return json.dumps({
                                "action": "show_suggestions",
                                "suggestions": suggestions,
                                "position": cursor_pos
                            })
            
            # '>'が入力された場合、閉じタグを追加（重複チェック付き）
            elif input_data == '>' and cursor_pos > 0:
                # カーソル位置が範囲内かチェック
                if cursor_pos <= len(text) and text[cursor_pos - 1] == '>':
                    # カーソル位置の後をチェックして重複を防ぐ
                    text_after_cursor = text[cursor_pos:min(cursor_pos + 20, len(text))]
                    
                    # カーソル位置までのテキストを取得
                    text_before = text[:cursor_pos]
                    # 最後の開始タグを検出（改行を考慮）
                    match = re.search(r'<([a-zA-Z]+)(?:\\s[^>]*)?>$', text_before)
                    
                    if match:
                        tag_name = match.group(1).lower()
                        if tag_name in HTML_TAGS and tag_name not in SELF_CLOSING_TAGS:
                            # 既に対応する閉じタグが存在するかチェック
                            closing_tag = f"</{tag_name}>"
                            if not text_after_cursor.startswith(closing_tag):
                                return json.dumps({
                                    "action": "insert_text",
                                    "text": closing_tag,
                                    "move_cursor_back": len(tag_name) + 3
                                })
        
        elif event_type == "suggestion_selected":
            tag = data.get("tag", "")
            if tag and tag not in SELF_CLOSING_TAGS:
                # '<'は既に入力されているので、残りの部分のみを挿入
                return json.dumps({
                    "action": "insert_text",
                    "text": f"{tag}></{tag}>",
                    "move_cursor_back": len(tag) + 3
                })
            elif tag:
                # 自己完結型タグの場合
                return json.dumps({
                    "action": "insert_text",
                    "text": f"{tag} />",
                    "move_cursor_back": 3
                })
        
    except Exception as e:
        return json.dumps({"error": str(e)})
    
    return ""
`;
        
        const mainPyPath = await join(sampleExtDir, 'main.py');
        await writeTextFile(mainPyPath, pythonCode);
        
        console.log('✅ Sample extension created: html-support');
    } catch (error) {
        console.error('❌ Failed to create sample extension:', error);
    }
}

/**
 * 拡張機能をスキャン
 */
async function scanExtensions() {
    if (!window.__TAURI__?.fs || !extensionState.extensionsDirectory) {
        console.log('⚠️ Using empty extension list');
        extensionState.extensions = [];
        return;
    }
    
    try {
        const { readDir, readTextFile } = window.__TAURI__.fs;
        const { join } = window.__TAURI__.path;
        
        const entries = await readDir(extensionState.extensionsDirectory);
        const extensions = [];
        
        for (const entry of entries) {
            if (entry.isDirectory || entry.children) {
                const extDir = await join(extensionState.extensionsDirectory, entry.name);
                const settingsPath = await join(extDir, 'setting.json');
                
                try {
                    const content = await readTextFile(settingsPath);
                    const settings = JSON.parse(content);
                    extensions.push(settings);
                } catch (e) {
                    console.warn(`Failed to load extension ${entry.name}:`, e);
                }
            }
        }
        
        extensionState.extensions = extensions;
        extensionState.enabledExtensions = extensions
            .filter(ext => ext.enabled)
            .map(ext => ext.id);
        
        console.log('🔍 Found extensions:', extensions);
        
    } catch (error) {
        console.error('❌ Failed to scan extensions:', error);
        extensionState.extensions = [];
    }
}

/**
 * 拡張機能システムの初期化
 */
export async function initializeExtensionSystem() {
    console.log('🧩 Initializing extension system...');
    
    try {
        // 拡張機能ディレクトリを取得
        extensionState.extensionsDirectory = await getExtensionsDirectory();
        if (!extensionState.extensionsDirectory) {
            throw new Error('設定ファイル保存場所が取得できませんでした');
        }
        
        // 拡張機能ディレクトリを作成
        await ensureExtensionsDirectory();
        
        // サンプル拡張機能を作成
        await createSampleExtension();
        
        // 拡張機能をスキャン
        await scanExtensions();
        
        // エディタイベントリスナーを設定
        setupEditorEventListeners();
        
        extensionState.isInitialized = true;
        
        console.log('✅ Extension system initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Extension system initialization failed:', error);
        // エラーメッセージは表示しない（theme-managerと同じ動作）
        console.log('🔄 Falling back to no extensions mode');
        
        extensionState.isInitialized = false;
        extensionState.extensions = [];
        extensionState.enabledExtensions = [];
        
        return false;
    }
}

/**
 * 拡張機能設定ダイアログを表示
 */
export async function showExtensionSettingsDialog() {
    console.log('🧩 Opening extension settings dialog');
    closeAllMenus();
    
    // 最新の拡張機能をスキャン
    if (extensionState.isInitialized) {
        await scanExtensions();
    }
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('extension-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createExtensionDialog();
}

/**
 * 拡張機能ダイアログの作成
 */
function createExtensionDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'extension-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay extension-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog extension-dialog';
    
    const extensionListHTML = extensionState.extensions.map(ext => `
        <div class="extension-item">
            <label class="extension-checkbox-label">
                <input type="checkbox" 
                       class="extension-checkbox" 
                       data-extension-id="${ext.id}"
                       ${ext.enabled ? 'checked' : ''}>
                <div class="extension-info">
                    <div class="extension-name">${ext.name} (v${ext.version})</div>
                    <div class="extension-summary">${ext.summary}</div>
                    <div class="extension-author">作者: ${ext.author}</div>
                </div>
            </label>
        </div>
    `).join('');
    
    dialog.innerHTML = `
        <div class="search-dialog-header">拡張機能設定</div>
        <div class="search-dialog-content">
            <div class="extension-list">
                ${extensionListHTML.length > 0 ? extensionListHTML : '<div class="no-extensions">拡張機能が見つかりません</div>'}
            </div>
            
            <div class="search-button-group">
                <button id="extension-apply-btn" class="search-button search-button-primary">適用</button>
                <button id="extension-cancel-btn" class="search-button search-button-cancel">キャンセル</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupExtensionDialogEvents(dialogOverlay);
}

/**
 * 拡張機能ダイアログのイベント設定
 */
function setupExtensionDialogEvents(dialogOverlay) {
    const applyBtn = document.getElementById('extension-apply-btn');
    const cancelBtn = document.getElementById('extension-cancel-btn');
    const checkboxes = document.querySelectorAll('.extension-checkbox');
    
    // 一時的な状態を保存
    const originalState = {
        extensions: [...extensionState.extensions],
        enabledExtensions: [...extensionState.enabledExtensions]
    };
    
    // 適用ボタン
    applyBtn.addEventListener('click', async () => {
        // チェック状態を収集して保存
        for (const checkbox of checkboxes) {
            const extensionId = checkbox.dataset.extensionId;
            const isEnabled = checkbox.checked;
            
            // 拡張機能の有効/無効状態を更新
            const extension = extensionState.extensions.find(ext => ext.id === extensionId);
            if (extension) {
                extension.enabled = isEnabled;
                
                // setting.jsonに保存
                if (extensionState.isInitialized && window.__TAURI__?.fs) {
                    try {
                        const { writeTextFile } = window.__TAURI__.fs;
                        const { join } = window.__TAURI__.path;
                        
                        const extDir = await join(extensionState.extensionsDirectory, extensionId);
                        const settingsPath = await join(extDir, 'setting.json');
                        await writeTextFile(settingsPath, JSON.stringify(extension, null, 2));
                    } catch (e) {
                        console.error(`Failed to save extension settings for ${extensionId}:`, e);
                    }
                }
            }
            
            if (isEnabled) {
                if (!extensionState.enabledExtensions.includes(extensionId)) {
                    extensionState.enabledExtensions.push(extensionId);
                }
            } else {
                extensionState.enabledExtensions = extensionState.enabledExtensions.filter(id => id !== extensionId);
            }
        }
        
        closeExtensionDialog(dialogOverlay);
        console.log('✅ Extension settings applied');
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        closeExtensionDialog(dialogOverlay);
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            closeExtensionDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeExtensionDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 拡張機能ダイアログを閉じる
 */
function closeExtensionDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing extension dialog:', error);
    }
}

/**
 * エディタイベントリスナーの設定（修正版：keydownを削除、重複防止追加）
 */
function setupEditorEventListeners() {
    if (!editor) return;
    
    // 拡張機能が有効な場合のみイベントを処理
    editor.addEventListener('input', async (e) => {
        if (extensionState.enabledExtensions.length === 0) return;
        
        // 重複イベント防止（新機能）
        const currentTime = Date.now();
        if (extensionState.lastInputEvent && currentTime - extensionState.lastInputEvent < 50) {
            return;
        }
        extensionState.lastInputEvent = currentTime;
        
        // 有効な拡張機能に対してイベントを送信
        for (const extensionId of extensionState.enabledExtensions) {
            await executeExtensionEvent(extensionId, 'text_input', {
                text: editor.value,
                cursor_position: editor.selectionStart,
                input_type: e.inputType,
                data: e.data
            });
        }
    });
    
    // keydownイベントは削除（問題の原因だったため）
}

/**
 * 拡張機能のPythonコードを実行
 */
async function executeExtensionEvent(extensionId, eventType, eventData) {
    try {
        if (!window.__TAURI__?.fs || !tauriInvoke) {
            console.warn('⚠️ Tauri APIs not available for extension execution');
            return;
        }
        
        const { readTextFile } = window.__TAURI__.fs;
        const { join } = window.__TAURI__.path;
        
        // 拡張機能のmain.pyパスを構築
        const extensionDir = await join(extensionState.extensionsDirectory, extensionId);
        const mainPyPath = await join(extensionDir, 'main.py');
        
        console.log(`🐍 Executing extension ${extensionId} with event ${eventType}`);
        console.log(`📁 Extension path: ${mainPyPath}`);
        
        // main.pyを直接読み込む
        let pythonScript;
        try {
            pythonScript = await readTextFile(mainPyPath);
            console.log('📄 Extension script loaded, length:', pythonScript.length);
        } catch (error) {
            console.error(`❌ Failed to read extension file: ${mainPyPath}`, error);
            return;
        }
        
        // PythonスクリプトをBase64エンコード（エスケープ問題を回避）
        const encodedScript = btoa(unescape(encodeURIComponent(pythonScript)));
        
        // Pythonコードを実行
        const pythonCode = `
import json
import sys
import re
import traceback
import base64

# 拡張機能のコードをBase64デコード
try:
    extension_code = base64.b64decode("${encodedScript}").decode('utf-8')
except Exception as e:
    print(json.dumps({"error": "Failed to decode extension: " + str(e)}))
    sys.exit(1)

# 拡張機能のコードを実行
try:
    exec(extension_code, globals())
except Exception as e:
    print(json.dumps({"error": "Failed to exec extension: " + str(e), "traceback": traceback.format_exc()}))
    sys.exit(1)

# イベントデータ
event_type = "${eventType}"
event_data_json = '''${JSON.stringify(eventData)}'''

# on_event関数が定義されているか確認して実行
if 'on_event' in globals():
    try:
        result = on_event(event_type, event_data_json)
        if result and result.strip():
            print(result)
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc()}))
else:
    print(json.dumps({"error": "on_event function not found in extension"}))
`;
        
        console.log('📝 Executing Python code...');
        const result = await tauriInvoke('execute_python', { code: pythonCode });
        console.log('📤 Python execution result:', result);
        
        if (result && result !== 'Code executed successfully') {
            // 複数行の結果を処理
            const lines = result.split('\n').filter(line => line.trim());
            for (const line of lines) {
                try {
                    const response = JSON.parse(line);
                    if (response.error) {
                        console.error('❌ Extension error:', response.error);
                        if (response.traceback) {
                            console.error('Traceback:', response.traceback);
                        }
                    } else if (response.action) {
                        await handleExtensionResponse(response);
                    }
                } catch (e) {
                    // JSON以外の行は無視
                    if (line.trim()) {
                        console.log('Non-JSON output:', line);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error(`❌ Failed to execute extension ${extensionId}:`, error);
    }
}

/**
 * 拡張機能からのレスポンスを処理
 */
async function handleExtensionResponse(response) {
    if (!response || !response.action) {
        console.log('⚠️ Invalid extension response:', response);
        return;
    }
    
    console.log('📥 Extension response:', response);
    
    switch (response.action) {
        case 'show_suggestions':
            if (response.suggestions && response.suggestions.length > 0) {
                showSuggestions(response.suggestions, response.position);
            }
            break;
            
        case 'insert_text':
            if (response.text) {
                insertTextAtCursor(response.text, response.move_cursor_back || 0);
            }
            break;
            
        default:
            console.warn('Unknown extension action:', response.action);
    }
}

/**
 * サジェスションボックスを表示（インクリメンタルサーチ対応版）
 */
function showSuggestions(suggestions, position) {
    // 既存のサジェスションボックスを削除
    removeSuggestionBox();
    
    if (!suggestions || suggestions.length === 0) return;
    
    // HTMLサーチ状態を初期化
    extensionState.htmlSearchState.isActive = true;
    extensionState.htmlSearchState.startPosition = position;
    extensionState.htmlSearchState.searchText = '';
    extensionState.htmlSearchState.currentIndex = 0;
    extensionState.htmlSearchState.filteredSuggestions = suggestions;
    
    const suggestionBox = document.createElement('div');
    suggestionBox.className = 'enhanced-suggestion-box';
    suggestionBox.style.position = 'absolute';
    
    // カーソル位置を計算
    const editorRect = editor.getBoundingClientRect();
    const cursorCoords = getCursorCoordinates(position);
    
    suggestionBox.style.left = (editorRect.left + cursorCoords.x) + 'px';
    suggestionBox.style.top = (editorRect.top + cursorCoords.y + 20) + 'px';
    
    // サジェスションアイテムを追加
    updateSuggestionItems(suggestionBox, suggestions);
    
    document.body.appendChild(suggestionBox);
    extensionState.suggestionBox = suggestionBox;
    
    // キーボードイベントハンドラー
    const handleKeyDown = (e) => {
        if (!extensionState.htmlSearchState.isActive) return;
        
        const items = suggestionBox.querySelectorAll('.suggestion-item');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                extensionState.htmlSearchState.currentIndex = 
                    (extensionState.htmlSearchState.currentIndex + 1) % items.length;
                updateSelectedItem(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                extensionState.htmlSearchState.currentIndex = 
                    extensionState.htmlSearchState.currentIndex <= 0 
                        ? items.length - 1 
                        : extensionState.htmlSearchState.currentIndex - 1;
                updateSelectedItem(items);
                break;
                
                case 'Tab':
                if (items.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    const selectedItem = items[extensionState.htmlSearchState.currentIndex];
                    if (selectedItem) {
                        selectSuggestion(selectedItem.dataset.tag);
                        removeSuggestionBox();
                    }
                    return false; // イベントの伝播を完全に停止
                }
                break;
                
            case 'Enter':
                if (items.length > 0) {
                    e.preventDefault();
                    const selectedItem = items[extensionState.htmlSearchState.currentIndex];
                    if (selectedItem) {
                        selectSuggestion(selectedItem.dataset.tag);
                        removeSuggestionBox();
                    }
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                // <も削除
                const start = editor.selectionStart;
                if (start > 0 && editor.value[start - 1] === '<') {
                    editor.value = editor.value.substring(0, start - 1) + editor.value.substring(start);
                    editor.setSelectionRange(start - 1, start - 1);
                }
                removeSuggestionBox();
                break;
                
            case 'Backspace':
                // <を削除した場合はサジェスションを閉じる
                setTimeout(() => {
                    const cursorPos = editor.selectionStart;
                    if (cursorPos <= extensionState.htmlSearchState.startPosition) {
                        removeSuggestionBox();
                    } else {
                        // インクリメンタルサーチを更新
                        updateIncrementalSearch();
                    }
                }, 10);
                break;
                
            default:
                // 文字入力時はインクリメンタルサーチを更新
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    setTimeout(() => {
                        updateIncrementalSearch();
                    }, 10);
                }
                break;
        }
    };
    
    // イベントリスナーを追加
    // イベントリスナーを追加（キャプチャフェーズで最優先処理）
    document.addEventListener('keydown', handleKeyDown, true);
    
    // Tabキー専用の追加ハンドラー（さらに確実にするため）
    const handleTabKey = (e) => {
        if (!extensionState.htmlSearchState.isActive) return;
        if (e.key === 'Tab') {
            const items = suggestionBox.querySelectorAll('.suggestion-item');
            if (items.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                const selectedItem = items[extensionState.htmlSearchState.currentIndex];
                if (selectedItem) {
                    selectSuggestion(selectedItem.dataset.tag);
                    removeSuggestionBox();
                }
                return false;
            }
        }
    };
    
    // エディタに直接イベントリスナーを追加（最優先）
    editor.addEventListener('keydown', handleTabKey, true);
    
    // クリーンアップ関数を保存
    extensionState.suggestionBox.cleanup = () => {
        document.removeEventListener('keydown', handleKeyDown, true);
    };
    extensionState.suggestionBox.tabHandler = handleTabKey;
}

/**
 * インクリメンタルサーチを更新
 */
function updateIncrementalSearch() {
    if (!extensionState.htmlSearchState.isActive) return;
    if (!extensionState.suggestionBox) return;
    
    const cursorPos = editor.selectionStart;
    const startPos = extensionState.htmlSearchState.startPosition;
    
    // <の後のテキストを取得
    const searchText = editor.value.substring(startPos, cursorPos).toLowerCase();
    extensionState.htmlSearchState.searchText = searchText;
    
    // 元のサジェスションリストから取得
    const allSuggestions = [
        'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'header', 'footer', 'nav', 'main', 'section', 'article',
        'table', 'tr', 'td', 'th', 'thead', 'tbody',
        'form', 'input', 'button', 'select', 'option', 'textarea',
        'script', 'style', 'link', 'meta'
    ].map(tag => ({ tag: tag, display: tag }));
    
    // フィルタリング
    const filtered = allSuggestions.filter(s => 
        s.tag.toLowerCase().startsWith(searchText)
    );
    
    extensionState.htmlSearchState.filteredSuggestions = filtered;
    extensionState.htmlSearchState.currentIndex = 0;
    
    // サジェスションボックスを更新
    updateSuggestionItems(extensionState.suggestionBox, filtered);
}

/**
 * サジェスションアイテムを更新
 */
function updateSuggestionItems(suggestionBox, suggestions) {
    // 既存のアイテムをクリア
    suggestionBox.innerHTML = '';
    
    if (suggestions.length === 0) {
        removeSuggestionBox();
        return;
    }
    
    // 新しいアイテムを追加
    suggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        
        // インクリメンタルサーチのハイライト
        const searchText = extensionState.htmlSearchState.searchText;
        if (searchText) {
            const tag = suggestion.tag;
            const matchIndex = tag.toLowerCase().indexOf(searchText);
            if (matchIndex === 0) {
                item.innerHTML = 
                    `<span class="suggestion-highlight">${tag.substring(0, searchText.length)}</span>` +
                    tag.substring(searchText.length);
            } else {
                item.textContent = tag;
            }
        } else {
            item.textContent = suggestion.display || suggestion.tag;
        }
        
        item.dataset.tag = suggestion.tag;
        
        // 最初のアイテムを選択状態にする
        if (index === extensionState.htmlSearchState.currentIndex) {
            item.classList.add('selected');
        }
        
        item.addEventListener('click', () => {
            selectSuggestion(suggestion.tag);
            removeSuggestionBox();
        });
        
        item.addEventListener('mouseenter', () => {
            extensionState.htmlSearchState.currentIndex = index;
            updateSelectedItem(suggestionBox.querySelectorAll('.suggestion-item'));
        });
        
        suggestionBox.appendChild(item);
    });
}

/**
 * 選択されたアイテムを更新
 */
function updateSelectedItem(items) {
    items.forEach((item, index) => {
        if (index === extensionState.htmlSearchState.currentIndex) {
            item.classList.add('selected');
            // スクロールして表示
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * サジェスションボックスを削除
 */
function removeSuggestionBox() {
    if (extensionState.suggestionBox) {
        // クリーンアップ関数を実行
        if (extensionState.suggestionBox.cleanup) {
            extensionState.suggestionBox.cleanup();
        }
        // Tabキー用のハンドラーも削除
        if (extensionState.suggestionBox.tabHandler) {
            editor.removeEventListener('keydown', extensionState.suggestionBox.tabHandler, true);
        }
        extensionState.suggestionBox.remove();
        extensionState.suggestionBox = null;
    }
    
    // HTMLサーチ状態をリセット
    extensionState.htmlSearchState.isActive = false;
    extensionState.htmlSearchState.searchText = '';
    extensionState.htmlSearchState.startPosition = -1;
    extensionState.htmlSearchState.currentIndex = 0;
    extensionState.htmlSearchState.filteredSuggestions = [];
}

/**
 * サジェスションを選択
 */
async function selectSuggestion(tag) {
    // インクリメンタルサーチで入力された文字を削除してからタグを挿入
    if (extensionState.htmlSearchState.isActive) {
        // startPositionの1文字前（`<`の位置）から現在位置までを置換
        const start = extensionState.htmlSearchState.startPosition - 1; // `<`の位置
        const end = editor.selectionStart;
        const beforeTag = editor.value.substring(0, start);
        const afterTag = editor.value.substring(end);
        
        // <tag>|</tag> の形式で挿入（|はカーソル位置）
        const selfClosingTags = ['img', 'input', 'br', 'hr', 'meta', 'link'];
        let insertText;
        let cursorOffset;
        
        if (selfClosingTags.includes(tag)) {
            insertText = `<${tag} />`;
            cursorOffset = tag.length + 2; // "<tag "の位置
        } else {
            insertText = `<${tag}></${tag}>`;
            cursorOffset = tag.length + 2; // "<tag>"の直後
        }
        
        editor.value = beforeTag + insertText + afterTag;
        const newCursorPos = start + cursorOffset;
        editor.setSelectionRange(newCursorPos, newCursorPos);
        
        // inputイベントを発火
        editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        // 従来の処理（互換性のため残す）
        for (const extensionId of extensionState.enabledExtensions) {
            await executeExtensionEvent(extensionId, 'suggestion_selected', { tag });
        }
    }
}

/**
 * カーソル位置にテキストを挿入
 */
function insertTextAtCursor(text, moveCursorBack = 0) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    const newValue = value.substring(0, start) + text + value.substring(end);
    editor.value = newValue;
    
    const newCursorPos = start + text.length - moveCursorBack;
    editor.setSelectionRange(newCursorPos, newCursorPos);
    
    // inputイベントを発火
    editor.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * カーソル座標を取得（簡易版）
 */
function getCursorCoordinates(position) {
    // エディタのスタイルを取得
    const computedStyle = window.getComputedStyle(editor);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);
    
    // 位置までのテキストから行数を計算
    const textBeforePosition = editor.value.substring(0, position);
    const lines = textBeforePosition.split('\n');
    const lineNumber = lines.length - 1;
    const columnNumber = lines[lines.length - 1].length;
    
    // 概算座標を計算
    const x = columnNumber * (fontSize * 0.6); // 文字幅の概算
    const y = lineNumber * lineHeight;
    
    return { x, y };
}

/**
 * 利用可能な拡張機能一覧を取得
 */
export function getAvailableExtensions() {
    return [...extensionState.extensions];
}

/**
 * 有効な拡張機能一覧を取得
 */
export function getEnabledExtensions() {
    return [...extensionState.enabledExtensions];
}