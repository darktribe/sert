/*
 * =====================================================
 * Vinsert Editor - タイプライターモード機能（真のタイプライター動作版）
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
let lastLineNumber = 1;
let lastCursorPosition = 0;
let isComposingText = false;

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
        centerCurrentLine();
    } else {
        console.log('📝 Typewriter mode disabled');
        removeDynamicPadding();
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
    
    console.log('📝 Dynamic padding removed');
}

/**
 * 現在の行を中央に配置
 */
export function centerCurrentLine() {
    if (!typewriterSettings.enabled || !editor) {
        return;
    }
    
    const cursorPosition = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPosition);
    const currentLineNumber = textBeforeCursor.split('\n').length;
    
    // 前回と同じ行で、入力による変更でない場合はスクロールしない
    if (currentLineNumber === lastLineNumber && !shouldScrollOnInput(cursorPosition)) {
        return;
    }
    
    // 行が変わった場合や入力時のスクロール判定
    if (shouldPerformScroll(currentLineNumber, cursorPosition)) {
        performTypewriterScroll(currentLineNumber);
    }
    
    // 状態を更新
    lastLineNumber = currentLineNumber;
    lastCursorPosition = cursorPosition;
}

/**
 * 入力時にスクロールすべきかを判定
 */
function shouldScrollOnInput(cursorPosition) {
    if (!typewriterSettings.scrollOnTyping) return false;
    
    // カーソル位置が前回より進んでいる（文字が追加された）
    const isTyping = cursorPosition > lastCursorPosition;
    
    // IME入力中でも行が変わった場合は考慮
    const currentLineNumber = editor.value.substring(0, cursorPosition).split('\n').length;
    const lineChanged = currentLineNumber !== lastLineNumber;
    
    return isTyping || (lineChanged && typewriterSettings.scrollOnLineChange);
}

/**
 * スクロールを実行すべきかを判定
 */
function shouldPerformScroll(currentLineNumber, cursorPosition) {
    // 行が変わった場合
    if (currentLineNumber !== lastLineNumber && typewriterSettings.scrollOnLineChange) {
        console.log('📝 Line changed:', lastLineNumber, '->', currentLineNumber);
        return true;
    }
    
    // 文字入力時
    if (cursorPosition > lastCursorPosition && typewriterSettings.scrollOnTyping) {
        // 改行文字が追加された場合
        const addedText = editor.value.substring(lastCursorPosition, cursorPosition);
        if (addedText.includes('\n')) {
            console.log('📝 Newline detected in typing');
            return true;
        }
        
        // 長い行で折り返しが発生した可能性をチェック
        const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
        const currentLine = getCurrentLineFromPosition(cursorPosition);
        const linePixelWidth = getLinePixelWidth(currentLine);
        const editorWidth = editor.clientWidth - 20; // パディング考慮
        
        if (linePixelWidth > editorWidth) {
            console.log('📝 Line wrap detected');
            return true;
        }
    }
    
    return false;
}

/**
 * 指定位置の行テキストを取得
 */
function getCurrentLineFromPosition(position) {
    const text = editor.value;
    const lines = text.split('\n');
    const textBeforePosition = text.substring(0, position);
    const lineNumber = textBeforePosition.split('\n').length - 1;
    return lines[lineNumber] || '';
}

/**
 * 行のピクセル幅を概算
 */
function getLinePixelWidth(lineText) {
    // フォントサイズとフォントファミリから概算
    const fontSize = parseFloat(getComputedStyle(editor).fontSize);
    const averageCharWidth = fontSize * 0.6; // 等幅フォントの概算
    return lineText.length * averageCharWidth;
}

/**
 * タイプライター風スクロールを実行
 */
function performTypewriterScroll(currentLineNumber) {
    // 既存のアニメーションをキャンセル
    if (scrollAnimationId) {
        cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = null;
    }
    
    const lineHeight = parseFloat(getComputedStyle(editor).lineHeight);
    const editorHeight = editor.clientHeight;
    const centerOffset = editorHeight * typewriterSettings.centerPosition;
    
    // 目標スクロール位置を計算（パディングを考慮）
    const targetLineY = (currentLineNumber - 1) * lineHeight;
    const targetScrollTop = targetLineY - centerOffset + parseFloat(editor.style.paddingTop || 0);
    
    // 境界値チェック
    const maxScrollTop = editor.scrollHeight - editorHeight;
    const minScrollTop = 0;
    const finalScrollTop = Math.max(minScrollTop, Math.min(maxScrollTop, targetScrollTop));
    
    console.log('📝 Typewriter scroll:', {
        currentLine: currentLineNumber,
        targetY: targetLineY,
        targetScrollTop: finalScrollTop,
        currentScrollTop: editor.scrollTop
    });
    
    if (typewriterSettings.smoothScroll) {
        animateScrollTo(finalScrollTop);
    } else {
        editor.scrollTop = finalScrollTop;
        syncLineNumbersScroll();
    }
}

/**
 * スムーススクロールアニメーション
 */
function animateScrollTo(targetScrollTop) {
    if (isScrolling) return;
    
    const startScrollTop = editor.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    
    // 距離が小さい場合は瞬時に移動
    if (Math.abs(distance) < 2) {
        editor.scrollTop = targetScrollTop;
        syncLineNumbersScroll();
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
        syncLineNumbersScroll();
        
        if (progress < 1) {
            scrollAnimationId = requestAnimationFrame(animate);
        } else {
            isScrolling = false;
            scrollAnimationId = null;
        }
    }
    
    scrollAnimationId = requestAnimationFrame(animate);
}

/**
 * 行番号のスクロールを同期
 */
function syncLineNumbersScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
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