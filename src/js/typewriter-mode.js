/*
 * =====================================================
 * Vinsert Editor - タイプライターモード機能（完全同期・正確なワードラップ対応版）
 * =====================================================
 */

import { editor } from './globals.js';
import { t } from './locales.js';
import { closeAllMenus } from './menu-controller.js';

// タイプライターモードの設定
let typewriterSettings = {
    enabled: false,
    centerPosition: 0.5, // 0.0 = 上端, 0.5 = 中央, 1.0 = 下端
    smoothScroll: true,
    dynamicPadding: true, // 見せかけの空行を動的に追加
    scrollOnTyping: true, // 文章入力時のスクロール
    scrollOnLineChange: true // 行変更時のスクロール
};

// スムーススクロール用の設定
let isScrolling = false;
let scrollAnimationId = null;

// 前回の状態を記憶
let lastVisualLineNumber = 1;
let lastCursorPosition = 0;
let isComposingText = false;
let lastScrollHeight = 0;
let lastTextAreaHeight = 0;

// 測定用の隠しDIV（キャッシュ）
let measureDiv = null;

/**
 * 測定用DIVを初期化
 */
function initializeMeasureDiv() {
    if (measureDiv) return measureDiv;
    
    measureDiv = document.createElement('div');
    measureDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        top: -9999px;
        left: -9999px;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: normal;
        hyphens: none;
        font-family: ${getComputedStyle(editor).fontFamily};
        font-size: ${getComputedStyle(editor).fontSize};
        line-height: ${getComputedStyle(editor).lineHeight};
        padding: ${getComputedStyle(editor).padding};
        border: ${getComputedStyle(editor).border};
        box-sizing: border-box;
    `;
    
    document.body.appendChild(measureDiv);
    return measureDiv;
}

/**
 * 測定用DIVの幅を更新
 */
function updateMeasureDivWidth() {
    if (!measureDiv || !editor) return;
    
    const editorStyle = getComputedStyle(editor);
    const paddingLeft = parseFloat(editorStyle.paddingLeft);
    const paddingRight = parseFloat(editorStyle.paddingRight);
    const borderLeft = parseFloat(editorStyle.borderLeftWidth);
    const borderRight = parseFloat(editorStyle.borderRightWidth);
    
    const contentWidth = editor.clientWidth - paddingLeft - paddingRight - borderLeft - borderRight;
    measureDiv.style.width = `${contentWidth}px`;
    
    console.log('📏 Measure div width updated:', contentWidth);
}

/**
 * より精密な視覚的行番号計算（改善版）
 */
function getPreciseVisualLineNumber(cursorPosition) {
    if (!editor) return 1;
    
    try {
        // 測定用DIVを初期化・更新
        initializeMeasureDiv();
        updateMeasureDivWidth();
        
        // カーソル位置までのテキストを取得
        const textBeforeCursor = editor.value.substring(0, cursorPosition);
        
        // 測定用DIVにテキストを設定
        measureDiv.textContent = textBeforeCursor;
        
        // 高さを測定
        const height = measureDiv.offsetHeight;
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
        
        // 視覚的行数を計算
        const visualLines = Math.max(1, Math.round(height / lineHeight));
        
        console.log('📏 Precise visual line calculation:', {
            cursorPosition,
            textLength: textBeforeCursor.length,
            height,
            lineHeight,
            visualLines,
            textSample: textBeforeCursor.slice(-20)
        });
        
        return visualLines;
        
    } catch (error) {
        console.warn('Failed to calculate precise visual line number:', error);
        return getFallbackVisualLineNumber(cursorPosition);
    }
}

/**
 * フォールバック用の視覚的行数計算
 */
function getFallbackVisualLineNumber(cursorPosition) {
    const textBeforeCursor = editor.value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    
    // 基本の論理行数
    let visualLines = lines.length;
    
    // 簡易的なワードラップ計算
    const style = getComputedStyle(editor);
    const fontSize = parseFloat(style.fontSize);
    const editorWidth = editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const charWidth = fontSize * 0.6; // 等幅フォントの概算
    const maxCharsPerLine = Math.floor(editorWidth / charWidth);
    
    let additionalLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length > maxCharsPerLine) {
            additionalLines += Math.floor(line.length / maxCharsPerLine);
        }
    }
    
    return Math.max(1, visualLines + additionalLines);
}

/**
 * 行番号のスクロールを確実に同期
 */
function ensureLineNumberSync() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) return;
    
    // 複数の方法で同期を確保
    const targetScrollTop = editor.scrollTop;
    
    // 1. 即座に同期
    lineNumbers.scrollTop = targetScrollTop;
    
    // 2. requestAnimationFrame で確実に同期
    requestAnimationFrame(() => {
        lineNumbers.scrollTop = targetScrollTop;
        
        // 3. 更にもう一度確認して同期
        requestAnimationFrame(() => {
            if (Math.abs(lineNumbers.scrollTop - targetScrollTop) > 1) {
                lineNumbers.scrollTop = targetScrollTop;
                console.log('🔗 Final line number sync correction applied');
            }
        });
    });
    
    console.log('🔗 Line numbers synced to:', targetScrollTop);
}

/**
 * タイプライターモード設定をローカルストレージから読み込み
 */
export function loadTypewriterSettings() {
    try {
        const saved = localStorage.getItem('sert-typewriter-settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            typewriterSettings = { ...typewriterSettings, ...parsed };
            console.log('📝 Typewriter settings loaded:', typewriterSettings);
        }
    } catch (error) {
        console.warn('⚠️ Could not load typewriter settings:', error);
    }
    
    // 設定を適用
    applyTypewriterMode();
}

/**
 * タイプライターモード設定をローカルストレージに保存
 */
export function saveTypewriterSettings() {
    try {
        localStorage.setItem('sert-typewriter-settings', JSON.stringify(typewriterSettings));
        console.log('💾 Typewriter settings saved:', typewriterSettings);
    } catch (error) {
        console.warn('⚠️ Could not save typewriter settings:', error);
    }
}

/**
 * タイプライターモードのON/OFF切り替え
 */
export function toggleTypewriterMode() {
    typewriterSettings.enabled = !typewriterSettings.enabled;
    applyTypewriterMode();
    saveTypewriterSettings();
    
    const status = typewriterSettings.enabled ? t('typewriter.enabled') : t('typewriter.disabled');
    console.log(`📝 Typewriter mode: ${status}`);
    
    // ステータスメッセージを表示
    showTypewriterStatus(status);
    
    closeAllMenus();
    
    // 修正：行ハイライトの強制更新（正しい構文）
    setTimeout(() => {
        try {
            import('./ui-updater.js').then(module => {
                if (module.updateCurrentLineHighlight) {
                    module.updateCurrentLineHighlight();
                    console.log('🎨 Line highlight forced update completed');
                }
            });
        } catch (e) {
            console.warn('Could not update line highlight:', e);
        }
    }, 200);
}

/**
 * タイプライターモード設定ダイアログを表示
 */
export function showTypewriterSettingsDialog() {
    console.log('📝 Opening typewriter settings dialog');
    closeAllMenus();
    
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('typewriter-settings-dialog-overlay');
    if (existingDialog) {
        document.body.removeChild(existingDialog);
    }
    
    createTypewriterSettingsDialog();
}

/**
 * タイプライターモードを適用
 */
function applyTypewriterMode() {
    if (typewriterSettings.enabled) {
        console.log('📝 Applying typewriter mode');
        setupDynamicPadding();
        
        // 測定用DIVを更新
        updateMeasureDivWidth();
        
        centerCurrentLine();
        
        // 修正：タイプライターモード適用時に行ハイライトを更新
        setTimeout(() => {
            if (typeof updateCurrentLineHighlight === 'function') {
                updateCurrentLineHighlight();
            } else if (window.updateCurrentLineHighlight) {
                window.updateCurrentLineHighlight();
            }
            console.log('🎨 Line highlight updated after typewriter mode applied');
        }, 150);
    } else {
        console.log('📝 Typewriter mode disabled');
        removeDynamicPadding();
        
        // 修正：タイプライターモード無効時も行ハイライトを更新
        setTimeout(() => {
            if (typeof updateCurrentLineHighlight === 'function') {
                updateCurrentLineHighlight();
            } else if (window.updateCurrentLineHighlight) {
                window.updateCurrentLineHighlight();
            }
            console.log('🎨 Line highlight updated after typewriter mode disabled');
        }, 100);
    }
}

/**
 * 動的パディングを設定（見せかけの空行）
 */
function setupDynamicPadding() {
    if (!typewriterSettings.dynamicPadding || !editor) return;
    
    const editorHeight = editor.clientHeight;
    const centerOffset = editorHeight * typewriterSettings.centerPosition;
    
    // 上下のパディングを設定
    editor.style.paddingTop = `${centerOffset}px`;
    editor.style.paddingBottom = `${editorHeight - centerOffset}px`;
    
    // 行番号のパディングも同じように設定
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.style.paddingTop = `${centerOffset}px`;
        lineNumbers.style.paddingBottom = `${editorHeight - centerOffset}px`;
    }
    
    console.log('📝 Dynamic padding applied:', { 
        top: centerOffset, 
        bottom: editorHeight - centerOffset 
    });
}

/**
 * 動的パディングを削除
 */
function removeDynamicPadding() {
    if (!editor) return;
    
    editor.style.paddingTop = '10px'; // デフォルトに戻す
    editor.style.paddingBottom = '10px';
    
    // 行番号のパディングもリセット
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.style.paddingTop = '10px';
        lineNumbers.style.paddingBottom = '10px';
    }
    
    console.log('📝 Dynamic padding removed');
}

/**
 * 現在の行を中央に配置（完全同期版）
 */
export function centerCurrentLine() {
    if (!typewriterSettings.enabled || !editor) {
        return;
    }
    
    const cursorPosition = editor.selectionStart;
    const currentVisualLine = getPreciseVisualLineNumber(cursorPosition);
    
    // 修正：スクロール判定を簡素化
    let shouldScroll = false;
    
    // 視覚的行が変わった場合
    if (currentVisualLine !== lastVisualLineNumber) {
        shouldScroll = true;
    }
    // カーソル位置が大きく変わった場合
    else if (Math.abs(cursorPosition - lastCursorPosition) > 10) {
        shouldScroll = true;
    }
    // 改行が追加・削除された場合
    else if (cursorPosition !== lastCursorPosition) {
        const currentLines = editor.value.substring(0, cursorPosition).split('\n').length;
        const lastLines = editor.value.substring(0, lastCursorPosition).split('\n').length;
        if (currentLines !== lastLines) {
            shouldScroll = true;
        }
    }
    
    if (shouldScroll) {
        performTypewriterScroll(currentVisualLine);
    }
    
    // 状態を更新
    lastVisualLineNumber = currentVisualLine;
    lastCursorPosition = cursorPosition;
}

/**
 * 入力時にスクロールすべきかを判定
 */
function shouldScrollOnInput(cursorPosition) {
    if (!typewriterSettings.scrollOnTyping) return false;
    
    // カーソル位置が前回より進んでいる（文字が追加された）
    const isTyping = cursorPosition > lastCursorPosition;
    
    // 視覚的行が変わった場合は考慮
    const currentVisualLine = getPreciseVisualLineNumber(cursorPosition);
    const visualLineChanged = currentVisualLine !== lastVisualLineNumber;
    
    return isTyping || (visualLineChanged && typewriterSettings.scrollOnLineChange);
}

/**
 * スクロールを実行すべきかを判定（ワードラップ対応強化）
 */
function shouldPerformScroll(currentVisualLine, cursorPosition, scrollHeightChanged, textAreaHeightChanged) {
    // 視覚的行が変わった場合
    if (currentVisualLine !== lastVisualLineNumber && typewriterSettings.scrollOnLineChange) {
        console.log('📝 Visual line changed:', lastVisualLineNumber, '->', currentVisualLine);
        return true;
    }
    
    // スクロール高さまたはテキストエリア高さが変化した場合（ワードラップ）
    if ((scrollHeightChanged || textAreaHeightChanged) && typewriterSettings.scrollOnTyping) {
        console.log('📝 Height changed - scroll:', scrollHeightChanged, 'textarea:', textAreaHeightChanged);
        return true;
    }
    
    // 文字入力時の詳細チェック
    if (cursorPosition > lastCursorPosition && typewriterSettings.scrollOnTyping) {
        // 改行文字が追加された場合
        const addedText = editor.value.substring(lastCursorPosition, cursorPosition);
        if (addedText.includes('\n')) {
            console.log('📝 Newline detected in typing');
            return true;
        }
        
        // 長い行での入力チェック（ワードラップの可能性）
        const currentLineText = getCurrentLineText(cursorPosition);
        if (currentLineText.length > getEstimatedCharsPerLine()) {
            console.log('📝 Long line detected, possible word wrap');
            return true;
        }
        
        // カーソルが画面の可視領域から外れた可能性をチェック
        if (isCursorOutOfView()) {
            console.log('📝 Cursor is out of view');
            return true;
        }
    }
    
    return false;
}

/**
 * 現在の行のテキストを取得
 */
function getCurrentLineText(cursorPosition) {
    const text = editor.value;
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    const lineStart = beforeCursor.lastIndexOf('\n') + 1;
    const lineEnd = afterCursor.indexOf('\n');
    
    const currentLineEnd = lineEnd === -1 ? text.length : cursorPosition + lineEnd;
    
    return text.substring(lineStart, currentLineEnd);
}

/**
 * 1行あたりの推定文字数を取得
 */
function getEstimatedCharsPerLine() {
    const style = getComputedStyle(editor);
    const fontSize = parseFloat(style.fontSize);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
    
    // より保守的な文字幅計算
    const charWidth = fontSize * 0.55; // 若干小さめに見積もり
    return Math.floor(editorWidth / charWidth);
}

/**
 * カーソルが画面の可視領域から外れているかチェック
 */
function isCursorOutOfView() {
    if (!editor) return false;
    
    try {
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
        const currentVisualLine = getPreciseVisualLineNumber(editor.selectionStart);
        const cursorY = (currentVisualLine - 1) * lineHeight;
        
        const editorHeight = editor.clientHeight;
        const scrollTop = editor.scrollTop;
        const paddingTop = parseFloat(editor.style.paddingTop || 0);
        
        // 可視領域の範囲
        const visibleTop = scrollTop - paddingTop;
        const visibleBottom = scrollTop + editorHeight - paddingTop;
        
        // カーソルが可視領域から外れているかチェック
        const isOutOfView = cursorY < visibleTop || cursorY > visibleBottom;
        
        if (isOutOfView) {
            console.log('📝 Cursor out of view:', {
                cursorY,
                visibleTop,
                visibleBottom,
                currentVisualLine
            });
        }
        
        return isOutOfView;
    } catch (error) {
        console.warn('Failed to check cursor visibility:', error);
        return false;
    }
}

/**
 * タイプライター風スクロールを実行（完全同期版）
 */
function performTypewriterScroll(currentVisualLine) {
    // 既存のアニメーションをキャンセル
    if (scrollAnimationId) {
        cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = null;
    }
    
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    const editorHeight = editor.clientHeight;
    const centerOffset = editorHeight * typewriterSettings.centerPosition;
    
    // 目標スクロール位置を計算（パディングを考慮）
    const targetLineY = (currentVisualLine - 1) * lineHeight;
    const targetScrollTop = targetLineY - centerOffset + parseFloat(editor.style.paddingTop || 0);
    
    // 境界値チェック
    const maxScrollTop = editor.scrollHeight - editorHeight;
    const minScrollTop = 0;
    const finalScrollTop = Math.max(minScrollTop, Math.min(maxScrollTop, targetScrollTop));
    
    console.log('📝 Typewriter scroll:', {
        currentVisualLine: currentVisualLine,
        targetY: targetLineY,
        targetScrollTop: finalScrollTop,
        currentScrollTop: editor.scrollTop,
        centerOffset,
        lineHeight
    });
    
    if (typewriterSettings.smoothScroll) {
        animateScrollTo(finalScrollTop);
    } else {
        editor.scrollTop = finalScrollTop;
        ensureLineNumberSync();
    }
}

/**
 * スムーススクロールアニメーション（完全同期版）
 */
function animateScrollTo(targetScrollTop) {
    if (isScrolling) return;
    
    const startScrollTop = editor.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    
    // 距離が小さい場合は瞬時に移動
    if (Math.abs(distance) < 2) {
        editor.scrollTop = targetScrollTop;
        ensureLineNumberSync();
        return;
    }
    
    const duration = 150; // より高速なアニメーション
    const startTime = performance.now();
    
    isScrolling = true;
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // より自然なイージング関数（easeOutCubic）
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentScrollTop = startScrollTop + (distance * easeProgress);
        editor.scrollTop = currentScrollTop;
        
        // アニメーション中も確実に行番号を同期
        ensureLineNumberSync();
        
        if (progress < 1) {
            scrollAnimationId = requestAnimationFrame(animate);
        } else {
            isScrolling = false;
            scrollAnimationId = null;
            
            // アニメーション完了後にも行番号同期を確実に実行
            setTimeout(() => {
                ensureLineNumberSync();
            }, 10);
        }
    }
    
    scrollAnimationId = requestAnimationFrame(animate);
}

/**
 * IME入力の開始を検出
 */
export function onCompositionStart() {
    isComposingText = true;
    console.log('📝 IME composition started');
}

/**
 * IME入力の終了を検出
 */
export function onCompositionEnd() {
    isComposingText = false;
    console.log('📝 IME composition ended');
    
    // IME確定後に即座にスクロールチェック
    setTimeout(() => {
        centerCurrentLine();
    }, 10);
}

/**
 * 入力イベント用のタイプライターモード処理
 */
export function onInputEvent() {
    if (!typewriterSettings.enabled) return;
    
    // 測定用DIVの幅を更新（レイアウト変更に対応）
    updateMeasureDivWidth();
    
    // 少し遅延させてDOM更新を待つ
    setTimeout(() => {
        centerCurrentLine();
    }, 10);
}

/**
 * キー入力イベント用の処理
 */
export function onKeyEvent(e) {
    if (!typewriterSettings.enabled) return;
    
    // Enter キーが押された場合は即座に処理
    if (e.key === 'Enter') {
        setTimeout(() => {
            centerCurrentLine();
        }, 10);
    }
    
    // 文字入力系のキーでもスクロールチェック
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete') {
        setTimeout(() => {
            centerCurrentLine();
        }, 15);
    }
}

/**
 * ウィンドウリサイズ時の処理
 */
export function onWindowResize() {
    if (!typewriterSettings.enabled) return;
    
    console.log('📐 Window resized, updating typewriter mode');
    
    // 測定用DIVを更新
    updateMeasureDivWidth();
    
    // パディングを再計算
    setupDynamicPadding();
    
    // 現在行を再センタリング
    setTimeout(() => {
        centerCurrentLine();
    }, 100);
}

/**
 * タイプライターモード設定ダイアログの作成
 */
function createTypewriterSettingsDialog() {
    const dialogOverlay = document.createElement('div');
    dialogOverlay.id = 'typewriter-settings-dialog-overlay';
    dialogOverlay.className = 'search-dialog-overlay typewriter-settings-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'search-dialog typewriter-settings-dialog';
    
    dialog.innerHTML = `
        <div class="search-dialog-header">${t('typewriter.settingsTitle')}</div>
        <div class="search-dialog-content">
            <div class="typewriter-settings-section">
                <div class="search-input-group">
                    <label class="search-checkbox-label typewriter-main-toggle">
                        <input type="checkbox" id="typewriter-enabled-checkbox" ${typewriterSettings.enabled ? 'checked' : ''}>
                        ${t('typewriter.enableMode')}
                    </label>
                </div>
                
                <div class="search-input-group">
                    <label for="typewriter-center-position">${t('typewriter.centerPosition')}</label>
                    <div class="typewriter-position-controls">
                        <input type="range" 
                               id="typewriter-center-position" 
                               min="0.2" 
                               max="0.8" 
                               step="0.1" 
                               value="${typewriterSettings.centerPosition}"
                               class="typewriter-position-slider">
                        <span id="typewriter-position-display" class="typewriter-position-display">
                            ${Math.round(typewriterSettings.centerPosition * 100)}%
                        </span>
                    </div>
                    <div class="typewriter-position-info">
                        ${t('typewriter.positionInfo')}
                    </div>
                </div>
                
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="typewriter-smooth-scroll" ${typewriterSettings.smoothScroll ? 'checked' : ''}>
                        ${t('typewriter.smoothScroll')}
                    </label>
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="typewriter-dynamic-padding" ${typewriterSettings.dynamicPadding ? 'checked' : ''}>
                        ${t('typewriter.dynamicPadding')}
                    </label>
                </div>
                
                <div class="search-checkbox-group">
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="typewriter-scroll-on-typing" ${typewriterSettings.scrollOnTyping ? 'checked' : ''}>
                        ${t('typewriter.scrollOnTyping')}
                    </label>
                    <label class="search-checkbox-label">
                        <input type="checkbox" id="typewriter-scroll-on-line-change" ${typewriterSettings.scrollOnLineChange ? 'checked' : ''}>
                        ${t('typewriter.scrollOnLineChange')}
                    </label>
                </div>
            </div>
            
            <div class="search-button-group">
                <button id="typewriter-apply-btn" class="search-button search-button-primary">${t('typewriter.buttons.apply')}</button>
                <button id="typewriter-test-btn" class="search-button">${t('typewriter.buttons.test')}</button>
                <button id="typewriter-reset-btn" class="search-button">${t('typewriter.buttons.reset')}</button>
                <button id="typewriter-cancel-btn" class="search-button search-button-cancel">${t('typewriter.buttons.cancel')}</button>
            </div>
        </div>
    `;
    
    dialogOverlay.appendChild(dialog);
    document.body.appendChild(dialogOverlay);
    
    setupTypewriterSettingsDialogEvents(dialogOverlay);
    
    // チェックボックスにフォーカスを設定
    setTimeout(() => {
        const enabledCheckbox = document.getElementById('typewriter-enabled-checkbox');
        if (enabledCheckbox) {
            enabledCheckbox.focus();
        }
    }, 100);
}

/**
 * タイプライター設定ダイアログのイベント設定
 */
function setupTypewriterSettingsDialogEvents(dialogOverlay) {
    const enabledCheckbox = document.getElementById('typewriter-enabled-checkbox');
    const centerPositionSlider = document.getElementById('typewriter-center-position');
    const positionDisplay = document.getElementById('typewriter-position-display');
    const smoothScrollCheckbox = document.getElementById('typewriter-smooth-scroll');
    const dynamicPaddingCheckbox = document.getElementById('typewriter-dynamic-padding');
    const scrollOnTypingCheckbox = document.getElementById('typewriter-scroll-on-typing');
    const scrollOnLineChangeCheckbox = document.getElementById('typewriter-scroll-on-line-change');
    const applyBtn = document.getElementById('typewriter-apply-btn');
    const testBtn = document.getElementById('typewriter-test-btn');
    const resetBtn = document.getElementById('typewriter-reset-btn');
    const cancelBtn = document.getElementById('typewriter-cancel-btn');
    
    // 一時的な設定を保存（キャンセル時の復元用）
    const originalSettings = { ...typewriterSettings };
    
    // センターポジション変更時の表示更新
    centerPositionSlider.addEventListener('input', () => {
        const position = parseFloat(centerPositionSlider.value);
        positionDisplay.textContent = `${Math.round(position * 100)}%`;
        typewriterSettings.centerPosition = position;
    });
    
    // 適用ボタン
    applyBtn.addEventListener('click', () => {
        typewriterSettings.enabled = enabledCheckbox.checked;
        typewriterSettings.centerPosition = parseFloat(centerPositionSlider.value);
        typewriterSettings.smoothScroll = smoothScrollCheckbox.checked;
        typewriterSettings.dynamicPadding = dynamicPaddingCheckbox.checked;
        typewriterSettings.scrollOnTyping = scrollOnTypingCheckbox.checked;
        typewriterSettings.scrollOnLineChange = scrollOnLineChangeCheckbox.checked;
        
        applyTypewriterMode();
        saveTypewriterSettings();
        closeTypewriterSettingsDialog(dialogOverlay);
        
        const status = typewriterSettings.enabled ? t('typewriter.enabled') : t('typewriter.disabled');
        showTypewriterStatus(t('typewriter.settingsApplied') + ' - ' + status);
        
        console.log('✅ Typewriter settings applied and saved');
    });
    
    // テストボタン
    testBtn.addEventListener('click', () => {
        // 一時的に設定を適用してテスト
        const tempSettings = { ...typewriterSettings };
        tempSettings.enabled = enabledCheckbox.checked;
        tempSettings.centerPosition = parseFloat(centerPositionSlider.value);
        tempSettings.smoothScroll = smoothScrollCheckbox.checked;
        tempSettings.dynamicPadding = dynamicPaddingCheckbox.checked;
        tempSettings.scrollOnTyping = scrollOnTypingCheckbox.checked;
        tempSettings.scrollOnLineChange = scrollOnLineChangeCheckbox.checked;
        
        const originalSettings2 = { ...typewriterSettings };
        typewriterSettings = tempSettings;
        
        applyTypewriterMode();
        
        // 2秒後に元の設定に戻す
        setTimeout(() => {
            typewriterSettings = originalSettings2;
            applyTypewriterMode();
        }, 2000);
        
        showTypewriterStatus(t('typewriter.testMode'));
    });
    
    // リセットボタン
    resetBtn.addEventListener('click', () => {
        if (confirm(t('typewriter.resetConfirm'))) {
            // デフォルト設定に戻す
            typewriterSettings.enabled = false;
            typewriterSettings.centerPosition = 0.5;
            typewriterSettings.smoothScroll = true;
            typewriterSettings.dynamicPadding = true;
            typewriterSettings.scrollOnTyping = true;
            typewriterSettings.scrollOnLineChange = true;
            
            // UIを更新
            enabledCheckbox.checked = typewriterSettings.enabled;
            centerPositionSlider.value = typewriterSettings.centerPosition;
            positionDisplay.textContent = `${Math.round(typewriterSettings.centerPosition * 100)}%`;
            smoothScrollCheckbox.checked = typewriterSettings.smoothScroll;
            dynamicPaddingCheckbox.checked = typewriterSettings.dynamicPadding;
            scrollOnTypingCheckbox.checked = typewriterSettings.scrollOnTyping;
            scrollOnLineChangeCheckbox.checked = typewriterSettings.scrollOnLineChange;
            
            console.log('🔄 Typewriter settings reset to defaults');
        }
    });
    
    // キャンセルボタン
    cancelBtn.addEventListener('click', () => {
        // 元の設定に戻す
        typewriterSettings = originalSettings;
        closeTypewriterSettingsDialog(dialogOverlay);
        console.log('❌ Typewriter settings cancelled');
    });
    
    // ESCキーでキャンセル
    function handleKeyDown(e) {
        if (e.key === 'Escape') {
            typewriterSettings = originalSettings;
            closeTypewriterSettingsDialog(dialogOverlay);
        }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            typewriterSettings = originalSettings;
            closeTypewriterSettingsDialog(dialogOverlay);
        }
    });
    
    // ダイアログクリーンアップ時にイベントリスナーを削除
    dialogOverlay.addEventListener('remove', () => {
        document.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * タイプライター設定ダイアログを閉じる
 */
function closeTypewriterSettingsDialog(dialogOverlay) {
    try {
        document.body.removeChild(dialogOverlay);
        
        // エディタにフォーカスを戻す
        setTimeout(() => {
            if (editor && editor.focus) {
                editor.focus();
            }
        }, 100);
    } catch (error) {
        console.warn('⚠️ Error closing typewriter settings dialog:', error);
    }
}

/**
 * タイプライターモードのステータスメッセージを表示
 */
function showTypewriterStatus(message) {
    // 既存のステータスメッセージがあれば削除
    const existingStatus = document.querySelector('.typewriter-status-message');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const statusMessage = document.createElement('div');
    statusMessage.className = 'typewriter-status-message';
    statusMessage.textContent = message;
    
    document.body.appendChild(statusMessage);
    
    // 3秒後に自動で削除
    setTimeout(() => {
        if (statusMessage.parentNode) {
            statusMessage.remove();
        }
    }, 3000);
}

/**
 * 現在のタイプライターモード設定を取得
 */
export function getCurrentTypewriterSettings() {
    return { ...typewriterSettings };
}

/**
 * タイプライターモード設定を設定
 */
export function setTypewriterSettings(newSettings) {
    typewriterSettings = { ...typewriterSettings, ...newSettings };
    applyTypewriterMode();
    saveTypewriterSettings();
}

/**
 * タイプライターモードが有効かどうかを取得
 */
export function isTypewriterModeEnabled() {
    return typewriterSettings.enabled;
}

/**
 * デバッグ用：現在の状態を表示
 */
export function debugTypewriterState() {
    console.log('🐛 Typewriter debug state:', {
        enabled: typewriterSettings.enabled,
        currentVisualLine: getPreciseVisualLineNumber(editor.selectionStart),
        lastVisualLineNumber,
        cursorPosition: editor.selectionStart,
        lastCursorPosition,
        scrollTop: editor.scrollTop,
        scrollHeight: editor.scrollHeight,
        estimatedCharsPerLine: getEstimatedCharsPerLine()
    });
}