/*
 * =====================================================
 * Vinsert Editor - 拡張機能管理システム
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
    extensionsDirectory: null
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
 * サンプル拡張機能を作成
 */
async function createSampleExtension() {
    if (!window.__TAURI__?.fs || !extensionState.extensionsDirectory) {
        return;
    }
    
    const { exists, writeTextFile, mkdir } = window.__TAURI__.fs;
    const { join } = window.__TAURI__.path;
    
    try {
        const sampleExtDir = await join(extensionState.extensionsDirectory, 'html-support');
        
        // ディレクトリが存在しない場合のみ作成
        const dirExists = await exists(sampleExtDir);
        if (!dirExists) {
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
            
            // main.py を作成
            const pythonCode = `
import json

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
            
            # '<'が入力された場合、補完候補を返す
            if text and text[-1] == '<':
                suggestions = [{"tag": tag, "display": f"<{tag}>"} for tag in HTML_TAGS]
                return json.dumps({
                    "action": "show_suggestions",
                    "suggestions": suggestions,
                    "position": cursor_pos
                })
            
            # 開始タグが完成した場合、閉じタグを追加
            if text and '>' in text:
                lines = text[:cursor_pos].split('\\n')
                current_line = lines[-1] if lines else ""
                
                # 開始タグを検出
                import re
                match = re.search(r'<([a-zA-Z]+)(?:\\s[^>]*)?>$', current_line)
                if match:
                    tag_name = match.group(1).lower()
                    if tag_name not in SELF_CLOSING_TAGS:
                        return json.dumps({
                            "action": "insert_text",
                            "text": f"</{tag_name}>",
                            "move_cursor_back": len(tag_name) + 3
                        })
        
        elif event_type == "suggestion_selected":
            tag = data.get("tag", "")
            if tag and tag not in SELF_CLOSING_TAGS:
                return json.dumps({
                    "action": "insert_text",
                    "text": f"<{tag}></{tag}>",
                    "move_cursor_back": len(tag) + 3
                })
            elif tag:
                return json.dumps({
                    "action": "insert_text",
                    "text": f"<{tag} />",
                    "move_cursor_back": 3
                })
        
    except Exception as e:
        print(f"Extension error: {e}")
    
    return ""
`;
            
            const mainPyPath = await join(sampleExtDir, 'main.py');
            await writeTextFile(mainPyPath, pythonCode);
            
            console.log('✅ Sample extension created: html-support');
        }
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
 * エディタイベントリスナーの設定
 */
function setupEditorEventListeners() {
    if (!editor) return;
    
    // 拡張機能が有効な場合のみイベントを処理
    editor.addEventListener('input', async (e) => {
        if (extensionState.enabledExtensions.length === 0) return;
        
        // ここで拡張機能にイベントを送信する処理を実装
        // Python統合が必要な場合はここに実装
    });
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