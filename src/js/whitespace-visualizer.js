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
 * 実際のマーカー更新処理
 */
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
        const isTypewriterMode = paddingTop > 20; // 通常は10px、タイプライターモードでは画面の半分
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
        const tabWidth = spaceWidth * 4; // タブは4スペース分
        
        // スクロール位置を取得
        const scrollTop = editor.scrollTop;
        const scrollLeft = editor.scrollLeft;
        
        // 表示可能範囲を計算（タイプライターモード考慮）
        const editorHeight = editor.clientHeight;
        const effectiveTop = isTypewriterMode ? scrollTop - paddingTop + 20 : scrollTop;
        const effectiveHeight = editorHeight + (isTypewriterMode ? paddingTop * 2 : 0);
        
        // 安全な表示範囲を大きめに取る
        const visibleStartLine = Math.max(0, Math.floor(effectiveTop / lineHeight) - 5);
        const visibleEndLine = Math.min(
            content.split('\n').length, 
            Math.ceil((effectiveTop + effectiveHeight) / lineHeight) + 5
        );
        
        console.log(`👁️ Visible range: ${visibleStartLine} to ${visibleEndLine}, scrollTop: ${scrollTop}, isTypewriter: ${isTypewriterMode}`);
        
        // 行ごとに処理
        const lines = content.split('\n');
        let currentY = paddingTop; // 実際のpadding値を使用
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            // 表示範囲の判定をより緩く
            if (lineIndex < visibleStartLine - 2 || lineIndex > visibleEndLine + 2) {
                currentY += lineHeight;
                continue;
            }
            
            const line = lines[lineIndex];
            let currentX = paddingLeft + lineNumbersWidth - scrollLeft;
            
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
                
                // マーカーを作成（スクロール位置とpadding を正しく考慮）
                if (markerType) {
                    // タイプライターモードでのY座標計算を修正
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
        
        // エラー時は全マーカーを削除して状態をクリア
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
                // 全角スペース: 対角線入りの四角
                marker.style.backgroundColor = 'transparent';
                marker.style.border = '1px solid rgba(100, 150, 255, 0.6)';
                
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
                line1.setAttribute('stroke', 'rgba(100, 150, 255, 0.7)');
                line1.setAttribute('stroke-width', '1');
                
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line2.setAttribute('x1', (Math.round(width) - 1).toString());
                line2.setAttribute('y1', '1');
                line2.setAttribute('x2', '1');
                line2.setAttribute('y2', (Math.round(height) - 1).toString());
                line2.setAttribute('stroke', 'rgba(100, 150, 255, 0.7)');
                line2.setAttribute('stroke-width', '1');
                
                svg.appendChild(line1);
                svg.appendChild(line2);
                marker.appendChild(svg);
                break;
                
            case 'halfwidth-space':
                // 半角スペース: 四角で囲んだ点
                marker.style.backgroundColor = 'transparent';
                marker.style.border = '1px solid rgba(128, 128, 128, 0.5)';
                
                // 中央の点
                const halfwidthDot = document.createElement('div');
                halfwidthDot.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 2px;
                    height: 2px;
                    background-color: rgba(128, 128, 128, 0.8);
                    transform: translate(-50%, -50%);
                `;
                marker.appendChild(halfwidthDot);
                break;
                
            case 'tab':
                // タブ文字: 矢印マーク（現在の形式維持）
                marker.style.backgroundColor = 'rgba(255, 165, 0, 0.1)';
                marker.style.borderBottom = '1px solid rgba(255, 165, 0, 0.5)';
                
                const tabArrow = document.createElement('div');
                tabArrow.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 2px;
                    color: rgba(255, 165, 0, 0.7);
                    font-size: ${Math.max(10, Math.round(height * 0.6))}px;
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