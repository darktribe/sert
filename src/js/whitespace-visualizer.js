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
import { getRealLogicalLinePositions } from './ui-updater.js';
import { makeDraggable } from './dialog-utils.js';

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
        will-change: transform;
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
    
    // 重複する更新リクエストを防ぐ（ただしフォント変更時は強制更新）
    if (updateScheduled) {
        return;
    }
    
    updateScheduled = true;
    
    // 次のフレームで実行
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
 * 実際のマーカー更新処理（修正版）
 */
function performWhitespaceMarkersUpdate() {
    // 既存のマーカーをクリア
    removeAllMarkers();
    
    const content = editor.value;
    if (!content) {
        return;
    }
    
    try {
        console.log('👁️ Starting whitespace markers update');
        
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        
        // 行番号エリアの幅を取得
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 実エディタでの文字幅測定
        const realMetrics = measureRealEditorMetrics();
        if (!realMetrics) {
            console.warn('⚠️ Real metrics is null, skipping whitespace visualization');
            return;
        }
        
        console.log('👁️ Real metrics:', realMetrics);
        
        // タイプライターモードの検出
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        
        // 行ごとに処理（論理行の正確な位置を使用）
        const lines = content.split('\n');
        
        // 論理行の正確な位置を計算
        const linePositions = calculateLogicalLinePositions(lines);
        
        console.log(`👁️ Processing ${lines.length} lines, typewriter mode: ${isTypewriterMode}`);
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const linePosition = linePositions[lineIndex];
            
            if (!linePosition) continue;
            
            // 表示位置を計算
            const displayY = linePosition.top - scrollTop;
            
            console.log(`👁️ Line ${lineIndex}: top=${linePosition.top}, displayY=${displayY}, height=${linePosition.height}`);
            
            // 表示範囲の判定
            if (displayY < -linePosition.height || displayY > editor.clientHeight + linePosition.height) {
                continue;
            }
            
            // 行内の文字を処理
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                let markerType = null;
                let charWidth = 0;
                let markerX = 0;
                let markerY = displayY;
                
                // 空白文字の種類を判定
                if (char === '\u3000' && whitespaceVisualization.showFullWidthSpace) {
                    markerType = 'fullwidth-space';
                    
                    // 文字の正確な位置を取得（折り返し対応）
                    const charPos = measureCharacterPosition(line, charIndex, linePosition.top);
                    markerX = paddingLeft + lineNumbersWidth + charPos.x - scrollLeft;
                    markerY = charPos.y - scrollTop;
                    charWidth = charPos.width || realMetrics.fullWidthSpaceWidth;
                    
                } else if (char === ' ' && whitespaceVisualization.showHalfWidthSpace) {
                    markerType = 'halfwidth-space';
                    
                    // 文字の正確な位置を取得（折り返し対応）
                    const charPos = measureCharacterPosition(line, charIndex, linePosition.top);
                    markerX = paddingLeft + lineNumbersWidth + charPos.x - scrollLeft;
                    markerY = charPos.y - scrollTop;
                    charWidth = charPos.width || realMetrics.halfWidthSpaceWidth;
                    
                } else if (char === '\t' && whitespaceVisualization.showTab) {
                    markerType = 'tab';
                    
                    // Tab文字の正確な位置を取得（折り返し対応）
                    const charPos = measureCharacterPosition(line, charIndex, linePosition.top);
                    markerX = paddingLeft + lineNumbersWidth + charPos.x - scrollLeft;
                    markerY = charPos.y - scrollTop;
                    charWidth = charPos.width || realMetrics.tabStopWidth;
                    
                    console.log(`👁️ Tab line ${lineIndex}: charIndex=${charIndex}, x=${charPos.x}, y=${charPos.y}, width=${charWidth}`);
                }
                
                // マーカーを作成
                if (markerType) {
                    // 画面内に表示される範囲のみマーカーを作成
                    if (markerX > -50 && markerX < editor.clientWidth + 50 &&
                        markerY > -50 && markerY < editor.clientHeight + 50) {
                        createWhitespaceMarker(markerType, markerX, markerY, charWidth, lineHeight);
                        console.log(`👁️ Created marker ${markerType} at line ${lineIndex}, x=${markerX}, y=${markerY}, width=${charWidth}`);
                    }
                }
            }
        }
        
        console.log('👁️ Whitespace markers update completed');
        
    } catch (error) {
        console.error('❌ Error in performWhitespaceMarkersUpdate:', error);
        removeAllMarkers();
    }
}

/**
 * 実エディタでの文字幅測定（DOM実測定方式）
 */
function measureRealEditorMetrics() {
    if (!editor) return null;
    
    let measurer = null;
    
    try {
        // 測定用の隠し要素を作成
        measurer = document.createElement('div');
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            pointer-events: none;
            white-space: pre;
            font-family: ${editor.style.fontFamily || getComputedStyle(editor).fontFamily};
            font-size: ${editor.style.fontSize || getComputedStyle(editor).fontSize};
            line-height: ${editor.style.lineHeight || getComputedStyle(editor).lineHeight};
            font-variant-numeric: ${getComputedStyle(editor).fontVariantNumeric};
            letter-spacing: ${getComputedStyle(editor).letterSpacing};
            word-spacing: ${getComputedStyle(editor).wordSpacing};
            tab-size: ${getComputedStyle(editor).tabSize};
            -moz-tab-size: ${getComputedStyle(editor).tabSize};
            -webkit-tab-size: ${getComputedStyle(editor).tabSize};
            -o-tab-size: ${getComputedStyle(editor).tabSize};
        `;
        
        document.body.appendChild(measurer);
        
        // 半角スペース幅を測定
        measurer.textContent = ' ';
        const halfWidthSpaceWidth = measurer.offsetWidth;
        
        // 全角スペース幅を測定
        measurer.textContent = '\u3000';
        const fullWidthSpaceWidth = measurer.offsetWidth;
        
        // タブ幅を実測定
        measurer.textContent = '\t';
        const singleTabWidth = measurer.offsetWidth;
        
        // 複数のタブで確認
        measurer.textContent = '\t\t';
        const doubleTabWidth = measurer.offsetWidth;
        
        // より正確なタブストップ幅を計算
        const tabStopWidth = singleTabWidth > 0 ? singleTabWidth : halfWidthSpaceWidth * 4;
        
        // ASCII文字の平均幅（参考用）
        const testChars = ['m', 'i', 'w', 'l', '0', '1', 'A', 'a'];
        let totalAsciiWidth = 0;
        for (const char of testChars) {
            measurer.textContent = char;
            totalAsciiWidth += measurer.offsetWidth;
        }
        const averageAsciiWidth = totalAsciiWidth / testChars.length;
        
        const metrics = {
            halfWidthSpaceWidth,
            fullWidthSpaceWidth,
            tabStopWidth,
            singleTabWidth,
            doubleTabWidth,
            averageAsciiWidth,
            spaceToFullSpaceRatio: halfWidthSpaceWidth / fullWidthSpaceWidth,
            isRealMeasurement: true
        };
        
        console.log('👁️ Real editor metrics:', metrics);
        return metrics;
        
    } catch (error) {
        console.error('❌ Real editor metrics measurement error:', error);
        
        // フォールバック: 推定値を返す
        const computedStyle = getComputedStyle(editor);
        const fontSize = parseFloat(computedStyle.fontSize);
        
        return {
            halfWidthSpaceWidth: fontSize * 0.5,
            fullWidthSpaceWidth: fontSize,
            tabStopWidth: fontSize * 2,
            singleTabWidth: fontSize * 2,
            doubleTabWidth: fontSize * 4,
            averageAsciiWidth: fontSize * 0.6,
            spaceToFullSpaceRatio: 0.5,
            isRealMeasurement: false
        };
    } finally {
        // 安全な削除処理
        if (measurer && measurer.parentNode) {
            try {
                document.body.removeChild(measurer);
            } catch (cleanupError) {
                console.warn('⚠️ Cleanup error (ignored):', cleanupError);
            }
        }
    }
}

/**
 * 実エディタでの個別文字幅測定
 */
function measureRealCharWidth(char, realMetrics) {
    if (char === ' ') {
        return realMetrics.halfWidthSpaceWidth;
    } else if (char === '\u3000') {
        return realMetrics.fullWidthSpaceWidth;
    } else {
        // その他の文字はDOM実測定
        try {
            const measurer = document.createElement('div');
            measurer.style.cssText = `
                position: absolute;
                top: -9999px;
                left: -9999px;
                visibility: hidden;
                pointer-events: none;
                white-space: pre;
                font-family: ${editor.style.fontFamily || getComputedStyle(editor).fontFamily};
                font-size: ${editor.style.fontSize || getComputedStyle(editor).fontSize};
                line-height: ${editor.style.lineHeight || getComputedStyle(editor).lineHeight};
                font-variant-numeric: ${getComputedStyle(editor).fontVariantNumeric};
                letter-spacing: ${getComputedStyle(editor).letterSpacing};
                word-spacing: ${getComputedStyle(editor).wordSpacing};
            `;
            
            document.body.appendChild(measurer);
            measurer.textContent = char;
            const width = measurer.offsetWidth;
            document.body.removeChild(measurer);
            
            return width;
        } catch (error) {
            console.warn('⚠️ DOM char measurement failed, using fallback:', error);
            return realMetrics.averageAsciiWidth;
        }
    }
}



/**
 * 高精度フォントメトリクス測定
 */
function measurePreciseFontMetrics(context) {
    // 複数の測定方法を組み合わせてより正確な値を取得
    const measurements = {
        // 半角スペース幅
        halfWidthSpaceWidth: context.measureText(' ').width,
        
        // 全角スペース幅
        fullWidthSpaceWidth: context.measureText('\u3000').width,
        
        // 基準文字幅（複数文字の平均）
        averageCharWidth: 0,
        
        // タブストップ幅
        tabStopWidth: 0
    };
    
    // 基準文字幅を計算（ASCII文字の平均）
    const testChars = ['m', 'i', 'w', 'l', '0', '1', 'A', 'a', 'x', 'M'];
    let totalWidth = 0;
    for (const char of testChars) {
        totalWidth += context.measureText(char).width;
    }
    measurements.averageCharWidth = totalWidth / testChars.length;
    
    // タブストップ幅を計算（エディタのtab-sizeプロパティに基づく）
    const tabSize = parseInt(getComputedStyle(editor).tabSize) || 4;
    measurements.tabStopWidth = measurements.halfWidthSpaceWidth * tabSize;
    
    // 日本語フォント特有の調整
    const fontFamily = getComputedStyle(editor).fontFamily.toLowerCase();
    if (fontFamily.includes('yu gothic') || 
        fontFamily.includes('meiryo') || 
        fontFamily.includes('ms gothic') ||
        fontFamily.includes('hiragino') ||
        fontFamily.includes('noto sans cjk')) {
        
        // 日本語フォントの場合はタブストップを調整
        measurements.tabStopWidth = measurements.halfWidthSpaceWidth * Math.max(6, tabSize);
        console.log('👁️ Japanese font detected, adjusted tab stop width:', measurements.tabStopWidth);
    }
    
    console.log('👁️ Measured font metrics:', measurements);
    return measurements;
}

/**
 * テキストの実際の表示幅を測定
 */
function measureTextWidth(context, text, fontMetrics) {
    if (!text) return 0;
    
    // タブを含む場合は特別処理
    if (text.includes('\t')) {
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '\t') {
                // タブストップまでの距離を計算
                const nextTabStop = Math.ceil((width + 1) / fontMetrics.tabStopWidth) * fontMetrics.tabStopWidth;
                width = nextTabStop;
            } else {
                width += measureCharacterWidth(context, char, fontMetrics);
            }
        }
        return width;
    } else {
        // タブがない場合は通常測定
        return context.measureText(text).width;
    }
}

/**
 * 個別文字の幅を測定
 */
function measureCharacterWidth(context, char, fontMetrics) {
    if (char === ' ') {
        return fontMetrics.halfWidthSpaceWidth;
    } else if (char === '\u3000') {
        return fontMetrics.fullWidthSpaceWidth;
    } else {
        return context.measureText(char).width;
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
        left: ${x}px;
        top: ${y}px;
        width: ${width}px;
        height: ${height}px;
        pointer-events: none;
        z-index: 10;
        visibility: visible;
        opacity: 1;
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
                        // タブ文字: 矢印マーク（幅に応じてサイズ調整）
                        const tabColor = whitespaceVisualization.colors.tab;
                        const tabColorAlpha = tabColor + '1A'; // 10%透明度
                        const tabColorBorder = tabColor + '80'; // 50%透明度
                        
                        marker.style.backgroundColor = tabColorAlpha;
                        marker.style.borderBottom = `1px solid ${tabColorBorder}`;
                        marker.style.boxSizing = 'border-box';
                        
                        const tabArrow = document.createElement('div');
                        // 矢印サイズを幅に応じて調整（最小8px、最大16px）
                        const arrowSize = Math.min(16, Math.max(8, Math.round(width * 0.3)));
                        tabArrow.style.cssText = `
                            position: absolute;
                            top: 50%;
                            left: 2px;
                            color: ${tabColor};
                            font-size: ${arrowSize}px;
                            line-height: 1;
                            transform: translateY(-50%);
                            font-family: monospace;
                            overflow: hidden;
                            max-width: ${Math.max(10, width - 4)}px;
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
    
    // スクロール時は即座に更新
    try {
        performWhitespaceMarkersUpdate();
        console.log('👁️ Whitespace markers updated on scroll');
    } catch (error) {
        console.error('❌ Error updating whitespace markers on scroll:', error);
        
        // エラー時はマーカーを一度クリアして再試行
        removeAllMarkers();
        try {
            performWhitespaceMarkersUpdate();
        } catch (retryError) {
            console.error('❌ Retry also failed:', retryError);
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
    // ダイアログをドラッグ可能にする
    makeDraggable(dialog);
    
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

/**
 * 実際のテキスト幅を測定（DOM実測定）
 */
function measureActualTextWidth(text) {
    if (!text) return 0;
    
    try {
        // 測定用の隠し要素を作成
        const measurer = document.createElement('div');
        const computedStyle = getComputedStyle(editor);
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            pointer-events: none;
            white-space: pre;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
        `;
        
        document.body.appendChild(measurer);
        measurer.textContent = text;
        const width = measurer.offsetWidth;
        document.body.removeChild(measurer);
        
        return width;
    } catch (error) {
        console.warn('⚠️ DOM text measurement failed:', error);
        return 0;
    }
}

/**
 * 文字の正確な描画位置を計算（折り返し対応）
 */
function measureCharacterPosition(lineText, charIndex, lineTopPosition) {
    if (!lineText || charIndex < 0) return { x: 0, y: lineTopPosition };
    
    try {
        // 測定用の隠し要素を作成（エディタと同じスタイル）
        const measurer = document.createElement('div');
        const computedStyle = getComputedStyle(editor);
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            pointer-events: none;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            tab-size: ${computedStyle.tabSize};
            -moz-tab-size: ${computedStyle.tabSize};
            -webkit-tab-size: ${computedStyle.tabSize};
            -o-tab-size: ${computedStyle.tabSize};
            width: ${editor.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight)}px;
        `;
        
        document.body.appendChild(measurer);
        
        // 対象文字までのテキストと対象文字を設定
        const textBeforeChar = lineText.substring(0, charIndex);
        const targetChar = lineText[charIndex];
        const textAfterChar = lineText.substring(charIndex + 1);
        
        const beforeNode = document.createTextNode(textBeforeChar);
        const charMarker = document.createElement('span');
        charMarker.textContent = targetChar;
        charMarker.style.position = 'relative';
        const afterNode = document.createTextNode(textAfterChar);
        
        measurer.appendChild(beforeNode);
        measurer.appendChild(charMarker);
        measurer.appendChild(afterNode);
        
        // マーカーの位置を取得
        const markerRect = charMarker.getBoundingClientRect();
        const measurerRect = measurer.getBoundingClientRect();
        
        const relativeX = markerRect.left - measurerRect.left;
        const relativeY = markerRect.top - measurerRect.top;
        
        document.body.removeChild(measurer);
        
        return {
            x: relativeX,
            y: lineTopPosition + relativeY,
            width: markerRect.width,
            height: markerRect.height
        };
        
    } catch (error) {
        console.warn('⚠️ Character position measurement failed:', error);
        
        // フォールバック: 単純な幅計算
        const actualPositionBeforeChar = measureActualTextWidth(lineText.substring(0, charIndex));
        return {
            x: actualPositionBeforeChar,
            y: lineTopPosition,
            width: 8, // デフォルト幅
            height: parseFloat(getComputedStyle(editor).lineHeight)
        };
    }
}

/**
 * 論理行の正確な位置とサイズを計算
 */
function calculateLogicalLinePositions(lines) {
    try {
        // 測定用の隠し要素を作成（エディタと同じスタイル）
        const measurer = document.createElement('div');
        const computedStyle = window.getComputedStyle(editor);
        
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${computedStyle.fontSize};
            line-height: ${computedStyle.lineHeight};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editor.clientWidth - parseFloat(computedStyle.paddingLeft) - parseFloat(computedStyle.paddingRight)}px;
        `;
        
        document.body.appendChild(measurer);
        
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        let currentTop = paddingTop;
        const positions = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 空行の場合
            if (line.length === 0) {
                positions.push({
                    top: currentTop,
                    height: lineHeight
                });
                currentTop += lineHeight;
                continue;
            }
            
            // 行の内容を測定
            measurer.textContent = line;
            const measurerHeight = measurer.offsetHeight;
            
            positions.push({
                top: currentTop,
                height: measurerHeight
            });
            
            currentTop += measurerHeight;
        }
        
        document.body.removeChild(measurer);
        return positions;
        
    } catch (error) {
        console.error('Error calculating logical line positions:', error);
        
        // フォールバック
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        
        return lines.map((_, i) => ({
            top: paddingTop + i * lineHeight,
            height: lineHeight
        }));
    }
}

/**
 * フォント変更時の強制的な空白文字可視化更新
 */
export function forceUpdateWhitespaceMarkers() {
    console.log('🔄 Force updating whitespace markers after font change');
    
    // 可視化が無効な場合は何もしない
    if (!whitespaceVisualization.enabled || !editor || !markersContainer) {
        return;
    }
    
    // 既存のマーカーを削除
    removeAllMarkers();
    
    // スケジュールフラグをリセット
    updateScheduled = false;
    
    // 即座に更新を実行
    try {
        performWhitespaceMarkersUpdate();
        console.log('✅ Whitespace markers force updated');
    } catch (error) {
        console.error('❌ Force update failed:', error);
    }
}