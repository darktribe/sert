/*
 * =====================================================
 * Vinsert Editor - 空白文字可視化機能
 * =====================================================
 */

import { 
    editor, 
    whitespaceVisualization, 
    setWhitespaceVisualization 
} from './globals.js';
import { closeAllMenus } from './menu-controller.js';
import { t } from './locales.js';

// 空白文字可視化の色設定
let whitespaceColors = {
    halfWidthSpace: { r: 128, g: 128, b: 128, a: 0.6 },  // デフォルト: グレー
    fullWidthSpace: { r: 100, g: 150, b: 255, a: 0.8 },  // デフォルト: 青
    tab: { r: 255, g: 165, b: 0, a: 0.7 }                // デフォルト: オレンジ
};

/**
 * 空白文字の色設定を更新
 */
function updateWhitespaceColors(colors) {
    whitespaceColors = { ...whitespaceColors, ...colors };
    // ローカルストレージに保存
    try {
        localStorage.setItem('vinsert-whitespace-colors', JSON.stringify(whitespaceColors));
        console.log('💾 Whitespace colors saved:', whitespaceColors);
    } catch (error) {
        console.warn('⚠️ Could not save whitespace colors:', error);
    }
}

/**
 * 空白文字の色設定を読み込み
 */
function loadWhitespaceColors() {
    try {
        const saved = localStorage.getItem('vinsert-whitespace-colors');
        if (saved) {
            const parsed = JSON.parse(saved);
            whitespaceColors = { ...whitespaceColors, ...parsed };
            console.log('📂 Whitespace colors loaded:', whitespaceColors);
        }
    } catch (error) {
        console.warn('⚠️ Could not load whitespace colors:', error);
    }
}

/**
 * RGBA色文字列を生成
 */
function getRGBA(colorObj) {
    return `rgba(${colorObj.r}, ${colorObj.g}, ${colorObj.b}, ${colorObj.a})`;
}

// 可視化マーカーのコンテナ
let markersContainer = null;
let updateScheduled = false;

/**
 * 空白文字可視化のオン・オフを切り替える
 */
export function toggleWhitespaceVisualization() {
    const newState = !whitespaceVisualization.enabled;
    setWhitespaceVisualization({ enabled: newState });
    
    // メニューアイテムのチェック状態を更新
    updateWhitespaceVisualizationMenuState(newState);
    
    if (!newState) {
        // 可視化を無効にした場合は、既存のマーカーを削除
        removeAllMarkers();
    } else {
        // 可視化を有効にした場合は、マーカーを表示
        updateWhitespaceMarkers();
    }
    
    closeAllMenus();
    
    console.log(`👁️ Whitespace visualization ${newState ? 'enabled' : 'disabled'}`);
}

/**
 * メニューアイテムのチェック状態を更新
 */
export function updateWhitespaceVisualizationMenuState(enabled) {
    const menuOption = document.getElementById('whitespace-visualization-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = enabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 空白文字可視化設定を初期化（色設定対応版）
 */
export function initializeWhitespaceVisualization() {
    console.log('👁️ Initializing whitespace visualization...');
    
    // 色設定を読み込み
    loadWhitespaceColors();
    
    // マーカーコンテナを作成
    createMarkersContainer();
    
    // メニューの初期状態を設定
    updateWhitespaceVisualizationMenuState(whitespaceVisualization.enabled);
    
    // 可視化が有効な場合は初期マーカーを設定
    if (whitespaceVisualization.enabled) {
        setTimeout(() => {
            updateWhitespaceMarkers();
        }, 100);
    }
    
    console.log('✅ Whitespace visualization initialized:', whitespaceVisualization);
    console.log('🎨 Whitespace colors:', whitespaceColors);
}

/**
 * マーカーコンテナを作成（スクロール同期版）
 */
function createMarkersContainer() {
    if (markersContainer) {
        return;
    }
    
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) {
        console.error('❌ Editor container not found for whitespace markers');
        return;
    }
    
    markersContainer = document.createElement('div');
    markersContainer.className = 'whitespace-markers-container';
    markersContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 5;
        overflow: hidden;
        will-change: transform;
    `;
    
    editorContainer.appendChild(markersContainer);
    
    // エディタのスクロールと同期
    if (editor) {
        const syncScroll = () => {
            if (markersContainer) {
                markersContainer.scrollTop = editor.scrollTop;
                markersContainer.scrollLeft = editor.scrollLeft;
            }
        };
        
        // スクロールイベントリスナーを追加
        editor.addEventListener('scroll', syncScroll);
        
        // 初期同期
        syncScroll();
    }
    
    console.log('✅ Whitespace markers container created with scroll sync');
}

/**
 * すべてのマーカーを削除
 */
function removeAllMarkers() {
    if (markersContainer) {
        markersContainer.innerHTML = '';
    }
}

/**
 * 空白文字マーカーを更新
 */
export function updateWhitespaceMarkers() {
    // 可視化が無効な場合は何もしない
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 重複する更新リクエストを防ぐ
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // 次のフレームで実行（パフォーマンス最適化）
    requestAnimationFrame(() => {
        try {
            performWhitespaceMarkersUpdate();
        } catch (error) {
            console.error('❌ Error updating whitespace markers:', error);
        } finally {
            updateScheduled = false;
        }
    });
}

/**
 * 実際のマーカー更新処理（座標計算完全修正版）
 */
function performWhitespaceMarkersUpdate() {
    // 既存のマーカーをクリア
    removeAllMarkers();
    
    const content = editor.value;
    if (!content) {
        return;
    }
    
    try {
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // フォントメトリクス計算用のキャンバス
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${computedStyle.fontFamily}`;
        
        // 文字幅の計算
        const spaceWidth = context.measureText(' ').width;
        const tabWidth = spaceWidth * 4; // タブは4スペース分
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 表示可能範囲を計算（最適化のため）
        const editorHeight = editor.clientHeight;
        const visibleStartLine = Math.max(0, Math.floor(scrollTop / lineHeight) - 3);
        const visibleEndLine = Math.min(
            content.split('\n').length, 
            Math.ceil((scrollTop + editorHeight) / lineHeight) + 3
        );
        
        console.log(`👁️ Visible range: ${visibleStartLine} to ${visibleEndLine}, scrollTop: ${scrollTop}`);
        
        // マーカーコンテナをスクロールと同期
        if (markersContainer) {
            markersContainer.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
        }
        
        // 行ごとに処理
        const lines = content.split('\n');
        let currentY = paddingTop; // エディタコンテンツ内の絶対Y座標
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            // 表示範囲外はスキップ（最適化）
            if (lineIndex < visibleStartLine || lineIndex > visibleEndLine) {
                currentY += lineHeight;
                continue;
            }
            
            const line = lines[lineIndex];
            let currentX = paddingLeft + lineNumbersWidth; // エディタコンテンツ内の絶対X座標
            
            // 行内の各文字を処理
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                
                // 空白文字の種類を判定
                let markerType = null;
                let charWidth = 0;
                
                if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
                    // 全角スペース
                    markerType = 'fullwidth-space';
                    charWidth = context.measureText('\u3000').width;
                } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
                    // 半角スペース
                    markerType = 'halfwidth-space';
                    charWidth = spaceWidth;
                } else if (char === '\t' && whitespaceVisualization.showTab) {
                    // タブ文字
                    markerType = 'tab';
                    charWidth = tabWidth;
                } else {
                    // 通常の文字
                    charWidth = context.measureText(char).width;
                }
                
                // マーカーを作成（エディタコンテンツ内の絶対座標で配置）
                if (markerType) {
                    createWhitespaceMarker(markerType, currentX, currentY, charWidth, lineHeight);
                }
                
                currentX += charWidth;
            }
            
            currentY += lineHeight;
        }
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        console.error('Stack trace:', error.stack);
        
        // エラー時は全マーカーを削除して状態をクリア
        removeAllMarkers();
    }
}

/**
 * 空白文字マーカーを作成（新デザイン・色設定対応版）
 */
function createWhitespaceMarker(type, x, y, width, height) {
    try {
        // 無効な値の検証
        if (!type || isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.warn('⚠️ Invalid marker parameters:', { type, x, y, width, height });
            return;
        }
        
        // コンテナが存在しない場合はスキップ
        if (!markersContainer || !markersContainer.parentNode) {
            console.warn('⚠️ Markers container not available');
            return;
        }
        
        // 色設定を取得
        const colors = getWhitespaceColors();
        
        const marker = document.createElement('div');
        marker.className = `whitespace-marker whitespace-marker-${type}`;
        
        // 基本スタイル（絶対座標で配置、スクロール位置は考慮しない）
        marker.style.cssText = `
            position: absolute;
            left: ${Math.round(x)}px;
            top: ${Math.round(y)}px;
            width: ${Math.round(width)}px;
            height: ${Math.round(height)}px;
            pointer-events: none;
            z-index: 6;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // マーカータイプ別のスタイル（新デザイン）
        switch (type) {
            case 'fullwidth-space':
                // 全角スペース: 対角線入りの四角
                marker.style.border = `1px solid ${colors.fullWidth}`;
                marker.style.backgroundColor = `${colors.fullWidth}20`; // 透明度0.125
                
                // 対角線を描画
                const diagonal1 = document.createElement('div');
                diagonal1.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 1px;
                    background: ${colors.fullWidth};
                    transform: rotate(45deg);
                    transform-origin: 0 0;
                `;
                
                const diagonal2 = document.createElement('div');
                diagonal2.style.cssText = `
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 100%;
                    height: 1px;
                    background: ${colors.fullWidth};
                    transform: rotate(-45deg);
                    transform-origin: 100% 0;
                `;
                
                marker.appendChild(diagonal1);
                marker.appendChild(diagonal2);
                break;
                
            case 'halfwidth-space':
                // 半角スペース: 四角で囲んだ点
                const dotSize = Math.min(width * 0.6, height * 0.4, 6);
                const dot = document.createElement('div');
                dot.style.cssText = `
                    width: ${dotSize}px;
                    height: ${dotSize}px;
                    background: ${colors.halfWidth};
                    border: 1px solid ${colors.halfWidth};
                    border-radius: 1px;
                `;
                
                // 四角の枠
                marker.style.border = `1px solid ${colors.halfWidth}40`; // 透明度0.25
                marker.style.backgroundColor = `${colors.halfWidth}10`; // 透明度0.0625
                
                marker.appendChild(dot);
                break;
                
            case 'tab':
                // タブ文字: 矢印マーク
                marker.style.backgroundColor = `${colors.tab}20`; // 透明度0.125
                marker.style.borderBottom = `1px solid ${colors.tab}`;
                
                const tabArrow = document.createElement('div');
                tabArrow.style.cssText = `
                    color: ${colors.tab};
                    font-size: ${Math.max(10, Math.round(height * 0.6))}px;
                    line-height: 1;
                    font-family: monospace;
                    font-weight: bold;
                    margin-left: 2px;
                `;
                tabArrow.textContent = '→';
                marker.appendChild(tabArrow);
                break;
                
            default:
                console.warn('⚠️ Unknown marker type:', type);
                return;
        }
        
        markersContainer.appendChild(marker);
        
    } catch (error) {
        console.error('❌ Error creating whitespace marker:', error, { type, x, y, width, height });
    }
}

/**
 * スクロール時のマーカー更新（タイプライターモード対応・安定版）
 */
export function updateWhitespaceMarkersOnScroll() {
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 重複する更新リクエストを防ぐ
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // スクロール時は少し遅延を入れて安定化
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            try {
                performWhitespaceMarkersUpdate();
                console.log('👁️ Whitespace markers updated on scroll');
            } catch (error) {
                console.error('❌ Error updating whitespace markers on scroll:', error);
                
                // エラー時はマーカーを一度クリアして次のフレームで再試行
                removeAllMarkers();
                setTimeout(() => {
                    try {
                        performWhitespaceMarkersUpdate();
                    } catch (retryError) {
                        console.error('❌ Retry also failed:', retryError);
                    }
                }, 100);
            } finally {
                updateScheduled = false;
            }
        });
    });
}

/**
 * 空白文字可視化設定ダイアログを表示（RGB色選択機能付き）
 */
export function showWhitespaceVisualizationDialog() {
    console.log('👁️ Opening enhanced whitespace visualization settings');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('whitespace-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createEnhancedWhitespaceVisualizationDialog();
}

/**
 * RGB色選択機能付き空白文字可視化設定ダイアログの作成
 */
function createEnhancedWhitespaceVisualizationDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'whitespace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay whitespace-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog whitespace-dialog enhanced-whitespace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('viewMenu.whitespaceSettings')}</div>
        <div class="search-dialog-content">
            <div class="whitespace-settings-section">
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-enable-checkbox" ${whitespaceVisualization.enabled ? 'checked' : ''}>
                        ${t('whitespace.enable')}
                    </label>
                </div>
                
                <div class="whitespace-type-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">${t('whitespace.typeSettings')}</h4>
                    
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-halfwidth-checkbox" ${whitespaceVisualization.showHalfWidthSpace ? 'checked' : ''}>
                        半角スペース（ ）- 四角で囲んだ点
                    </label>
                    
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-fullwidth-checkbox" ${whitespaceVisualization.showFullWidthSpace ? 'checked' : ''}>
                        全角スペース（　）- 対角線入りの四角
                    </label>
                    
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-tab-checkbox" ${whitespaceVisualization.showTab ? 'checked' : ''}>
                        タブ文字（→）- 矢印マーク
                    </label>
                </div>
                
                <div class="whitespace-color-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">色設定（RGB）</h4>
                    
                    <div class="color-setting-group">
                        <label>半角スペースの色:</label>
                        <div class="color-inputs">
                            <span>R:</span><input type="number" id="halfwidth-r" min="0" max="255" value="${whitespaceColors.halfWidthSpace.r}">
                            <span>G:</span><input type="number" id="halfwidth-g" min="0" max="255" value="${whitespaceColors.halfWidthSpace.g}">
                            <span>B:</span><input type="number" id="halfwidth-b" min="0" max="255" value="${whitespaceColors.halfWidthSpace.b}">
                            <span>透明度:</span><input type="range" id="halfwidth-a" min="0" max="1" step="0.1" value="${whitespaceColors.halfWidthSpace.a}">
                            <div class="color-preview" id="halfwidth-preview"></div>
                        </div>
                    </div>
                    
                    <div class="color-setting-group">
                        <label>全角スペースの色:</label>
                        <div class="color-inputs">
                            <span>R:</span><input type="number" id="fullwidth-r" min="0" max="255" value="${whitespaceColors.fullWidthSpace.r}">
                            <span>G:</span><input type="number" id="fullwidth-g" min="0" max="255" value="${whitespaceColors.fullWidthSpace.g}">
                            <span>B:</span><input type="number" id="fullwidth-b" min="0" max="255" value="${whitespaceColors.fullWidthSpace.b}">
                            <span>透明度:</span><input type="range" id="fullwidth-a" min="0" max="1" step="0.1" value="${whitespaceColors.fullWidthSpace.a}">
                            <div class="color-preview" id="fullwidth-preview"></div>
                        </div>
                    </div>
                    
                    <div class="color-setting-group">
                        <label>タブの色:</label>
                        <div class="color-inputs">
                            <span>R:</span><input type="number" id="tab-r" min="0" max="255" value="${whitespaceColors.tab.r}">
                            <span>G:</span><input type="number" id="tab-g" min="0" max="255" value="${whitespaceColors.tab.g}">
                            <span>B:</span><input type="number" id="tab-b" min="0" max="255" value="${whitespaceColors.tab.b}">
                            <span>透明度:</span><input type="range" id="tab-a" min="0" max="1" step="0.1" value="${whitespaceColors.tab.a}">
                            <div class="color-preview" id="tab-preview"></div>
                        </div>
                    </div>
                </div>
                
                <div class="whitespace-preview-section">
                    <label style="display: block; margin: 16px 0 8px 0; color: #cccccc;">${t('fonts.preview')}</label>
                    <div class="whitespace-preview">
function example() {
    console.log('Hello');　// 全角スペース
	return 42;    // タブ + 半角スペース
}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="whitespace-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="whitespace-reset-btn" class="search-button">${t('fonts.buttons.reset')}</button>
                <button id="whitespace-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupEnhancedWhitespaceVisualizationDialogEvents(dialogOverlay);
    
    // 初期色プレビューを更新
    updateColorPreviews();
    
    // 有効/無効チェックボックスにフォーカス
    setTimeout(() => {
        const enableCheckbox = document.getElementById('ws-enable-checkbox');
        if (enableCheckbox) {
            enableCheckbox.focus();
        }
    }, 100);
}

/**
 * 空白文字可視化設定ダイアログの作成
 */
function createWhitespaceVisualizationDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'whitespace-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay whitespace-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog whitespace-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('viewMenu.whitespaceSettings')}</div>
        <div class="search-dialog-content">
            <div class="whitespace-settings-section">
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-enable-checkbox" ${whitespaceVisualization.enabled ? 'checked' : ''}>
                        ${t('whitespace.enable')}
                    </label>
                </div>
                
                <div class="whitespace-type-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">${t('whitespace.typeSettings')}</h4>
                    
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-fullwidth-checkbox" ${whitespaceVisualization.showFullWidthSpace ? 'checked' : ''}>
                        ${t('whitespace.fullWidthSpace')}
                    </label>
                    
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-halfwidth-checkbox" ${whitespaceVisualization.showHalfWidthSpace ? 'checked' : ''}>
                        ${t('whitespace.halfWidthSpace')}
                    </label>
                    
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="ws-tab-checkbox" ${whitespaceVisualization.showTab ? 'checked' : ''}>
                        ${t('whitespace.tabCharacter')}
                    </label>
                </div>
                
                <div class="whitespace-preview-section">
                    <label style="display: block; margin: 16px 0 8px 0; color: #cccccc;">${t('fonts.preview')}</label>
                    <div class="whitespace-preview">
function example() {
    console.log('Hello');　// 全角スペース
	return 42;    // タブ + 半角スペース
}
                    </div>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="whitespace-apply-btn" class="search-button search-button-primary">${t('fonts.buttons.apply')}</button>
                <button id="whitespace-cancel-btn" class="search-button search-button-cancel">${t('fonts.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupWhitespaceVisualizationDialogEvents(dialogOverlay);
    
    // 有効/無効チェックボックスにフォーカス
    setTimeout(() => {
        const enableCheckbox = document.getElementById('ws-enable-checkbox');
        if (enableCheckbox) {
            enableCheckbox.focus();
        }
    }, 100);
}

/**
 * 空白文字可視化設定ダイアログのイベント設定
 */
function setupWhitespaceVisualizationDialogEvents(dialogOverlay) {
    const enableCheckbox = document.getElementById('ws-enable-checkbox');
    const fullwidthCheckbox = document.getElementById('ws-fullwidth-checkbox');
    const halfwidthCheckbox = document.getElementById('ws-halfwidth-checkbox');
    const tabCheckbox = document.getElementById('ws-tab-checkbox');
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { ...whitespaceVisualization };
    
    // 有効/無効チェックボックスの変更
    enableCheckbox.addEventListener('change', () => {
        const enabled = enableCheckbox.checked;
        fullwidthCheckbox.disabled = !enabled;
        halfwidthCheckbox.disabled = !enabled;
        tabCheckbox.disabled = !enabled;
        
        // 見た目の更新
        const typeSettings = document.querySelector('.whitespace-type-settings');
        if (typeSettings) {
            typeSettings.style.opacity = enabled ? '1' : '0.5';
        }
    });
    
    // 初期状態の設定
    enableCheckbox.dispatchEvent(new Event('change'));
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: fullwidthCheckbox.checked,
            showHalfWidthSpace: halfwidthCheckbox.checked,
            showTab: tabCheckbox.checked
        };
        
        setWhitespaceVisualization(newSettings);
        updateWhitespaceVisualizationMenuState(newSettings.enabled);
        
        if (newSettings.enabled) {
            updateWhitespaceMarkers();
        } else {
            removeAllMarkers();
        }
        
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('✅ Whitespace visualization settings applied:', newSettings);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        setWhitespaceVisualization(originalSettings);
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('❌ Whitespace visualization settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            setWhitespaceVisualization(originalSettings);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 色プレビューを更新
 */
function updateColorPreviews() {
    const types = ['halfwidth', 'fullwidth', 'tab'];
    
    types.forEach(type => {
        const r = document.getElementById(`${type}-r`).value;
        const g = document.getElementById(`${type}-g`).value;
        const b = document.getElementById(`${type}-b`).value;
        const a = document.getElementById(`${type}-a`).value;
        
        const preview = document.getElementById(`${type}-preview`);
        if (preview) {
            preview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
        }
    });
}

/**
 * 拡張空白文字可視化設定ダイアログのイベント設定
 */
function setupEnhancedWhitespaceVisualizationDialogEvents(dialogOverlay) {
    const enableCheckbox = document.getElementById('ws-enable-checkbox');
    const fullwidthCheckbox = document.getElementById('ws-fullwidth-checkbox');
    const halfwidthCheckbox = document.getElementById('ws-halfwidth-checkbox');
    const tabCheckbox = document.getElementById('ws-tab-checkbox');
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const resetBtn = document.getElementById('whitespace-reset-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { ...whitespaceVisualization };
    const originalColors = JSON.parse(JSON.stringify(whitespaceColors));
    
    // 有効/無効チェックボックスの変更
    enableCheckbox.addEventListener('change', () => {
        const enabled = enableCheckbox.checked;
        fullwidthCheckbox.disabled = !enabled;
        halfwidthCheckbox.disabled = !enabled;
        tabCheckbox.disabled = !enabled;
        
        // 色設定の有効/無効
        const colorInputs = document.querySelectorAll('.color-inputs input');
        colorInputs.forEach(input => input.disabled = !enabled);
        
        // 見た目の更新
        const typeSettings = document.querySelector('.whitespace-type-settings');
        const colorSettings = document.querySelector('.whitespace-color-settings');
        if (typeSettings) typeSettings.style.opacity = enabled ? '1' : '0.5';
        if (colorSettings) colorSettings.style.opacity = enabled ? '1' : '0.5';
    });
    
    // 色入力フィールドの変更イベント
    const colorInputs = document.querySelectorAll('.color-inputs input');
    colorInputs.forEach(input => {
        input.addEventListener('input', updateColorPreviews);
    });
    
    // リセットボタン
    resetBtn.addEventListener('click', () => {
        if (confirm('色設定をデフォルトに戻しますか？')) {
            // デフォルト色をフィールドに設定
            document.getElementById('halfwidth-r').value = 128;
            document.getElementById('halfwidth-g').value = 128;
            document.getElementById('halfwidth-b').value = 128;
            document.getElementById('halfwidth-a').value = 0.6;
            
            document.getElementById('fullwidth-r').value = 100;
            document.getElementById('fullwidth-g').value = 150;
            document.getElementById('fullwidth-b').value = 255;
            document.getElementById('fullwidth-a').value = 0.8;
            
            document.getElementById('tab-r').value = 255;
            document.getElementById('tab-g').value = 165;
            document.getElementById('tab-b').value = 0;
            document.getElementById('tab-a').value = 0.7;
            
            updateColorPreviews();
        }
    });
    
    // 初期状態の設定
    enableCheckbox.dispatchEvent(new Event('change'));
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: fullwidthCheckbox.checked,
            showHalfWidthSpace: halfwidthCheckbox.checked,
            showTab: tabCheckbox.checked
        };
        
        const newColors = {
            halfWidthSpace: {
                r: parseInt(document.getElementById('halfwidth-r').value),
                g: parseInt(document.getElementById('halfwidth-g').value),
                b: parseInt(document.getElementById('halfwidth-b').value),
                a: parseFloat(document.getElementById('halfwidth-a').value)
            },
            fullWidthSpace: {
                r: parseInt(document.getElementById('fullwidth-r').value),
                g: parseInt(document.getElementById('fullwidth-g').value),
                b: parseInt(document.getElementById('fullwidth-b').value),
                a: parseFloat(document.getElementById('fullwidth-a').value)
            },
            tab: {
                r: parseInt(document.getElementById('tab-r').value),
                g: parseInt(document.getElementById('tab-g').value),
                b: parseInt(document.getElementById('tab-b').value),
                a: parseFloat(document.getElementById('tab-a').value)
            }
        };
        
        setWhitespaceVisualization(newSettings);
        updateWhitespaceColors(newColors);
        updateWhitespaceVisualizationMenuState(newSettings.enabled);
        
        if (newSettings.enabled) {
            updateWhitespaceMarkers();
        } else {
            removeAllMarkers();
        }
        
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('✅ Enhanced whitespace visualization settings applied:', newSettings, newColors);
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        setWhitespaceVisualization(originalSettings);
        updateWhitespaceColors(originalColors);
        closeWhitespaceVisualizationDialog(dialogOverlay);
        console.log('❌ Enhanced whitespace visualization settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            setWhitespaceVisualization(originalSettings);
            updateWhitespaceColors(originalColors);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            setWhitespaceVisualization(originalSettings);
            updateWhitespaceColors(originalColors);
            closeWhitespaceVisualizationDialog(dialogOverlay);
        }
    });
    
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * 空白文字可視化設定ダイアログを閉じる
 */
function closeWhitespaceVisualizationDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing whitespace visualization dialog:', error);
    }
}