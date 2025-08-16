/*
 * =====================================================
 * Vinsert Editor - タイプライターモード（新規作成版）
 * =====================================================
 */

import { editor } from './globals.js';

// タイプライターモードの状態
let isTypewriterModeEnabled = false;

// デバッグモードフラグ（必要時のみログ出力）
const DEBUG_MODE = false;

// スクロールイベントのデバウンス用
let scrollTimeout = null;
let lastScrollUpdate = 0;

/**
 * タイプライターモードの初期化
 */
export function initTypewriterMode() {
    if (DEBUG_MODE) console.log('🖥️ Initializing typewriter mode...');
    
    // 保存された設定を読み込み
    loadTypewriterModeSetting();
    
    // 初期状態を適用
    applyTypewriterMode(isTypewriterModeEnabled);
    
    if (DEBUG_MODE) console.log(`✅ Typewriter mode initialized: ${isTypewriterModeEnabled ? 'enabled' : 'disabled'}`);
}

/**
 * タイプライターモードの切り替え
 */
export function toggleTypewriterMode() {
    isTypewriterModeEnabled = !isTypewriterModeEnabled;
    if (DEBUG_MODE) console.log(`🖥️ Typewriter mode toggled: ${isTypewriterModeEnabled ? 'enabled' : 'disabled'}`);
    
    // 設定を保存
    saveTypewriterModeSetting();
    
    // モードを適用
    applyTypewriterMode(isTypewriterModeEnabled);
    
    // メニューのチェックマークを更新
    updateTypewriterModeMenuState();
    
    // UI更新
    requestAnimationFrame(() => {
        try {
            import('./ui-updater.js').then(module => {
                if (module.updateLineNumbers) module.updateLineNumbers();
                if (module.updateLineHighlight) module.updateLineHighlight();
            });
        } catch (error) {
            if (DEBUG_MODE) console.warn('⚠️ UI update failed after typewriter mode toggle:', error);
        }
    });
}

/**
 * タイプライターモードを適用
 */
function applyTypewriterMode(enabled) {
    if (!editor) {
        if (DEBUG_MODE) console.warn('⚠️ Editor not available for typewriter mode');
        return;
    }
    
    if (enabled) {
        enableTypewriterMode();
    } else {
        disableTypewriterMode();
    }
}

/**
 * タイプライターモードを有効化
 */
function enableTypewriterMode() {
    if (DEBUG_MODE) console.log('🖥️ Enabling typewriter mode...');
    
    // エディタのスタイルを設定
    const editorHeight = editor.clientHeight;
    const centerOffset = Math.max(0, (editorHeight / 2) - 20); // 中央より少し上
    
    editor.style.paddingTop = `${centerOffset}px`;
    editor.style.paddingBottom = `${centerOffset}px`;
    
    // スクロールイベントリスナーを追加
    addTypewriterScrollListener();
    
    // 初回のカーソル中央配置
    setTimeout(() => centerCursorInView(), 100);
    
    if (DEBUG_MODE) console.log(`✅ Typewriter mode enabled with center offset: ${centerOffset}px`);
}

/**
 * タイプライターモードを無効化
 */
function disableTypewriterMode() {
    if (DEBUG_MODE) console.log('🖥️ Disabling typewriter mode...');
    
    // エディタのスタイルをリセット
    editor.style.paddingTop = '10px';
    editor.style.paddingBottom = '10px';
    
    // スクロールイベントリスナーを削除
    removeTypewriterScrollListener();
    
    if (DEBUG_MODE) console.log('✅ Typewriter mode disabled');
}

/**
 * タイプライター用スクロールリスナーを追加
 */
function addTypewriterScrollListener() {
    if (editor.typewriterScrollHandler) {
        // 既存のリスナーを削除
        editor.removeEventListener('input', editor.typewriterScrollHandler);
        editor.removeEventListener('keyup', editor.typewriterScrollHandler);
        editor.removeEventListener('click', editor.typewriterScrollHandler);
    }
    
    // 新しいハンドラーを作成
    editor.typewriterScrollHandler = debounce(centerCursorInView, 50);
    
    // イベントリスナーを追加
    editor.addEventListener('input', editor.typewriterScrollHandler);
    editor.addEventListener('keyup', editor.typewriterScrollHandler);
    editor.addEventListener('click', editor.typewriterScrollHandler);
    
    if (DEBUG_MODE) console.log('✅ Typewriter scroll listeners added');
}

/**
 * タイプライター用スクロールリスナーを削除
 */
function removeTypewriterScrollListener() {
    if (editor.typewriterScrollHandler) {
        editor.removeEventListener('input', editor.typewriterScrollHandler);
        editor.removeEventListener('keyup', editor.typewriterScrollHandler);
        editor.removeEventListener('click', editor.typewriterScrollHandler);
        delete editor.typewriterScrollHandler;
        
        if (DEBUG_MODE) console.log('✅ Typewriter scroll listeners removed');
    }
}

/**
 * カーソルを画面中央に配置
 */
function centerCursorInView() {
    if (!isTypewriterModeEnabled || !editor) return;
    
    try {
        const now = Date.now();
        if (now - lastScrollUpdate < 16) return; // 60fps制限
        lastScrollUpdate = now;
        
        const cursorPos = editor.selectionStart;
        const physicalCursorTop = calculatePhysicalCursorPosition(cursorPos);
        const editorHeight = editor.clientHeight;
        const targetCenter = editorHeight / 2;
        
        // 必要なスクロール量を計算
        const currentScroll = editor.scrollTop;
        const targetScroll = physicalCursorTop - targetCenter;
        
        // スクロールを実行
        editor.scrollTop = Math.max(0, targetScroll);
        
        // ログ出力は削除（過度なログを防ぐため）
        
    } catch (error) {
        if (DEBUG_MODE) console.warn('⚠️ Typewriter cursor centering failed:', error);
    }
}

/**
 * カーソルの物理的な位置を計算
 */
function calculatePhysicalCursorPosition(cursorPos) {
    try {
        const computedStyle = window.getComputedStyle(editor);
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        // 測定用要素を作成
        const measurer = document.createElement('div');
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
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        
        // カーソル位置にマーカーを挿入して正確な位置を取得
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const textAfterCursor = editor.value.substring(cursorPos);
        
        const beforeNode = document.createTextNode(textBeforeCursor);
        const cursorMarker = document.createElement('span');
        cursorMarker.textContent = '|';
        const afterNode = document.createTextNode(textAfterCursor);
        
        measurer.appendChild(beforeNode);
        measurer.appendChild(cursorMarker);
        measurer.appendChild(afterNode);
        
        const markerRect = cursorMarker.getBoundingClientRect();
        const measurerRect = measurer.getBoundingClientRect();
        const relativeTop = markerRect.top - measurerRect.top;
        
        document.body.removeChild(measurer);
        
        return actualPaddingTop + relativeTop;
        
    } catch (error) {
        if (DEBUG_MODE) console.error('⚠️ Physical cursor position calculation failed:', error);
        
        // フォールバック: 簡単な行ベース計算
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const logicalLine = textBeforeCursor.split('\n').length;
        
        return actualPaddingTop + (logicalLine - 1) * lineHeight;
    }
}

/**
 * デバウンス関数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * タイプライターモード設定を保存
 */
function saveTypewriterModeSetting() {
    try {
        localStorage.setItem('vinsert-typewriter-mode', isTypewriterModeEnabled ? 'true' : 'false');
        if (DEBUG_MODE) console.log('💾 Typewriter mode setting saved:', isTypewriterModeEnabled);
    } catch (error) {
        if (DEBUG_MODE) console.warn('⚠️ Could not save typewriter mode setting:', error);
    }
}

/**
 * タイプライターモード設定を読み込み
 */
function loadTypewriterModeSetting() {
    try {
        const saved = localStorage.getItem('vinsert-typewriter-mode');
        if (saved !== null) {
            isTypewriterModeEnabled = saved === 'true';
            if (DEBUG_MODE) console.log('📂 Typewriter mode setting loaded:', isTypewriterModeEnabled);
        }
    } catch (error) {
        if (DEBUG_MODE) console.warn('⚠️ Could not load typewriter mode setting:', error);
    }
}

/**
 * メニューのチェックマーク状態を更新
 */
function updateTypewriterModeMenuState() {
    try {
        const menuOption = document.getElementById('typewriter-mode-menu-option');
        if (menuOption) {
            const checkmark = menuOption.querySelector('.menu-checkmark');
            if (checkmark) {
                checkmark.style.visibility = isTypewriterModeEnabled ? 'visible' : 'hidden';
            }
        }
    } catch (error) {
        if (DEBUG_MODE) console.warn('⚠️ Could not update typewriter mode menu state:', error);
    }
}

/**
 * タイプライターモードの状態を取得
 */
export function isTypewriterModeActive() {
    return isTypewriterModeEnabled;
}

/**
 * タイプライターモードを強制的に設定
 */
export function setTypewriterMode(enabled) {
    isTypewriterModeEnabled = enabled;
    saveTypewriterModeSetting();
    applyTypewriterMode(enabled);
    updateTypewriterModeMenuState();
    
    if (DEBUG_MODE) console.log(`🖥️ Typewriter mode force set to: ${enabled}`);
}