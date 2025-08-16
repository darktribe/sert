/*
 * =====================================================
 * Vinsert Editor - 確認ダイアログ表示（ドラッグ機能簡素化版）
 * =====================================================
 */

import { editor } from './globals.js';
import { t } from './locales.js';

/**
 * ドラッグ機能を追加するヘルパー関数（簡素化版）
 */
function enableDialogDragSimple(dialogElement) {
    // グローバル関数が利用可能かチェック
    if (window.enableDialogDrag && typeof window.enableDialogDrag === 'function') {
        return window.enableDialogDrag(dialogElement);
    }
    
    console.log('ℹ️ Dialog drag function not available, skipping');
    return false;
}

/**
 * 新規作成確認ダイアログを表示（簡素化版）
 */
export async function showNewFileDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'new-file-dialog-overlay';
        dialogOverlay.className = 'search-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'search-dialog';
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div class="search-dialog-header">${t('dialogs.newFile.title')}</div>
            <div class="search-dialog-content">
                <div style="margin-bottom: 20px; color: #cccccc;">
                    ${t('dialogs.newFile.message')}
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="save-and-new-btn" tabindex="1" class="search-button search-button-primary">
                        ${t('dialogs.newFile.saveAndNew')}
                    </button>
                    <button id="new-without-saving-btn" tabindex="2" class="search-button search-button-danger">
                        ${t('dialogs.newFile.newWithoutSaving')}
                    </button>
                    <button id="cancel-new-btn" tabindex="3" class="search-button search-button-cancel">
                        ${t('dialogs.newFile.cancel')}
                    </button>
                </div>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ドラッグ機能を追加（遅延実行）
        setTimeout(() => enableDialogDragSimple(dialog), 100);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-new-btn', 'new-without-saving-btn', 'cancel-new-btn'], 
            ['saveAndNew', 'newWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * ファイルを開く確認ダイアログを表示（簡素化版）
 */
export async function showOpenFileDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'open-file-dialog-overlay';
        dialogOverlay.className = 'search-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'search-dialog';
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div class="search-dialog-header">${t('dialogs.openFile.title')}</div>
            <div class="search-dialog-content">
                <div style="margin-bottom: 20px; color: #cccccc;">
                    ${t('dialogs.openFile.message')}
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="save-and-open-btn" tabindex="1" class="search-button search-button-primary">
                        ${t('dialogs.openFile.saveAndOpen')}
                    </button>
                    <button id="open-without-saving-btn" tabindex="2" class="search-button search-button-danger">
                        ${t('dialogs.openFile.openWithoutSaving')}
                    </button>
                    <button id="cancel-open-btn" tabindex="3" class="search-button search-button-cancel">
                        ${t('dialogs.openFile.cancel')}
                    </button>
                </div>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ドラッグ機能を追加（遅延実行）
        setTimeout(() => enableDialogDragSimple(dialog), 100);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-open-btn', 'open-without-saving-btn', 'cancel-open-btn'], 
            ['saveAndOpen', 'openWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * 終了確認ダイアログを表示（簡素化版）
 */
export async function showExitDialog() {
    return new Promise((resolve) => {
        console.log('🚪 Creating exit dialog...');
        
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'exit-dialog-overlay';
        dialogOverlay.className = 'search-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'search-dialog';
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div class="search-dialog-header">${t('dialogs.exit.title')}</div>
            <div class="search-dialog-content">
                <div style="margin-bottom: 20px; color: #cccccc;">
                    ${t('dialogs.exit.message')}
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="save-and-exit-btn" tabindex="1" class="search-button search-button-primary">
                        ${t('dialogs.exit.saveAndExit')}
                    </button>
                    <button id="exit-without-saving-btn" tabindex="2" class="search-button search-button-danger">
                        ${t('dialogs.exit.exitWithoutSaving')}
                    </button>
                    <button id="cancel-exit-btn" tabindex="3" class="search-button search-button-cancel">
                        ${t('dialogs.exit.cancel')}
                    </button>
                </div>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        console.log('🚪 Exit dialog added to DOM');
        
        // ドラッグ機能を追加（遅延実行）
        setTimeout(() => enableDialogDragSimple(dialog), 100);
        
        // フォーカスを確実に設定
        setTimeout(() => {
            try {
                console.log('🚪 Setting focus to dialog...');
                const cancelBtn = document.getElementById('cancel-exit-btn');
                if (cancelBtn) {
                    cancelBtn.focus();
                    console.log('✅ Dialog focus set to cancel button');
                }
            } catch (focusError) {
                console.error('❌ Dialog focus failed:', focusError);
            }
        }, 150);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-exit-btn', 'exit-without-saving-btn', 'cancel-exit-btn'], 
            ['saveAndExit', 'exitWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * アバウトダイアログを表示（簡素化版）
 */
export async function showAboutDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'about-dialog-overlay';
        dialogOverlay.className = 'search-dialog-overlay about-dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'search-dialog about-dialog';
        
        dialog.innerHTML = `
            <div class="search-dialog-header">${t('about.title')}</div>
            <div class="search-dialog-content">
                <div class="about-content">
                    <div class="about-app-name">${t('about.appName')}</div>
                    <div class="about-description">${t('about.description')}</div>
                    <div class="about-version">${t('about.version')}</div>
                    <div class="about-author">${t('about.author')}</div>
                    <div class="about-support-url">
                        <span>Support URL : </span>
                        <a href="#" id="support-url-link" class="support-url-link">https://saigetsudo.com/product/vinsert</a>
                    </div>
                </div>
                
                <div class="search-button-group">
                    <button id="about-ok-btn" class="search-button search-button-primary">${t('messages.ok')}</button>
                </div>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ドラッグ機能を追加（遅延実行）
        setTimeout(() => enableDialogDragSimple(dialog), 100);
        
        setupAboutDialogEvents(dialogOverlay, resolve);
    });
}

/**
 * アバウトダイアログのイベント設定
 */
function setupAboutDialogEvents(dialogOverlay, resolve) {
    const okBtn = document.getElementById('about-ok-btn');
    const supportUrlLink = document.getElementById('support-url-link');
    
    function closeAboutDialog() {
        try {
            document.body.removeChild(dialogOverlay);
            document.removeEventListener('keydown', handleAboutKeyDown);
            resolve();
        } catch (error) {
            console.warn('⚠️ Error closing about dialog:', error);
            resolve();
        }
    }
    
    // サポートURLクリック処理
    if (supportUrlLink) {
        supportUrlLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const url = 'https://saigetsudo.com/product/vinsert';
                
                // Tauri環境でブラウザを開く
                if (window.__TAURI__ && window.__TAURI__.shell) {
                    await window.__TAURI__.shell.open(url);
                } else if (window.__TAURI__ && window.__TAURI__.core) {
                    // フォールバック: Tauri invoke
                    await window.__TAURI__.core.invoke('open_url', { url });
                } else {
                    // 最後の手段: window.open
                    window.open(url, '_blank');
                }
                console.log('✅ Support URL opened:', url);
            } catch (error) {
                console.error('❌ Failed to open support URL:', error);
                // エラー時はクリップボードにコピー
                try {
                    navigator.clipboard.writeText('https://saigetsudo.com/product/vinsert');
                    alert('URLをクリップボードにコピーしました');
                } catch (clipError) {
                    alert('URLを開けませんでした: https://saigetsudo.com/product/vinsert');
                }
            }
        });
    }
    
    okBtn.addEventListener('click', closeAboutDialog);
    
    function handleAboutKeyDown(e) {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            closeAboutDialog();
        }
    }
    
    document.addEventListener('keydown', handleAboutKeyDown);
    
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeAboutDialog();
        }
    });
    
    setTimeout(() => okBtn.focus(), 100);
}

/**
 * ダイアログの共通キーボードナビゲーション処理（既存コード）
 */
function setupDialogNavigation(dialogOverlay, buttonIds, returnValues, resolve) {
    console.log('🚪 Setting up dialog navigation...');
    
    const buttons = buttonIds.map(id => document.getElementById(id));
    let currentButtonIndex = 2; // デフォルトで「キャンセル」を選択
    
    console.log('🚪 Dialog buttons found:', buttons.length);
    
    // フォーカススタイルを適用する関数
    function updateFocus() {
        buttons.forEach((btn, index) => {
            if (btn) {
                if (index === currentButtonIndex) {
                    btn.style.boxShadow = '0 0 0 2px #0078d4';
                    btn.style.outline = '2px solid #0078d4';
                    btn.focus();
                    console.log(`🚪 Focus set to button ${index}: ${btn.textContent}`);
                } else {
                    btn.style.boxShadow = 'none';
                    btn.style.outline = 'none';
                }
            }
        });
    }
    
    // 初期フォーカスを設定（少し遅延させる）
    setTimeout(() => {
        updateFocus();
        console.log('🚪 Initial focus set');
    }, 150);
    
    // ダイアログ終了処理
    function closeDialog(choice) {
        console.log('🚪 Closing dialog with choice:', choice);
        
        try {
            document.body.removeChild(dialogOverlay);
            document.removeEventListener('keydown', handleDialogKeyDown);
            
            // エディタにフォーカスを戻す
            setTimeout(() => {
                if (editor && editor.focus) {
                    editor.focus();
                    console.log('🚪 Focus returned to editor');
                }
            }, 100);
            
            resolve(choice);
            console.log('🚪 Dialog resolved with:', choice);
        } catch (closeError) {
            console.error('❌ Dialog close error:', closeError);
            resolve('cancel'); // エラー時はキャンセル扱い
        }
    }
    
    // キーボードイベントハンドラー
    function handleDialogKeyDown(e) {
        console.log('🚪 Dialog key pressed:', e.key);
        
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                updateFocus();
                break;
                
            case 'ArrowRight':
            case 'ArrowDown':
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey && e.key === 'Tab') {
                    currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                } else {
                    currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                }
                updateFocus();
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                console.log('🚪 Enter/Space pressed, choice:', returnValues[currentButtonIndex]);
                closeDialog(returnValues[currentButtonIndex]);
                break;
                
            case 'Escape':
                e.preventDefault();
                console.log('🚪 Escape pressed, cancelling');
                closeDialog('cancel');
                break;
        }
    }
    
    // ボタンクリックイベントの設定
    buttons.forEach((btn, index) => {
        if (btn) {
            btn.addEventListener('click', () => {
                console.log('🚪 Button clicked:', btn.textContent, returnValues[index]);
                closeDialog(returnValues[index]);
            });
        }
    });
    
    // マウスホバーでフォーカス更新
    buttons.forEach((btn, index) => {
        if (btn) {
            btn.addEventListener('mouseenter', () => {
                currentButtonIndex = index;
                updateFocus();
            });
        }
    });
    
    // キーボードイベントリスナーを追加
    document.addEventListener('keydown', handleDialogKeyDown);
    console.log('🚪 Keyboard event listener added');
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            console.log('🚪 Overlay clicked, cancelling');
            closeDialog('cancel');
        }
    });
    
    console.log('🚪 Dialog navigation setup complete');
}