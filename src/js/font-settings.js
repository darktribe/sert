/*
 * =====================================================
 * Vinsert Editor - フォント設定機能（システムフォント検出対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { t } from './locales.js';
import { closeAllMenus } from './menu-controller.js';
import { updateFontSizeDisplay } from './ui-updater.js';
import { makeDraggable } from './dialog-utils.js';

// フォント設定の管理
let fontSettings = {
    fontFamily: 'Consolas, Monaco, Courier New, monospace',
    fontSize: 14
};

// 基本的なモノスペースフォント一覧（フォールバック用）
const fallbackFonts = [
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

// 検出対象のフォント名リスト（一般的なプログラミング用フォント）
const fontsToDetect = [
    // 一般的なモノスペースフォント
    'Consolas', 'Monaco', 'Courier New', 'Courier',
    
    // プログラミング用フォント
    'Source Code Pro', 'Fira Code', 'JetBrains Mono', 'Roboto Mono',
    'Ubuntu Mono', 'Menlo', 'DejaVu Sans Mono', 'Liberation Mono',
    'Inconsolata', 'Droid Sans Mono', 'Hack', 'Anonymous Pro',
    'PT Mono', 'Space Mono', 'IBM Plex Mono', 'Cascadia Code',
    'SF Mono', 'Operator Mono', 'Input Mono', 'Fantasque Sans Mono',
    'Victor Mono', 'Iosevka', 'Noto Sans Mono', 'Overpass Mono',
    
    // システムフォント
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Tahoma', 'Trebuchet MS', 'Comic Sans MS', 'Impact', 'Lucida Console',
    
    // macOS固有
    'Helvetica Neue', 'San Francisco', 'SF Pro Text', 'SF Pro Display',
    'New York', 'Avenir', 'Futura', 'Gill Sans', 'Optima',
    
    // Windows固有
    'Segoe UI', 'Calibri', 'Cambria', 'Candara', 'Corbel', 'Constantia',
    'Microsoft Sans Serif', 'Microsoft YaHei', 'Malgun Gothic',
    
    // Linux固有
    'Noto Sans', 'Noto Serif', 'Liberation Sans', 'Liberation Serif',
    'DejaVu Sans', 'DejaVu Serif', 'Ubuntu', 'Cantarell',
    
    // 日本語フォント
    'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', 'Meiryo',
    'MS Gothic', 'MS Mincho', 'Noto Sans CJK JP', 'Source Han Sans',
    'BIZ UDGothic', 'BIZ UDMincho',
    
    // その他
    'Comic Neue', 'Fira Sans', 'Open Sans', 'Lato', 'Montserrat',
    'Playfair Display', 'Oswald', 'Source Sans Pro'
];

// 検出されたフォントのキャッシュ
let detectedFonts = null;
let fontDetectionInProgress = false;

// フォントサイズの範囲
const fontSizeRange = {
    min: 8,
    max: 32,
    step: 1
};

/**
 * Canvas APIを使用してフォントの存在を検出
 */
function detectFont(fontName) {
    try {
        // Canvas要素を作成
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // テスト用の文字列
        const testString = 'abcdefghijklmnopqrstuvwxyz0123456789';
        const fontSize = '72px';
        
        // デフォルトフォントでの描画結果を取得
        context.font = `${fontSize} monospace`;
        const defaultWidth = context.measureText(testString).width;
        
        // 検査対象フォントでの描画結果を取得
        context.font = `${fontSize} "${fontName}", monospace`;
        const testWidth = context.measureText(testString).width;
        
        // 幅が異なればフォントが存在する
        const isAvailable = Math.abs(defaultWidth - testWidth) > 1;
        
        console.log(`Font detection: ${fontName} - ${isAvailable ? 'Available' : 'Not available'} (default: ${defaultWidth}px, test: ${testWidth}px)`);
        
        return isAvailable;
        
    } catch (error) {
        console.warn(`Font detection failed for ${fontName}:`, error);
        return false;
    }
}

/**
 * より精密なフォント検出（複数のテスト方法を組み合わせ）
 */
function detectFontPrecise(fontName) {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 複数のテスト文字列で検証
        const testStrings = [
            'The quick brown fox jumps over the lazy dog 1234567890',
            'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
            'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
            'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii'
        ];
        
        const fontSize = '48px';
        let matchCount = 0;
        
        for (const testString of testStrings) {
            // デフォルトフォント
            context.font = `${fontSize} serif`;
            const serifWidth = context.measureText(testString).width;
            
            context.font = `${fontSize} sans-serif`;
            const sansWidth = context.measureText(testString).width;
            
            context.font = `${fontSize} monospace`;
            const monoWidth = context.measureText(testString).width;
            
            // 検査対象フォント
            context.font = `${fontSize} "${fontName}", serif`;
            const testWidth = context.measureText(testString).width;
            
            // 3つのベースラインフォントと異なるかチェック
            const diffFromSerif = Math.abs(serifWidth - testWidth);
            const diffFromSans = Math.abs(sansWidth - testWidth);
            const diffFromMono = Math.abs(monoWidth - testWidth);
            
            const minDiff = 2; // 最小差異（ピクセル）
            
            if (diffFromSerif > minDiff || diffFromSans > minDiff || diffFromMono > minDiff) {
                matchCount++;
            }
        }
        
        // 半数以上のテストで差異が検出されればフォントが存在
        const isAvailable = matchCount >= testStrings.length / 2;
        
        console.log(`Precise font detection: ${fontName} - ${isAvailable ? 'Available' : 'Not available'} (matches: ${matchCount}/${testStrings.length})`);
        
        return isAvailable;
        
    } catch (error) {
        console.warn(`Precise font detection failed for ${fontName}:`, error);
        return false;
    }
}

/**
 * システムフォントを非同期で検出
 */
async function detectSystemFonts() {
    if (fontDetectionInProgress) {
        console.log('Font detection already in progress');
        return detectedFonts || fallbackFonts;
    }
    
    if (detectedFonts) {
        console.log('Using cached font detection results');
        return detectedFonts;
    }
    
    fontDetectionInProgress = true;
    console.log('🔍 Starting system font detection...');
    
    try {
        const availableFonts = [...fallbackFonts]; // フォールバックフォントを最初に追加
        const detectedFontNames = new Set(fallbackFonts.map(f => f.name));
        
        // 検出処理を分割して実行（UIブロックを防ぐ）
        const batchSize = 10;
        
        for (let i = 0; i < fontsToDetect.length; i += batchSize) {
            const batch = fontsToDetect.slice(i, i + batchSize);
            
            for (const fontName of batch) {
                if (detectedFontNames.has(fontName)) {
                    continue; // 既に追加済み
                }
                
                // より精密な検出を使用
                const isAvailable = detectFontPrecise(fontName);
                
                if (isAvailable) {
                    const fontValue = `"${fontName}", ${fontName.includes('Mono') ? 'monospace' : fontName.includes('Sans') ? 'sans-serif' : 'serif'}`;
                    availableFonts.push({
                        name: fontName,
                        value: fontValue
                    });
                    detectedFontNames.add(fontName);
                    console.log(`✅ Added system font: ${fontName}`);
                }
            }
            
            // UIブロックを防ぐため少し待機
            if (i + batchSize < fontsToDetect.length) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
        // 名前でソート（フォールバックフォントは最初に保持）
        const fallbackCount = fallbackFonts.length;
        const detectedSystemFonts = availableFonts.slice(fallbackCount);
        detectedSystemFonts.sort((a, b) => a.name.localeCompare(b.name));
        
        detectedFonts = [
            ...availableFonts.slice(0, fallbackCount),
            ...detectedSystemFonts
        ];
        
        console.log(`✅ Font detection completed. Found ${detectedFonts.length} fonts (${detectedFonts.length - fallbackCount} system fonts)`);
        
        return detectedFonts;
        
    } catch (error) {
        console.error('❌ Font detection failed:', error);
        detectedFonts = fallbackFonts;
        return fallbackFonts;
    } finally {
        fontDetectionInProgress = false;
    }
}

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
   
   // ステータスバーのフォントサイズ表示を更新
   updateFontSizeDisplay();

   // フォント適用後に少し遅延してタブサイズを更新（重要：改善版）
   setTimeout(() => {
       try {
           updateTabSizeForFont();
           console.log('✅ Tab size updated after font change');
           
           // 空白文字可視化も更新（フォント変更に追従）
           setTimeout(() => {
               try {
                   import('./whitespace-visualizer.js').then(module => {
                       if (module && module.updateWhitespaceMarkers && window.whitespaceVisualization?.enabled) {
                           module.updateWhitespaceMarkers();
                           console.log('✅ Whitespace markers updated after font change');
                       }
                   });
               } catch (error) {
                   console.warn('⚠️ Whitespace markers update failed after font change:', error);
               }
           }, 50);
           
       } catch (error) {
           console.warn('⚠️ Tab size update failed after font change:', error);
       }
   }, 150); // フォント適用の完了を待つ
   
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
    // ダイアログをドラッグ可能にする
    makeDraggable(dialog);
    
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
 * フォント設定ダイアログの作成（システムフォント検出対応版）
 */
async function createFontSettingsDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'font-settings-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay font-settings-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog font-settings-dialog';
    
    // 初期ローディング状態のHTML
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('fonts.title')}</div>
        <div class="search-dialog-content">
            <div class="font-settings-section">
                <div class="search-input-group">
                    <label for="font-family-select">${t('fonts.fontFamily')}</label>
                    <select id="font-family-select" class="font-select" disabled>
                        <option>🔍 システムフォントを検出中...</option>
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
    // ダイアログをドラッグ可能にする
    makeDraggable(dialog);
    
    // フォント検出を開始
    console.log('🔍 Starting font detection for dialog...');
    const availableFonts = await detectSystemFonts();
    
    // セレクトボックスを更新
    const fontSelect = document.getElementById('font-family-select');
    if (fontSelect) {
        fontSelect.innerHTML = '';
        fontSelect.disabled = false;
        
        availableFonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.value;
            option.textContent = font.name;
            option.selected = font.value === fontSettings.fontFamily;
            fontSelect.appendChild(option);
        });
        
        console.log(`✅ Font select populated with ${availableFonts.length} fonts`);
    }
    
    setupFontSettingsDialogEvents(dialogOverlay);
    updateFontPreview();
    
    // フォントセレクトにフォーカスを設定
    setTimeout(() => {
        if (fontSelect && !fontSelect.disabled) {
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
    if (fontSelect) {
        fontSelect.addEventListener('change', () => {
            fontSettings.fontFamily = fontSelect.value;
            updateFontPreview();
        });
    }
    
    // フォントサイズ変更（スライダー）
    if (fontSizeRange) {
        fontSizeRange.addEventListener('input', () => {
            const size = parseInt(fontSizeRange.value);
            fontSettings.fontSize = size;
            if (fontSizeInput) fontSizeInput.value = size;
            updateFontPreview();
        });
    }
    
    // フォントサイズ変更（数値入力）
    if (fontSizeInput) {
        fontSizeInput.addEventListener('input', () => {
            const size = parseInt(fontSizeInput.value);
            if (size >= fontSizeRange.min && size <= fontSizeRange.max) {
                fontSettings.fontSize = size;
                if (fontSizeRange) fontSizeRange.value = size;
                updateFontPreview();
            }
        });
    }
    
    // 適用ボタン
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            applyFontSettings();
            saveFontSettings();
            closeFontSettingsDialog(dialogOverlay);
            console.log('✅ Font settings applied and saved');
        });
    }
    
    // リセットボタン
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm(t('fonts.messages.resetConfirm'))) {
                // デフォルト設定に戻す
                fontSettings.fontFamily = 'Consolas, Monaco, Courier New, monospace';
                fontSettings.fontSize = 14;
                
                // UIを更新
                if (fontSelect) fontSelect.value = fontSettings.fontFamily;
                if (fontSizeRange) fontSizeRange.value = fontSettings.fontSize;
                if (fontSizeInput) fontSizeInput.value = fontSettings.fontSize;
                
                updateFontPreview();
                console.log('🔄 Font settings reset to defaults');
            }
        });
    }
    
    // キャンセルボタン
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            // 元の設定に戻す
            fontSettings = originalSettings;
            closeFontSettingsDialog(dialogOverlay);
            console.log('❌ Font settings cancelled');
        });
    }
    
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
        // タブサイズも更新
        setTimeout(() => updateTabSizeForFont(), 50);
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
        // タブサイズも更新
        setTimeout(() => updateTabSizeForFont(), 50);
    }
}

/**
 * 検出されたフォント一覧を取得（デバッグ用）
 */
export function getDetectedFonts() {
    return detectedFonts || fallbackFonts;
}

/**
 * フォント検出を強制的に再実行
 */
export async function refreshFontDetection() {
    console.log('🔄 Refreshing font detection...');
    detectedFonts = null;
    fontDetectionInProgress = false;
    return await detectSystemFonts();
}



/**
 * Canvas APIを使用して現在のフォントの文字幅を測定
 */
function measureCharacterWidth() {
    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // 現在のエディタのフォント設定を取得
        const computedStyle = window.getComputedStyle(editor);
        const fontFamily = computedStyle.fontFamily;
        const fontSize = computedStyle.fontSize;
        
        // フォントを設定
        context.font = `${fontSize} ${fontFamily}`;
        
        // 複数の文字で平均幅を計算（より正確な測定）
        const testChars = ['m', 'i', 'w', 'l', '0', '1', 'A', 'a'];
        let totalWidth = 0;
        
        for (const char of testChars) {
            const metrics = context.measureText(char);
            totalWidth += metrics.width;
        }
        
        const averageWidth = totalWidth / testChars.length;
        
        console.log(`📏 Measured character width: ${averageWidth.toFixed(2)}px (font: ${fontSize} ${fontFamily})`);
        
        return averageWidth;
        
    } catch (error) {
        console.warn('⚠️ Character width measurement failed:', error);
        return null;
    }
}

/* CSSのtab-sizeプロパティを動的に更新（CSS変数使用版）*/
function updateCSSTabSize(tabSize) {
   try {
       // CSS変数を使用してグローバルに設定
       document.documentElement.style.setProperty('--dynamic-tab-size', tabSize);
       
       // 従来の方法もフォールバックとして保持
       if (editor) {
           editor.style.tabSize = tabSize;
           editor.style.MozTabSize = tabSize;
           editor.style.WebkitTabSize = tabSize;
           editor.style.OTabSize = tabSize;
       }
       
       const lineNumbers = document.getElementById('line-numbers');
       if (lineNumbers) {
           lineNumbers.style.tabSize = tabSize;
           lineNumbers.style.MozTabSize = tabSize;
           lineNumbers.style.WebkitTabSize = tabSize;
           lineNumbers.style.OTabSize = tabSize;
       }
       
       console.log(`📏 CSS tab-size updated to: ${tabSize}`);
       
   } catch (error) {
       console.warn('⚠️ Failed to update CSS tab-size:', error);
   }
}

/**
 * タブサイズを手動で設定（デバッグ用）
 */
export function setCustomTabSize(size) {
    const tabSize = Math.max(1, Math.min(16, parseInt(size) || 4));
    updateCSSTabSize(tabSize);
    console.log(`🔧 Manual tab size set to: ${tabSize}`);
}

/**
 * 現在のタブサイズを取得（デバッグ用）
 */
export function getCurrentTabSize() {
    if (!editor) return null;
    
    const computedStyle = window.getComputedStyle(editor);
    return computedStyle.tabSize || '4';
}

/**
 * 日本語フォント対応：フォントに基づいてタブサイズを動的に調整（高精度版）
 */
function updateTabSizeForFont() {
    if (!editor) return;
    
    try {
        console.log('📏 Calculating optimal tab size for current font (high precision)...');
        
        // 高精度フォントメトリクス測定
        const fontMetrics = measureAdvancedFontMetrics();
        if (!fontMetrics) {
            console.warn('⚠️ Font metrics measurement failed, using fallback');
            updateCSSTabSize(4);
            return;
        }
        
        // 最適なタブサイズを計算
        const optimalTabSize = calculateOptimalTabSizeAdvanced(fontMetrics);
        
        // CSSのtab-sizeを更新
        updateCSSTabSize(optimalTabSize);
        
        console.log(`📏 Tab size updated (advanced): ${optimalTabSize}`);
        console.log(`📏 Font metrics:`, fontMetrics);
        
    } catch (error) {
        console.warn('⚠️ Failed to update tab size:', error);
        // フォールバック: 日本語フォント用デフォルト
        const fontFamily = getComputedStyle(editor).fontFamily.toLowerCase();
        if (fontFamily.includes('yu gothic') || 
            fontFamily.includes('meiryo') || 
            fontFamily.includes('ms gothic') ||
            fontFamily.includes('hiragino')) {
            updateCSSTabSize(6);
        } else {
            updateCSSTabSize(4);
        }
    }
}

/**
 * 高精度フォントメトリクス測定
 */
function measureAdvancedFontMetrics() {
    if (!editor) return null;
    
    try {
        const computedStyle = window.getComputedStyle(editor);
        const fontSize = parseFloat(computedStyle.fontSize);
        const fontFamily = computedStyle.fontFamily;
        
        // Canvas設定
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${fontFamily}`;
        
        // 複数文字の幅を測定
        const spaceWidth = context.measureText(' ').width;
        const fullWidthSpaceWidth = context.measureText('\u3000').width;
        
        // ASCII文字の平均幅
        const asciiChars = ['m', 'i', 'w', 'l', '0', '1', 'A', 'a', 'x', 'M', 'W', 'g', 'j'];
        let totalAsciiWidth = 0;
        for (const char of asciiChars) {
            totalAsciiWidth += context.measureText(char).width;
        }
        const averageAsciiWidth = totalAsciiWidth / asciiChars.length;
        
        // 日本語文字のサンプル測定
        const japaneseChars = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'];
        let totalJapaneseWidth = 0;
        let japaneseCharCount = 0;
        for (const char of japaneseChars) {
            try {
                const width = context.measureText(char).width;
                if (width > 0) {
                    totalJapaneseWidth += width;
                    japaneseCharCount++;
                }
            } catch (e) {
                // 文字が利用できない場合はスキップ
            }
        }
        const averageJapaneseWidth = japaneseCharCount > 0 ? totalJapaneseWidth / japaneseCharCount : fullWidthSpaceWidth;
        
        // 幅比率を計算
        const spaceToFullSpaceRatio = spaceWidth / fullWidthSpaceWidth;
        const spaceToAverageRatio = spaceWidth / averageAsciiWidth;
        
        // フォント分類
        const isJapaneseFont = fontFamily.toLowerCase().includes('yu gothic') || 
                               fontFamily.toLowerCase().includes('meiryo') || 
                               fontFamily.toLowerCase().includes('ms gothic') ||
                               fontFamily.toLowerCase().includes('hiragino') ||
                               fontFamily.toLowerCase().includes('noto sans cjk');
        
        const isMonospace = Math.abs(context.measureText('i').width - context.measureText('W').width) < 1;
        
        return {
            spaceWidth,
            fullWidthSpaceWidth,
            averageAsciiWidth,
            averageJapaneseWidth,
            spaceToFullSpaceRatio,
            spaceToAverageRatio,
            isJapaneseFont,
            isMonospace,
            fontSize,
            fontFamily
        };
        
    } catch (error) {
        console.error('❌ Font metrics measurement error:', error);
        return null;
    }
}

/**
 * 高精度タブサイズ計算
 */
function calculateOptimalTabSizeAdvanced(metrics) {
    const {
        spaceWidth,
        fullWidthSpaceWidth,
        averageAsciiWidth,
        isJapaneseFont,
        isMonospace,
        spaceToFullSpaceRatio,
        fontSize
    } = metrics;
    
    let tabSize = 4; // デフォルト
    
    if (isJapaneseFont) {
        // 日本語フォント特有の調整
        if (fontSize >= 16) {
            tabSize = 8; // 大きいサイズでは広めに
        } else if (fontSize >= 14) {
            tabSize = 6; // 中サイズ
        } else {
            tabSize = 6; // 小サイズでも見やすく
        }
        
        // 半角と全角の比率による微調整
        if (spaceToFullSpaceRatio < 0.4) {
            tabSize += 1; // 全角が相対的に広い場合
        } else if (spaceToFullSpaceRatio > 0.6) {
            tabSize = Math.max(4, tabSize - 1); // 全角が相対的に狭い場合
        }
        
    } else if (isMonospace) {
        // 等幅フォント
        tabSize = 4;
        
        // フォントサイズによる調整
        if (fontSize <= 11) {
            tabSize = 4;
        } else if (fontSize >= 18) {
            tabSize = 4; // 大きくても4で統一
        }
        
    } else {
        // プロポーショナルフォント
        if (averageAsciiWidth / spaceWidth > 3) {
            tabSize = 6; // 文字幅が広い場合
        } else {
            tabSize = 4;
        }
    }
    
    // 最終的な範囲制限
    return Math.max(2, Math.min(16, Math.round(tabSize)));
}
