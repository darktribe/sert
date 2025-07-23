/*
 * =====================================================
 * Vinsert Editor - UI更新機能（精密な現在行ハイライト対応）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke } from './globals.js';
import { getCurrentFontSettings } from './font-settings.js';
import { centerCurrentLine, isTypewriterModeEnabled, onWindowResize } from './typewriter-mode.js';
import { t } from './locales.js';

// デバウンス用のタイマー
let highlightUpdateTimer = null;

/**
 * 行番号の幅を行数に応じて自動調整
 */
function adjustLineNumberWidth(lineCount) {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers) return;
    
    let width;
    let className = '';
    
    if (lineCount >= 100000) {
        width = '95px';
        className = 'width-100000';
    } else if (lineCount >= 10000) {
        width = '80px';
        className = 'width-10000';
    } else if (lineCount >= 1000) {
        width = '65px';
        className = 'width-1000';
    } else {
        width = '50px';
    }
    
    // 既存のwidth-*クラスを削除
    lineNumbers.classList.remove('width-1000', 'width-10000', 'width-100000');
    
    if (className) {
        lineNumbers.classList.add(className);
    }
    
    if (lineNumbers.style.width !== width) {
        lineNumbers.style.width = width;
        lineNumbers.style.minWidth = width;
        lineNumbers.style.maxWidth = width;
        console.log(`📏 Line number width adjusted to ${width} for ${lineCount} lines`);
    }
}

/**
 * 現在行ハイライトの設定管理
 */
let currentLineHighlight = {
    enabled: true,
    lastHighlightedLine: -1,
    highlightElement: null,
    highlightElementNumbers: null
};

/**
 * 現在行ハイライト設定をローカルストレージから読み込み
 */
export function loadLineHighlightSettings() {
    try {
        const saved = localStorage.getItem('sert-line-highlight-settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            currentLineHighlight = { ...currentLineHighlight, ...parsed };
            console.log('🎨 Line highlight settings loaded:', currentLineHighlight);
        }
    } catch (error) {
        console.warn('⚠️ Could not load line highlight settings:', error);
    }
    
    // 設定を適用
    applyLineHighlightSettings();
}

/**
 * 現在行ハイライト設定をローカルストレージに保存
 */
export function saveLineHighlightSettings() {
    try {
        const settingsToSave = {
            enabled: currentLineHighlight.enabled,
            lastHighlightedLine: currentLineHighlight.lastHighlightedLine
        };
        localStorage.setItem('sert-line-highlight-settings', JSON.stringify(settingsToSave));
        console.log('💾 Line highlight settings saved:', settingsToSave);
    } catch (error) {
        console.warn('⚠️ Could not save line highlight settings:', error);
    }
}

/**
 * ハイライト要素を作成
 */
function createHighlightElements() {
    const editorContainer = document.querySelector('.editor-container');
    const lineNumbers = document.getElementById('line-numbers');
    
    if (!editorContainer || !lineNumbers) return;
    
    // エディタ用ハイライト要素
    if (!currentLineHighlight.highlightElement) {
        currentLineHighlight.highlightElement = document.createElement('div');
        currentLineHighlight.highlightElement.className = 'current-line-highlight';
        currentLineHighlight.highlightElement.style.display = 'none';
        editorContainer.appendChild(currentLineHighlight.highlightElement);
    }
    
    // 行番号用ハイライト要素
    if (!currentLineHighlight.highlightElementNumbers) {
        currentLineHighlight.highlightElementNumbers = document.createElement('div');
        currentLineHighlight.highlightElementNumbers.className = 'current-line-highlight-numbers';
        currentLineHighlight.highlightElementNumbers.style.display = 'none';
        lineNumbers.appendChild(currentLineHighlight.highlightElementNumbers);
    }
}

/**
 * ハイライト要素を削除
 */
function removeHighlightElements() {
    if (currentLineHighlight.highlightElement) {
        currentLineHighlight.highlightElement.remove();
        currentLineHighlight.highlightElement = null;
    }
    
    if (currentLineHighlight.highlightElementNumbers) {
        currentLineHighlight.highlightElementNumbers.remove();
        currentLineHighlight.highlightElementNumbers = null;
    }
}

/**
 * 現在行ハイライト設定を適用
 */
export function applyLineHighlightSettings() {
    const editorContainer = document.querySelector('.editor-container');
    if (!editorContainer) return;
    
    if (currentLineHighlight.enabled) {
        editorContainer.classList.add('line-highlight-enabled');
        createHighlightElements();
        updateCurrentLineHighlight();
    } else {
        editorContainer.classList.remove('line-highlight-enabled');
        clearCurrentLineHighlight();
        removeHighlightElements();
    }
}

/**
 * 現在行ハイライトのオン/オフ切り替え
 */
export function toggleLineHighlight() {
    currentLineHighlight.enabled = !currentLineHighlight.enabled;
    applyLineHighlightSettings();
    saveLineHighlightSettings();
    
    const status = currentLineHighlight.enabled ? t('lineHighlight.enabled') : t('lineHighlight.disabled');
    console.log(`🎨 Line highlight: ${status}`);
    
    // ステータスメッセージを表示
    showLineHighlightStatus(status);
}

/**
 * 現在行ハイライトの状態を取得
 */
export function isLineHighlightEnabled() {
    return currentLineHighlight.enabled;
}

/**
 * 現在のカーソル行の正確な位置を計算
 */
function calculateCurrentLinePosition() {
    if (!editor) return null;
    
    try {
        const cursorPosition = editor.selectionStart;
        const text = editor.value;
        
        // 現在の論理行の開始位置と終了位置を特定
        const textBeforeCursor = text.substring(0, cursorPosition);
        const textAfterCursor = text.substring(cursorPosition);
        
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const nextNewlineIndex = textAfterCursor.indexOf('\n');
        
        const lineStart = lastNewlineIndex + 1;
        const lineEnd = nextNewlineIndex === -1 ? text.length : cursorPosition + nextNewlineIndex;
        
        const currentLineText = text.substring(lineStart, lineEnd);
        const logicalLineNumber = textBeforeCursor.split('\n').length;
        
        // エディタのスタイル情報を取得
        const editorStyle = getComputedStyle(editor);
        const fontSize = parseFloat(editorStyle.fontSize);
        let lineHeightValue = parseFloat(editorStyle.lineHeight);
        
        if (lineHeightValue < 10) {
            lineHeightValue = fontSize * lineHeightValue;
        }
        
        // エディタの実効幅を計算
        const editorPadding = parseFloat(editorStyle.paddingLeft) + parseFloat(editorStyle.paddingRight);
        const editorBorder = parseFloat(editorStyle.borderLeftWidth) + parseFloat(editorStyle.borderRightWidth);
        const editorWidth = editor.clientWidth - editorPadding - editorBorder;
        
        // カーソル行より前の行数を計算（ワードラップ考慮）
        let visualLinesBefore = 0;
        const lines = text.split('\n');
        
        // 測定用要素を作成
        const measureDiv = document.createElement('div');
        measureDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            top: -9999px;
            left: -9999px;
            font-family: ${editorStyle.fontFamily};
            font-size: ${editorStyle.fontSize};
            line-height: ${editorStyle.lineHeight};
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: normal;
            hyphens: none;
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
            box-sizing: border-box;
        `;
        document.body.appendChild(measureDiv);
        
        // 現在行より前の行の視覚的行数を計算
        for (let i = 0; i < logicalLineNumber - 1; i++) {
            const lineText = lines[i];
            if (lineText === '') {
                visualLinesBefore += 1;
            } else {
                measureDiv.textContent = lineText;
                const height = measureDiv.offsetHeight;
                const displayLines = Math.max(1, Math.round(height / lineHeightValue));
                visualLinesBefore += displayLines;
            }
        }
        
        // 現在行の視覚的行数を計算
        let currentLineVisualLines = 1;
        if (currentLineText !== '') {
            measureDiv.textContent = currentLineText;
            const height = measureDiv.offsetHeight;
            currentLineVisualLines = Math.max(1, Math.round(height / lineHeightValue));
        }
        
        document.body.removeChild(measureDiv);
        
        // ハイライト表示位置を計算
        const paddingTop = parseFloat(editorStyle.paddingTop);
        const highlightTop = paddingTop + (visualLinesBefore * lineHeightValue);
        const highlightHeight = currentLineVisualLines * lineHeightValue;
        
        return {
            top: highlightTop,
            height: highlightHeight,
            logicalLine: logicalLineNumber,
            visualLinesBefore: visualLinesBefore,
            currentLineVisualLines: currentLineVisualLines
        };
        
    } catch (error) {
        console.warn('Failed to calculate current line position:', error);
        return null;
    }
}

/**
 * 現在行ハイライトを更新
 */
/**
 * 現在行ハイライトを更新
 */
/**
 * 現在行ハイライトを更新
 */
/**
 * 現在行ハイライトを更新
 */
export function updateCurrentLineHighlight() {
    if (!currentLineHighlight.enabled || !editor) return;
    
    // ハイライト要素作成
    if (!currentLineHighlight.highlightElement || !currentLineHighlight.highlightElementNumbers) {
        createHighlightElements();
    }
    
    // タイプライターモードチェック
    let isTypewriterEnabled = false;
    try {
        isTypewriterEnabled = isTypewriterModeEnabled && isTypewriterModeEnabled();
    } catch (e) {}
    
    if (isTypewriterEnabled) {
        // タイプライターモード：論理行全体をハイライト
        const editorStyle = getComputedStyle(editor);
        const editorHeight = editor.clientHeight;
        const lineHeight = parseFloat(editorStyle.lineHeight) || 20;
        const paddingTop = parseFloat(editorStyle.paddingTop) || 0;
        
        let centerPosition = 0.5;
        try {
            if (getCurrentTypewriterSettings) {
                centerPosition = getCurrentTypewriterSettings().centerPosition || 0.5;
            }
        } catch (e) {}
        
        // 現在のカーソル位置から論理行を計算
        const cursorPosition = editor.selectionStart;
        const text = editor.value;
        const textBeforeCursor = text.substring(0, cursorPosition);
        const textAfterCursor = text.substring(cursorPosition);
        
        // 現在の論理行の開始と終了を特定
        const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
        const nextNewlineIndex = textAfterCursor.indexOf('\n');
        const lineStart = lastNewlineIndex + 1;
        const lineEnd = nextNewlineIndex === -1 ? text.length : cursorPosition + nextNewlineIndex;
        const currentLineText = text.substring(lineStart, lineEnd);
        
        // 論理行が視覚的に何行になるかを計算
        let visualLineHeight = lineHeight;
        if (currentLineText !== '') {
            // 測定用要素で実際の高さを計算
            const measureDiv = document.createElement('div');
            measureDiv.style.cssText = `
                position: absolute;
                visibility: hidden;
                top: -9999px;
                left: -9999px;
                font-family: ${editorStyle.fontFamily};
                font-size: ${editorStyle.fontSize};
                line-height: ${editorStyle.lineHeight};
                white-space: pre-wrap;
                overflow-wrap: break-word;
                word-wrap: break-word;
                word-break: normal;
                width: ${editor.clientWidth - parseFloat(editorStyle.paddingLeft) - parseFloat(editorStyle.paddingRight)}px;
                padding: 0;
                margin: 0;
                border: none;
                box-sizing: border-box;
            `;
            measureDiv.textContent = currentLineText;
            document.body.appendChild(measureDiv);
            
            const actualHeight = measureDiv.offsetHeight;
            visualLineHeight = Math.max(lineHeight, actualHeight);
            
            document.body.removeChild(measureDiv);
        }
        
        // タイプライターモードでの中央位置を計算
        const centerOffset = editorHeight * centerPosition;
        
        // ハイライトの表示位置（パディングを考慮）
        const highlightTop = centerOffset - paddingTop;
        
        if (currentLineHighlight.highlightElement) {
            currentLineHighlight.highlightElement.style.display = 'block';
            currentLineHighlight.highlightElement.style.top = `${highlightTop}px`;
            currentLineHighlight.highlightElement.style.height = `${visualLineHeight}px`;
            currentLineHighlight.highlightElement.style.left = '0';
            currentLineHighlight.highlightElement.style.right = '0';
        }
        
        if (currentLineHighlight.highlightElementNumbers) {
            currentLineHighlight.highlightElementNumbers.style.display = 'block';
            currentLineHighlight.highlightElementNumbers.style.top = `${highlightTop}px`;
            currentLineHighlight.highlightElementNumbers.style.height = `${visualLineHeight}px`;
            currentLineHighlight.highlightElementNumbers.style.left = '0';
            currentLineHighlight.highlightElementNumbers.style.right = '0';
        }
        
        currentLineHighlight.lastHighlightedLine = textBeforeCursor.split('\n').length;
        return;
    }
    
    // 通常モード（変更なし）
    const position = calculateCurrentLinePosition();
    if (!position) return;
    
    currentLineHighlight.lastHighlightedLine = position.logicalLine;
    
    if (currentLineHighlight.highlightElement) {
        currentLineHighlight.highlightElement.style.display = 'block';
        currentLineHighlight.highlightElement.style.top = `${position.top}px`;
        currentLineHighlight.highlightElement.style.height = `${position.height}px`;
        currentLineHighlight.highlightElement.style.left = '0';
        currentLineHighlight.highlightElement.style.right = '0';
    }
    
    if (currentLineHighlight.highlightElementNumbers) {
        currentLineHighlight.highlightElementNumbers.style.display = 'block';
        currentLineHighlight.highlightElementNumbers.style.top = `${position.top}px`;
        currentLineHighlight.highlightElementNumbers.style.height = `${position.height}px`;
        currentLineHighlight.highlightElementNumbers.style.left = '0';
        currentLineHighlight.highlightElementNumbers.style.right = '0';
    }
}

/**
 * 現在行ハイライトをクリア
 */
export function clearCurrentLineHighlight() {
    if (currentLineHighlight.highlightElement) {
        currentLineHighlight.highlightElement.style.display = 'none';
    }
    
    if (currentLineHighlight.highlightElementNumbers) {
        currentLineHighlight.highlightElementNumbers.style.display = 'none';
    }
    
    currentLineHighlight.lastHighlightedLine = -1;
}

/**
 * 行番号の更新（大量行数対応・ハイライト対応版）
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) return;
    
    try {
        // エディタと完全同期
        const editorStyle = getComputedStyle(editor);
        lineNumbers.style.fontFamily = editorStyle.fontFamily;
        lineNumbers.style.fontSize = editorStyle.fontSize;
        lineNumbers.style.lineHeight = editorStyle.lineHeight;
        
        // 物理行（改行文字による実際の行）で分割
        const physicalLines = editor.value.split('\n');
        const lineCount = physicalLines.length;
        
        // 行番号幅を自動調整
        adjustLineNumberWidth(lineCount);
        
        // エディタの実効幅を正確に計算
        const editorPadding = parseFloat(editorStyle.paddingLeft) + parseFloat(editorStyle.paddingRight);
        const editorBorder = parseFloat(editorStyle.borderLeftWidth) + parseFloat(editorStyle.borderRightWidth);
        const editorWidth = editor.clientWidth - editorPadding - editorBorder;
        
        // 行の高さを正確に計算
        const fontSize = parseFloat(editorStyle.fontSize);
        let lineHeightValue = parseFloat(editorStyle.lineHeight);
        
        // line-heightが相対値（1.5など）の場合は絶対値に変換
        if (lineHeightValue < 10) {
            lineHeightValue = fontSize * lineHeightValue;
        }
        
        // 測定用要素を作成（エディタと完全に同じ設定）
        const measureDiv = document.createElement('div');
        measureDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            top: -9999px;
            left: -9999px;
            font-family: ${editorStyle.fontFamily};
            font-size: ${editorStyle.fontSize};
            line-height: ${editorStyle.lineHeight};
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: normal;
            hyphens: none;
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
            box-sizing: border-box;
        `;
        document.body.appendChild(measureDiv);
        
        const lineNumberParts = [];
        
        // 各物理行を処理
        for (let i = 0; i < physicalLines.length; i++) {
            const physicalLine = physicalLines[i];
            const lineNumber = i + 1;
            
            // 空行の場合は1行として扱う
            if (physicalLine === '') {
                lineNumberParts.push(lineNumber.toString());
                continue;
            }
            
            // この物理行がワードラップで何行になるかを測定
            measureDiv.textContent = physicalLine;
            const actualHeight = measureDiv.offsetHeight;
            const displayLines = Math.max(1, Math.round(actualHeight / lineHeightValue));
            
            // 最初の表示行に行番号を表示（桁数に応じたフォーマット）
            let formattedLineNumber;
            if (lineCount >= 100000) {
                formattedLineNumber = lineNumber.toString().padStart(6, ' ');
            } else if (lineCount >= 10000) {
                formattedLineNumber = lineNumber.toString().padStart(5, ' ');
            } else if (lineCount >= 1000) {
                formattedLineNumber = lineNumber.toString().padStart(4, ' ');
            } else {
                formattedLineNumber = lineNumber.toString();
            }
            
            lineNumberParts.push(formattedLineNumber);
            
            // 残りの表示行（ワードラップされた行）は空白
            for (let j = 1; j < displayLines; j++) {
                lineNumberParts.push(' '.repeat(formattedLineNumber.length));
            }
        }
        
        // 測定用要素削除
        document.body.removeChild(measureDiv);
        
        // 行番号を設定
        lineNumbers.textContent = lineNumberParts.join('\n');
        
        // パフォーマンス情報をログ出力（大量行数の場合のみ）
        if (lineCount >= 1000) {
            console.log(`📊 Large file: ${lineCount} physical lines -> ${lineNumberParts.length} display lines`);
        }
        
        // スクロール同期
        lineNumbers.scrollTop = editor.scrollTop;
        
        // 現在行ハイライトを更新
        if (currentLineHighlight.enabled) {
            setTimeout(() => {
                updateCurrentLineHighlight();
            }, 10);
        }
        
    } catch (error) {
        console.error('❌ Line numbers calculation failed:', error);
        
        // フォールバック: シンプルな論理行番号
        const physicalLines = editor.value.split('\n');
        const lineCount = physicalLines.length;
        
        // 幅調整だけは実行
        adjustLineNumberWidth(lineCount);
        
        const simpleLineNumbers = physicalLines.map((_, i) => (i + 1).toString()).join('\n');
        lineNumbers.textContent = simpleLineNumbers;
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * 現在のカーソル位置の論理行番号を取得
 */
export function getCurrentLogicalLineNumber() {
    if (!editor) return 1;
    
    const cursorPosition = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPosition);
    return textBeforeCursor.split('\n').length;
}

/**
 * 現在のカーソル位置の列番号を取得
 */
export function getCurrentColumnNumber() {
    if (!editor) return 1;
    
    const cursorPosition = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    return lines[lines.length - 1].length + 1;
}

/**
 * キャッシュクリア（行番号即座更新版）
 */
export function clearLineNumberCache() {
    console.log('🗑️ Cache cleared, updating line numbers');
    updateLineNumbers();
}

/**
 * スクロール同期
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        lineNumbers.scrollTop = editor.scrollTop;
        
        // スクロール時にハイライト位置も更新
        if (currentLineHighlight.enabled) {
            setTimeout(() => {
                updateCurrentLineHighlight();
            }, 10);
        }
    }
}

/**
 * 強制スクロール同期
 */
export function forceSyncLineNumbers() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            syncScroll();
            resolve();
        });
    });
}

/**
 * ステータスバー更新（ハイライト対応）
 */
export function updateStatus() {
    updateStatusElements();
    syncScroll();
    
    // 現在行ハイライトを更新
    if (currentLineHighlight.enabled) {
        setTimeout(() => {
            updateCurrentLineHighlight();
        }, 10);
    }
    
    if (isTypewriterModeEnabled()) {
        setTimeout(() => centerCurrentLine(), 10);
    }
}

/**
 * タイプライターモード付きステータス更新（ハイライト対応）
 */
export function updateStatusWithTypewriter() {
    updateStatusElements();
    syncScroll();
    
    // 現在行ハイライトを更新
    if (currentLineHighlight.enabled) {
        updateCurrentLineHighlight();
    }
    
    if (isTypewriterModeEnabled()) {
        centerCurrentLine();
    }
}

/**
 * ステータス要素の更新
 */
function updateStatusElements() {
    try {
        const cursorPosition = document.getElementById('cursor-position');
        const charCount = document.getElementById('char-count');
        const fileEncoding = document.getElementById('file-encoding');
        const fontSizeDisplay = document.getElementById('font-size-display');
        
        if (cursorPosition) {
            const line = getCurrentLogicalLineNumber();
            const column = getCurrentColumnNumber();
            cursorPosition.textContent = `${t('statusBar.line')}: ${line}, ${t('statusBar.column')}: ${column}`;
        }
        
        if (fileEncoding) {
            fileEncoding.textContent = t('statusBar.encoding');
        }
        
        if (charCount && editor) {
            const totalLines = editor.value.split('\n').length;
            charCount.textContent = `${t('statusBar.charCount')}: ${editor.value.length} | ${t('statusBar.lineCount')}: ${totalLines}`;
        }
        
        if (fontSizeDisplay) {
            const fontSettings = getCurrentFontSettings();
            fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: ${fontSettings.fontSize}px`;
        }
    } catch (error) {
        console.error('Status update failed:', error);
    }
}

/**
 * スクロールイベント処理
 */
export function handleScrollEvent() {
    syncScroll();
    
    if (isTypewriterModeEnabled()) {
        setTimeout(() => {
            if (isTypewriterModeEnabled()) {
                centerCurrentLine();
            }
        }, 100);
    }
}

/**
 * エディタリサイズ処理
 */
export function handleEditorResize() {
    console.log('📐 Editor resize');
    
    updateLineNumbers();
    
    if (isTypewriterModeEnabled()) {
        onWindowResize();
    }
    
    updateStatus();
}

/**
 * ファイル名抽出
 */
function getFileNameFromPath(filePath) {
    if (!filePath) return null;
    
    const separators = ['/', '\\'];
    let fileName = filePath;
    
    for (const sep of separators) {
        const lastIndex = filePath.lastIndexOf(sep);
        if (lastIndex !== -1) {
            fileName = filePath.substring(lastIndex + 1);
            break;
        }
    }
    
    return fileName;
}

/**
 * ウィンドウタイトル更新（Tauri 2.5対応）
 */
export async function updateWindowTitle() {
    try {
        let newTitle;
        
        if (currentFilePath) {
            const fileName = getFileNameFromPath(currentFilePath);
            newTitle = fileName ? t('window.titleFormat', { filename: fileName }) : t('window.defaultTitle');
        } else {
            newTitle = t('window.defaultTitle');
        }
        
        // Tauri 2.5 API
        if (window.__TAURI__?.window) {
            const { getCurrentWindow } = window.__TAURI__.window;
            const currentWindow = getCurrentWindow();
            await currentWindow.setTitle(newTitle);
            console.log('✅ Title updated via Tauri 2.5 API');
        } else {
            // フォールバック
            document.title = newTitle;
            console.log('✅ Title updated via document.title');
        }
        
    } catch (error) {
        console.error('❌ Title update failed:', error);
        document.title = currentFilePath ? 
            `Vinsert - ${getFileNameFromPath(currentFilePath)}` : 
            'Vinsert - Untitled';
    }
}

/**
 * フォントサイズ表示更新
 */
export function updateFontSizeDisplay() {
    try {
        const fontSizeDisplay = document.getElementById('font-size-display');
        if (fontSizeDisplay) {
            const fontSettings = getCurrentFontSettings();
            fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: ${fontSettings.fontSize}px`;
        }
    } catch (error) {
        console.error('Font size display update failed:', error);
    }
}

/**
 * 初期化時の行番号設定
 */
export function initializeLineNumbers() {
    console.log('📊 Initializing line numbers with highlight support...');
    
    // ハイライト設定を読み込み
    loadLineHighlightSettings();
    
    // 少し遅延させてDOM要素が確実に存在することを保証
    setTimeout(() => {
        updateLineNumbers();
        updateStatus();
        console.log('🎨 Line highlight initialized:', currentLineHighlight.enabled);
    }, 100);
}

/**
 * ハイライトステータスメッセージを表示
 */
function showLineHighlightStatus(message) {
    // 既存のメッセージがあれば削除
    const existingStatus = document.querySelector('.line-highlight-status-message');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const statusMessage = document.createElement('div');
    statusMessage.className = 'line-highlight-status-message';
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
 * デバッグ情報
 */
export function debugScrollSync() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        const totalLines = editor.value.split('\n').length;
        const position = calculateCurrentLinePosition();
        
        console.log('🐛 Debug info:', {
            editorScrollTop: editor.scrollTop,
            lineNumbersScrollTop: lineNumbers.scrollTop,
            difference: Math.abs(editor.scrollTop - lineNumbers.scrollTop),
            logicalLineCount: totalLines,
            currentLine: getCurrentLogicalLineNumber(),
            currentColumn: getCurrentColumnNumber(),
            lineNumberWidth: lineNumbers.style.width,
            highlightEnabled: currentLineHighlight.enabled,
            highlightedLine: currentLineHighlight.lastHighlightedLine,
            highlightPosition: position
        });
    }
}