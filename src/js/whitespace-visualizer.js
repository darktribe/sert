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
 * 空白文字可視化設定を初期化
 */
export function initializeWhitespaceVisualization() {
    console.log('👁️ Initializing whitespace visualization...');
    
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
}

/**
 * マーカーコンテナを作成
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
    `;
    
    // エディタのスクロール位置と同期するためのスタイル
    markersContainer.style.transform = 'translateZ(0)'; // ハードウェアアクセラレーション
    
    editorContainer.appendChild(markersContainer);
    console.log('✅ Whitespace markers container created');
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
 * 実際のマーカー更新処理（タイプライターモード対応版）
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
        let paddingLeft = parseFloat(computedStyle.paddingLeft);
        let paddingTop = parseFloat(computedStyle.paddingTop);
        
        // タイプライターモードの検出とpadding調整
        const isTypewriterMode = paddingTop > 20;
        if (isTypewriterMode) {
            console.log('👁️ Typewriter mode detected, adjusting calculations');
        }
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // フォントメトリクス計算用のキャンバス
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${fontSize}px ${computedStyle.fontFamily}`;
        
        // 文字幅の計算
        const spaceWidth = context.measureText(' ').width;
        const tabStopWidth = spaceWidth * 4; // タブストップは4文字ごと
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 表示可能範囲を計算
        const editorHeight = editor.clientHeight;
        const effectiveTop = isTypewriterMode ? scrollTop - paddingTop + 20 : scrollTop;
        const effectiveHeight = editorHeight + (isTypewriterMode ? paddingTop * 2 : 0);
        
        const visibleStartLine = Math.max(0, Math.floor(effectiveTop / lineHeight) - 5);
        const visibleEndLine = Math.min(
            content.split('\n').length, 
            Math.ceil((effectiveTop + effectiveHeight) / lineHeight) + 5
        );
        
        console.log(`👁️ Visible range: ${visibleStartLine} to ${visibleEndLine}, scrollTop: ${scrollTop}`);
        
        // 行ごとに処理
        const lines = content.split('\n');
        let currentY = paddingTop;
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            // 表示範囲の判定
            if (lineIndex < visibleStartLine - 2 || lineIndex > visibleEndLine + 2) {
                currentY += lineHeight;
                continue;
            }
            
            const line = lines[lineIndex];
            let currentX = paddingLeft + lineNumbersWidth - scrollLeft;
            let columnPosition = 0; // 現在の列位置（0ベース）
            
            // 行内の各文字を処理（実際の表示幅ベースでのTab処理）
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                
                // 空白文字の種類を判定
                let markerType = null;
                let charWidth = 0;
                let displayWidth = 0; // 実際の表示幅
                
                if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
                    // 全角スペース
                    markerType = 'fullwidth-space';
                    displayWidth = context.measureText('\u3000').width;
                    charWidth = displayWidth;
                    columnPosition += 2; // 論理的には半角2文字分
                } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
                    // 半角スペース
                    markerType = 'halfwidth-space';
                    displayWidth = spaceWidth;
                    charWidth = displayWidth;
                    columnPosition += 1;
                } else if (char === '\t' && whitespaceVisualization.showTab) {
                    // タブ文字 - エディタの実際の動作に合わせる
                    markerType = 'tab';
                    
                    // 現在位置までの実際の表示幅を計算
                    const textBeforeTab = line.substring(0, charIndex);
                    const actualWidthBeforeTab = context.measureText(textBeforeTab).width;
                    
                    // 次のタブストップ位置を実際の表示幅で計算
                    const tabStopWidth = spaceWidth * 4; // 4文字分の幅
                    const nextTabStopWidth = Math.ceil((actualWidthBeforeTab + 1) / tabStopWidth) * tabStopWidth;
                    const tabWidth = nextTabStopWidth - actualWidthBeforeTab;
                    
                    // Tab装飾の幅をエディタの実際のTab幅に合わせる
                    displayWidth = tabWidth;
                    charWidth = displayWidth;
                    
                    // 論理的な列位置も更新（4文字ごと）
                    const nextTabStop = Math.floor((columnPosition + 4) / 4) * 4;
                    columnPosition = nextTabStop;
                    
                    console.log(`Tab: actual width before=${actualWidthBeforeTab}px, tab width=${tabWidth}px, logical position=${columnPosition}`);
                } else {
                    // 通常の文字
                    displayWidth = context.measureText(char).width;
                    charWidth = displayWidth;
                    
                    // 論理的な列位置を更新
                    if (char.charCodeAt(0) < 256) {
                        columnPosition += 1; // ASCII文字（半角）
                    } else {
                        columnPosition += 2; // 非ASCII文字（全角）= 半角2文字分
                    }
                }
                
                // マーカーを作成
                if (markerType) {
                    const absoluteY = currentY - scrollTop;
                    
                    // 画面内に表示される範囲のみマーカーを作成
                    if (absoluteY > -lineHeight && absoluteY < editorHeight + lineHeight) {
                        createWhitespaceMarker(markerType, currentX, absoluteY, charWidth, lineHeight);
                    }
                }
                
                currentX += charWidth;
            }
            
            currentY += lineHeight;
        }
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        console.error('Stack trace:', error.stack);
        removeAllMarkers();
    }
}

/**
 * 空白文字マーカーを作成（エラーハンドリング強化版）
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
        
        const marker = document.createElement('div');
        marker.className = `whitespace-marker whitespace-marker-${type}`;
        
        // 基本スタイル（位置はスクロールを考慮済み）
        marker.style.cssText = `
            position: absolute;
            left: ${Math.round(x)}px;
            top: ${Math.round(y)}px;
            width: ${Math.round(width)}px;
            height: ${Math.round(height)}px;
            pointer-events: none;
            z-index: 6;
            will-change: transform;
        `;
        
        // マーカータイプ別のスタイル
        switch (type) {
            case 'fullwidth-space':
                // 全角スペース: 対角線入りの四角（設定色使用）
                marker.style.backgroundColor = 'transparent';
                marker.style.border = `1px solid ${whitespaceVisualization.colors.fullWidthSpace}`;
                
                // SVGで対角線を描画
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                `;
                svg.setAttribute('viewBox', `0 0 ${Math.round(width)} ${Math.round(height)}`);
                
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line1.setAttribute('x1', '1');
                line1.setAttribute('y1', '1');
                line1.setAttribute('x2', (Math.round(width) - 1).toString());
                line1.setAttribute('y2', (Math.round(height) - 1).toString());
                line1.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line1.setAttribute('stroke-width', '1');
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (Math.round(width) - 1).toString());
                line2.setAttribute('y1', '1');
                line2.setAttribute('x2', '1');
                line2.setAttribute('y2', (Math.round(height) - 1).toString());
                line2.setAttribute('stroke', whitespaceVisualization.colors.fullWidthSpace);
                line2.setAttribute('stroke-width', '1');
                
                svg.appendChild(line1);
                svg.appendChild(line2);
                marker.appendChild(svg);
                break;
                
                case 'halfwidth-space':
                    // 半角スペース: 薄い枠と中央の点
                    marker.style.backgroundColor = 'transparent';
                    marker.style.border = `2px solid ${whitespaceVisualization.colors.halfWidthSpace}80`; // 25%透明度
                    marker.style.boxSizing = 'border-box';
                    marker.style.opacity = '0.6';
    
                // 中央の点
                    const halfwidthDot = document.createElement('div');
                    halfwidthDot.style.cssText = `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        width: 2px;
                        height: 2px;
                        background-color: ${whitespaceVisualization.colors.halfWidthSpace};
                        border-radius: 50%;
                        transform: translate(-50%, -50%);
                    `;
                    marker.appendChild(halfwidthDot);
                    break;
                
                    case 'tab':
                        // タブ文字: 矢印マーク（設定色使用）- 常に4文字分の幅
                        const tabColor = whitespaceVisualization.colors.tab;
                        const tabColorAlpha = tabColor + '1A'; // 10%透明度
                        const tabColorBorder = tabColor + '80'; // 50%透明度
                        
                        marker.style.backgroundColor = tabColorAlpha;
                        marker.style.borderBottom = `1px solid ${tabColorBorder}`;
                        marker.style.boxSizing = 'border-box';
                        
                        const tabArrow = document.createElement('div');
                        tabArrow.style.cssText = `
                            position: absolute;
                            top: 50%;
                            left: 2px;
                            color: ${tabColor};
                            font-size: ${Math.max(8, Math.round(height * 0.4))}px;
                            line-height: 1;
                            transform: translateY(-50%);
                            font-family: monospace;
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
 * スクロール時のマーカー更新（即座同期版）
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
    
    // スクロール時は即座に更新（遅延なし）
    try {
        performWhitespaceMarkersUpdate();
        console.log('👁️ Whitespace markers updated on scroll (immediate)');
    } catch (error) {
        console.error('❌ Error updating whitespace markers on scroll:', error);
        
        // エラー時はマーカーを一度クリアして即座に再試行
        removeAllMarkers();
        try {
            performWhitespaceMarkersUpdate();
        } catch (retryError) {
            console.error('❌ Immediate retry also failed:', retryError);
        }
    } finally {
        updateScheduled = false;
    }
}

/**
 * 空白文字可視化設定ダイアログを表示
 */
export function showWhitespaceVisualizationDialog() {
    console.log('👁️ Opening whitespace visualization settings');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('whitespace-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createWhitespaceVisualizationDialog();
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
                
                <div class="whitespace-color-settings">
                    <h4 style="margin: 16px 0 12px 0; color: #cccccc;">色設定 / Color Settings</h4>
                    
                    <div class="color-setting-group">
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">全角スペース:</label>
                                <input type="color" id="ws-fullwidth-color" value="${whitespaceVisualization.colors.fullWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-fullwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-fullwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-fullwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">半角スペース:</label>
                                <input type="color" id="ws-halfwidth-color" value="${whitespaceVisualization.colors.halfWidthSpace}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-halfwidth-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-halfwidth-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-halfwidth-b" min="0" max="255" class="rgb-input">
                            </div>
                        </div>
                        
                        <div class="color-setting-row">
                            <div>
                                <label style="display: inline-block; width: 100px;">タブ:</label>
                                <input type="color" id="ws-tab-color" value="${whitespaceVisualization.colors.tab}">
                            </div>
                            <div class="rgb-inputs">
                                <span>R:</span><input type="number" id="ws-tab-r" min="0" max="255" class="rgb-input">
                                <span>G:</span><input type="number" id="ws-tab-g" min="0" max="255" class="rgb-input">
                                <span>B:</span><input type="number" id="ws-tab-b" min="0" max="255" class="rgb-input">
                            </div>
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
    const applyBtn = document.getElementById('whitespace-apply-btn');
    const cancelBtn = document.getElementById('whitespace-cancel-btn');
    
    // 色設定要素を取得
    const fullwidthColorPicker = document.getElementById('ws-fullwidth-color');
    const halfwidthColorPicker = document.getElementById('ws-halfwidth-color');
    const tabColorPicker = document.getElementById('ws-tab-color');
    
    // RGB入力要素を取得
    const fullwidthRGB = {
        r: document.getElementById('ws-fullwidth-r'),
        g: document.getElementById('ws-fullwidth-g'),
        b: document.getElementById('ws-fullwidth-b')
    };
    const halfwidthRGB = {
        r: document.getElementById('ws-halfwidth-r'),
        g: document.getElementById('ws-halfwidth-g'),
        b: document.getElementById('ws-halfwidth-b')
    };
    const tabRGB = {
        r: document.getElementById('ws-tab-r'),
        g: document.getElementById('ws-tab-g'),
        b: document.getElementById('ws-tab-b')
    };
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { 
        ...whitespaceVisualization,
        colors: { ...whitespaceVisualization.colors }
    };
    
    // 色とRGB入力の初期化と連動設定
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    function setupColorSync(colorPicker, rgbInputs) {
        // 初期値設定
        const initialRgb = hexToRgb(colorPicker.value);
        if (initialRgb) {
            rgbInputs.r.value = initialRgb.r;
            rgbInputs.g.value = initialRgb.g;
            rgbInputs.b.value = initialRgb.b;
        }
        
        // カラーピッカーからRGB入力へ
        colorPicker.addEventListener('input', () => {
            const rgb = hexToRgb(colorPicker.value);
            if (rgb) {
                rgbInputs.r.value = rgb.r;
                rgbInputs.g.value = rgb.g;
                rgbInputs.b.value = rgb.b;
            }
        });
        
        // RGB入力からカラーピッカーへ
        [rgbInputs.r, rgbInputs.g, rgbInputs.b].forEach(input => {
            input.addEventListener('input', () => {
                const r = parseInt(rgbInputs.r.value) || 0;
                const g = parseInt(rgbInputs.g.value) || 0;
                const b = parseInt(rgbInputs.b.value) || 0;
                colorPicker.value = rgbToHex(
                    Math.max(0, Math.min(255, r)),
                    Math.max(0, Math.min(255, g)),
                    Math.max(0, Math.min(255, b))
                );
            });
        });
    }
    
    // 各色設定の連動を設定
    setupColorSync(fullwidthColorPicker, fullwidthRGB);
    setupColorSync(halfwidthColorPicker, halfwidthRGB);
    setupColorSync(tabColorPicker, tabRGB);
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        const newSettings = {
            enabled: enableCheckbox.checked,
            showFullWidthSpace: true,   // 常に有効
            showHalfWidthSpace: true,   // 常に有効  
            showTab: true,              // 常に有効
            colors: {
                fullWidthSpace: fullwidthColorPicker.value,
                halfWidthSpace: halfwidthColorPicker.value,
                tab: tabColorPicker.value
            }
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