/*
 * =====================================================
 * Vinsert Editor - フォント設定機能（行番号キャッシュクリア対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { t } from './locales.js';
import { closeAllMenus } from './menu-controller.js';
import { updateFontSizeDisplay, clearLineNumberCache, updateLineNumbers } from './ui-updater.js';

// フォント設定の管理
let fontSettings = {
    fontFamily: 'Consolas, Monaco, Courier New, monospace',
    fontSize: 14
};

// 利用可能なフォント一覧
const availableFonts = [
    { name: 'Consolas', value: 'Consolas, Monaco, Courier New, monospace' },
    { name: 'Monaco', value: 'Monaco, Consolas, Courier New, monospace' },
    { name: 'Courier New', value: 'Courier New, Consolas, Monaco, monospace' },
    { name: 'Source Code Pro', value: 'Source Code Pro, Consolas, Monaco, monospace' },
    { name: 'Fira Code', value: 'Fira Code, Consolas, Monaco, monospace' },
    { name: 'JetBrains Mono', value: 'JetBrains Mono, Consolas, Monaco, monospace' },
    { name: 'Roboto Mono', value: 'Roboto Mono, Consolas, Monaco, monospace' },
    { name: 'Ubuntu Mono', value: 'Ubuntu Mono, Consolas, Monaco, monospace' },
    { name: 'Menlo', value: 'Menlo, Consolas, Monaco, monospace' },
    { name: 'DejaVu Sans Mono', value: 'DejaVu Sans Mono, Consolas, Monaco, monospace' }
];

// フォントサイズの範囲
const fontSizeRange = {
    min: 8,
    max: 32,
    step: 1
};

/**
 * フォント設定をローカルストレージから読み込み
 */
export function loadFontSettings() {
    try {
        const saved = localStorage.getItem('sert-font-settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            fontSettings = { ...fontSettings, ...parsed };
            console.log('🎨 Font settings loaded:', fontSettings);
        }
    } catch (error) {
        console.warn('⚠️ Could not load font settings:', error);
    }
    
    // 設定をエディタに適用
    applyFontSettings();
}

/**
 * フォント設定をローカルストレージに保存
 */
export function saveFontSettings() {
    try {
        localStorage.setItem('sert-font-settings', JSON.stringify(fontSettings));
        console.log('💾 Font settings saved:', fontSettings);
    } catch (error) {
        console.warn('⚠️ Could not save font settings:', error);
    }
}

/**
 * フォント設定をエディタに適用
 */
export function applyFontSettings() {
    if (!editor) return;
    
    console.log('🎨 Applying font settings:', fontSettings);
    
    // エディタのフォント設定
    editor.style.fontFamily = fontSettings.fontFamily;
    editor.style.fontSize = `${fontSettings.fontSize}px`;
    
    // 行番号のフォント設定も更新
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.style.fontFamily = fontSettings.fontFamily;
        lineNumbers.style.fontSize = `${fontSettings.fontSize}px`;
    }
    
    // ステータスバーのフォント設定も更新
    const statusBarElements = document.querySelectorAll('.status-bar span');
    statusBarElements.forEach(element => {
        element.style.fontFamily = fontSettings.fontFamily;
    });
    
    // フォント設定が変わったので行番号のキャッシュをクリア
    console.log('📝 Clearing line number cache due to font change');
    clearLineNumberCache();
    
    // 行番号を再計算
    updateLineNumbers();
    
    // ステータスバーのフォントサイズ表示を更新
    updateFontSizeDisplay();
    
    console.log('✅ Font settings applied successfully');
}

/**
 * フォント設定ダイアログを表示
 */
export function showFontSettingsDialog() {
    console.log('🎨 Opening font settings dialog');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('font-settings-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createFontSettingsDialog();
}

/**
 * フォントサイズ直接指定ダイアログを表示
 */
export function showFontSizeInputDialog() {
    console.log('🎨 Opening font size input dialog');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('font-size-input-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createFontSizeInputDialog();
}

/**
 * フォントサイズ直接指定ダイアログの作成
 */
function createFontSizeInputDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'font-size-input-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay font-size-input-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog font-size-input-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('fonts.sizeInput.title')}</div>
        <div class="search-dialog-content">
            <div class="search-input-group">
                <label for="font-size-direct-input">${t('fonts.sizeInput.label')}</label>
                <div class="font-size-direct-controls">
                    <input type="number" 
                           id="font-size-direct-input" 
                           class="search-input font-size-direct-input"
                           min="${fontSizeRange.min}" 
                           max="${fontSizeRange.max}" 
                           step="${fontSizeRange.step}" 
                           value="${fontSettings.fontSize}"
                           placeholder="${t('fonts.sizeInput.placeholder')}">
                    <span class="font-size-unit">px</span>
                </div>
                <div class="font-size-range-info">
                    ${t('fonts.sizeInput.rangeInfo', { min: fontSizeRange.min, max: fontSizeRange.max })}
                </div>
            </div>
            
            <div class="font-preview-section">
                <label>${t('fonts.preview')}</label>
                <div id="font-size-preview" class="font-preview">
                    ${t('fonts.previewText')}
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="font-size-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="font-size-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupFontSizeInputDialogEvents(dialogOverlay);
    updateFontSizePreview();
    
    // 数値入力フィールドにフォーカスを設定
    setTimeout(() => {
        const fontSizeInput = document.getElementById('font-size-direct-input');
        if (fontSizeInput) {
            fontSizeInput.focus();
            fontSizeInput.select();
        }
    }, 100);
}

/**
 * フォントサイズ直接入力ダイアログのイベント設定
 */
function setupFontSizeInputDialogEvents(dialogOverlay) {
    const fontSizeInput = document.getElementById('font-size-direct-input');
    const applyBtn = document.getElementById('font-size-apply-btn');
    const cancelBtn = document.getElementById('font-size-cancel-btn');
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { ...fontSettings };
    
    // フォントサイズ変更時のプレビュー更新
    fontSizeInput.addEventListener('input', () => {
        const size = parseInt(fontSizeInput.value);
        if (size >= fontSizeRange.min && size <= fontSizeRange.max) {
            fontSettings.fontSize = size;
            updateFontSizePreview();
        }
    });
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const size = parseInt(fontSizeInput.value);
        if (size >= fontSizeRange.min && size <= fontSizeRange.max) {
            fontSettings.fontSize = size;
            applyFontSettings();
            saveFontSettings();
            closeFontSizeInputDialog(dialogOverlay);
            console.log('✅ Font size applied:', size);
        } else {
            alert(t('fonts.sizeInput.invalidRange', { min: fontSizeRange.min, max: fontSizeRange.max }));
        }
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        fontSettings = originalSettings;
        closeFontSizeInputDialog(dialogOverlay);
        console.log('❌ Font size input cancelled');
    });
    
    // Enterキーで適用
    fontSizeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyBtn.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelBtn.click();
        }
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            fontSettings = originalSettings;
            closeFontSizeInputDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            fontSettings = originalSettings;
            closeFontSizeInputDialog(dialogOverlay);
        }
    });
    
    // ダイアログクリーンアップ時にイベントリスナーを削除
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * フォントサイズプレビューを更新
 */
function updateFontSizePreview() {
    const preview = document.getElementById('font-size-preview');
    if (preview) {
        preview.style.fontFamily = fontSettings.fontFamily;
        preview.style.fontSize = `${fontSettings.fontSize}px`;
    }
}

/**
 * フォントサイズ入力ダイアログを閉じる
 */
function closeFontSizeInputDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing font size input dialog:', error);
    }
}

/**
 * フォント設定ダイアログの作成
 */
function createFontSettingsDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'font-settings-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay font-settings-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog font-settings-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('fonts.title')}</div>
        <div class="search-dialog-content">
            <div class="font-settings-section">
                <div class="search-input-group">
                    <label for="font-family-select">${t('fonts.fontFamily')}</label>
                    <select id="font-family-select" class="font-select">
                        ${availableFonts.map(font => 
                            `<option value="${font.value}" ${font.value === fontSettings.fontFamily ? 'selected' : ''}>
                                ${font.name}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                
                <div class="search-input-group">
                    <label for="font-size-input">${t('fonts.fontSize')}</label>
                    <div class="font-size-controls">
                        <input type="range" 
                               id="font-size-range" 
                               min="${fontSizeRange.min}" 
                               max="${fontSizeRange.max}" 
                               step="${fontSizeRange.step}" 
                               value="${fontSettings.fontSize}"
                               class="font-size-slider">
                        <input type="number" 
                               id="font-size-input" 
                               min="${fontSizeRange.min}" 
                               max="${fontSizeRange.max}" 
                               step="${fontSizeRange.step}" 
                               value="${fontSettings.fontSize}"
                               class="font-size-number">
                        <span class="font-size-unit">px</span>
                    </div>
                </div>
                
                <div class="font-preview-section">
                    <label>${t('fonts.preview')}</label>
                    <div id="font-preview" class="font-preview">
                        ${t('fonts.previewText')}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="font-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="font-reset-btn" class="search-button">${t('fonts.buttons.reset')}</button>
                <button id="font-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupFontSettingsDialogEvents(dialogOverlay);
    updateFontPreview();
    
    // フォントセレクトにフォーカスを設定
    setTimeout(() => {
        const fontSelect = document.getElementById('font-family-select');
        if (fontSelect) {
            fontSelect.focus();
        }
    }, 100);
}

/**
 * フォント設定ダイアログのイベント設定
 */
function setupFontSettingsDialogEvents(dialogOverlay) {
    const fontSelect = document.getElementById('font-family-select');
    const fontSizeRange = document.getElementById('font-size-range');
    const fontSizeInput = document.getElementById('font-size-input');
    const applyBtn = document.getElementById('font-apply-btn');
    const resetBtn = document.getElementById('font-reset-btn');
    const cancelBtn = document.getElementById('font-cancel-btn');
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { ...fontSettings };
    
    // フォントファミリ変更
    fontSelect.addEventListener('change', () => {
        fontSettings.fontFamily = fontSelect.value;
        updateFontPreview();
    });
    
    // フォントサイズ変更（スライダー）
    fontSizeRange.addEventListener('input', () => {
        const size = parseInt(fontSizeRange.value);
        fontSettings.fontSize = size;
        fontSizeInput.value = size;
        updateFontPreview();
    });
    
    // フォントサイズ変更（数値入力）
    fontSizeInput.addEventListener('input', () => {
        const size = parseInt(fontSizeInput.value);
        if (size >= fontSizeRange.min && size <= fontSizeRange.max) {
            fontSettings.fontSize = size;
            fontSizeRange.value = size;
            updateFontPreview();
        }
    });
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        applyFontSettings();
        saveFontSettings();
        closeFontSettingsDialog(dialogOverlay);
        console.log('✅ Font settings applied and saved');
    });
    
    // リセットボタン
    resetBtn.addEventListener('click', () => {
        if (confirm(t('fonts.messages.resetConfirm'))) {
            // デフォルト設定に戻す
            fontSettings.fontFamily = 'Consolas, Monaco, Courier New, monospace';
            fontSettings.fontSize = 14;
            
            // UIを更新
            fontSelect.value = fontSettings.fontFamily;
            fontSizeRange.value = fontSettings.fontSize;
            fontSizeInput.value = fontSettings.fontSize;
            
            updateFontPreview();
            console.log('🔄 Font settings reset to defaults');
        }
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        fontSettings = originalSettings;
        closeFontSettingsDialog(dialogOverlay);
        console.log('❌ Font settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            fontSettings = originalSettings;
            closeFontSettingsDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            fontSettings = originalSettings;
            closeFontSettingsDialog(dialogOverlay);
        }
    });
    
    // ダイアログクリーンアップ時にイベントリスナーを削除
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * フォントプレビューを更新
 */
function updateFontPreview() {
    const preview = document.getElementById('font-preview');
    if (preview) {
        preview.style.fontFamily = fontSettings.fontFamily;
        preview.style.fontSize = `${fontSettings.fontSize}px`;
    }
}

/**
 * フォント設定ダイアログを閉じる
 */
function closeFontSettingsDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing font settings dialog:', error);
    }
}

/**
 * 現在のフォント設定を取得
 */
export function getCurrentFontSettings() {
    return { ...fontSettings };
}

/**
 * フォント設定を設定
 */
export function setFontSettings(newSettings) {
    fontSettings = { ...fontSettings, ...newSettings };
    applyFontSettings();
    saveFontSettings();
}

/**
 * フォントサイズを増加
 */
export function increaseFontSize() {
    if (fontSettings.fontSize < fontSizeRange.max) {
        fontSettings.fontSize += 1;
        applyFontSettings();
        saveFontSettings();
        console.log('🔍 Font size increased to:', fontSettings.fontSize);
    }
}

/**
 * フォントサイズを減少
 */
export function decreaseFontSize() {
    if (fontSettings.fontSize > fontSizeRange.min) {
        fontSettings.fontSize -= 1;
        applyFontSettings();
        saveFontSettings();
        console.log('🔍 Font size decreased to:', fontSettings.fontSize);
    }
}