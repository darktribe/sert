/*
 * =====================================================
 * Vinsert Editor - UI更新機能（論理行ベース行番号修正版）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke } from './globals.js';
import { getCurrentFontSettings } from './font-settings.js';
import { centerCurrentLine, isTypewriterModeEnabled, onWindowResize } from './typewriter-mode.js';
import { t } from './locales.js';

/**
 * 行番号の更新（論理行ベース完全修正版）
 * 物理行（改行文字による行）の最初の表示行にのみ行番号を表示し、
 * ワードラップされた行は空白にする
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
        
        // エディタの実効幅を正確に計算
        const editorPadding = parseFloat(editorStyle.paddingLeft) + parseFloat(editorStyle.paddingRight);
        const editorBorder = parseFloat(editorStyle.borderLeftWidth) + parseFloat(editorStyle.borderRightWidth);
        const editorWidth = editor.clientWidth - editorPadding - editorBorder;
        
        // 行の高さを正確に計算
        const fontSize = parseFloat(editorStyle.fontSize);
        let lineHeightValue = parseFloat(editorStyle.lineHeight);
        
        // line-heightが相対値（1.5など）の場合は絶対値に変換
        if (lineHeightValue < 10) { // 相対値と判定
            lineHeightValue = fontSize * lineHeightValue;
        }
        
        console.log('📊 Line height calculation:', {
            fontSize,
            lineHeightFromStyle: editorStyle.lineHeight,
            calculatedLineHeight: lineHeightValue,
            editorWidth
        });
        
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
            
            console.log(`📊 Line ${lineNumber}: "${physicalLine.substring(0, 30)}..." -> ${displayLines} display lines`);
            
            // 最初の表示行に行番号を表示
            lineNumberParts.push(lineNumber.toString());
            
            // 残りの表示行（ワードラップされた行）は空白
            for (let j = 1; j < displayLines; j++) {
                lineNumberParts.push(' ');
            }
        }
        
        // 測定用要素削除
        document.body.removeChild(measureDiv);
        
        // 行番号を設定
        lineNumbers.textContent = lineNumberParts.join('\n');
        
        console.log(`📊 Final result: ${physicalLines.length} physical lines -> ${lineNumberParts.length} display lines`);
        console.log('📊 Line numbers preview:', lineNumberParts.slice(0, 10).join('|'));
        
        // スクロール同期
        lineNumbers.scrollTop = editor.scrollTop;
        
    } catch (error) {
        console.error('❌ Line numbers calculation failed:', error);
        
        // フォールバック: シンプルな論理行番号
        const physicalLines = editor.value.split('\n');
        const simpleLineNumbers = physicalLines.map((_, i) => (i + 1).toString()).join('\n');
        lineNumbers.textContent = simpleLineNumbers;
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * より正確な行番号更新（デバッグ強化版）
 */
export function updateLineNumbersWithDebug() {
    console.log('🐛 DEBUG: Starting line numbers update...');
    
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) {
        console.log('🐛 DEBUG: Missing elements');
        return;
    }
    
    try {
        const editorStyle = getComputedStyle(editor);
        const physicalLines = editor.value.split('\n');
        
        console.log('🐛 DEBUG: Physical lines:', physicalLines.length);
        console.log('🐛 DEBUG: First few lines:', physicalLines.slice(0, 3).map((line, i) => `${i+1}: "${line}"`));
        
        // エディタの設定を詳細に取得
        const fontSize = parseFloat(editorStyle.fontSize);
        const lineHeightStr = editorStyle.lineHeight;
        let lineHeightValue = parseFloat(lineHeightStr);
        
        if (lineHeightValue < 10) {
            lineHeightValue = fontSize * lineHeightValue;
        }
        
        const editorRect = editor.getBoundingClientRect();
        const editorPadding = parseFloat(editorStyle.paddingLeft) + parseFloat(editorStyle.paddingRight);
        const editorBorder = parseFloat(editorStyle.borderLeftWidth) + parseFloat(editorStyle.borderRightWidth);
        const editorWidth = editor.clientWidth - editorPadding - editorBorder;
        
        console.log('🐛 DEBUG: Editor metrics:', {
            fontSize,
            lineHeightStr,
            lineHeightValue,
            editorWidth,
            clientWidth: editor.clientWidth,
            padding: editorPadding,
            border: editorBorder
        });
        
        // 実際の測定テスト
        const testDiv = document.createElement('div');
        testDiv.style.cssText = `
            position: absolute;
            visibility: hidden;
            top: -9999px;
            left: -9999px;
            font-family: ${editorStyle.fontFamily};
            font-size: ${fontSize}px;
            line-height: ${lineHeightValue}px;
            white-space: pre-wrap;
            overflow-wrap: break-word;
            word-wrap: break-word;
            word-break: normal;
            width: ${editorWidth}px;
            padding: 0;
            margin: 0;
            border: none;
        `;
        document.body.appendChild(testDiv);
        
        const lineNumberParts = [];
        
        for (let i = 0; i < physicalLines.length; i++) {
            const line = physicalLines[i];
            const lineNum = i + 1;
            
            if (line === '') {
                console.log(`🐛 DEBUG: Line ${lineNum}: EMPTY -> 1 display line`);
                lineNumberParts.push(lineNum.toString());
                continue;
            }
            
            testDiv.textContent = line;
            const height = testDiv.offsetHeight;
            const displayLines = Math.max(1, Math.round(height / lineHeightValue));
            
            console.log(`🐛 DEBUG: Line ${lineNum}: "${line.substring(0, 20)}..." (${line.length} chars) -> height: ${height}px, lines: ${displayLines}`);
            
            lineNumberParts.push(lineNum.toString());
            for (let j = 1; j < displayLines; j++) {
                lineNumberParts.push(' ');
            }
        }
        
        document.body.removeChild(testDiv);
        
        console.log('🐛 DEBUG: Final line number parts:', lineNumberParts.slice(0, 10));
        
        lineNumbers.textContent = lineNumberParts.join('\n');
        lineNumbers.scrollTop = editor.scrollTop;
        
        console.log('🐛 DEBUG: Line numbers update complete');
        
    } catch (error) {
        console.error('🐛 DEBUG: Error in line numbers update:', error);
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
 * ステータスバー更新
 */
export function updateStatus() {
    updateStatusElements();
    syncScroll();
    
    if (isTypewriterModeEnabled()) {
        setTimeout(() => centerCurrentLine(), 10);
    }
}

/**
 * タイプライターモード付きステータス更新
 */
export function updateStatusWithTypewriter() {
    updateStatusElements();
    syncScroll();
    
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
            charCount.textContent = `${t('statusBar.charCount')}: ${editor.value.length}`;
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
    console.log('📊 Initializing line numbers...');
    
    // 少し遅延させてDOM要素が確実に存在することを保証
    setTimeout(() => {
        updateLineNumbers();
        updateStatus();
    }, 100);
}

/**
 * デバッグ情報
 */
export function debugScrollSync() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        console.log('🐛 Debug info:', {
            editorScrollTop: editor.scrollTop,
            lineNumbersScrollTop: lineNumbers.scrollTop,
            difference: Math.abs(editor.scrollTop - lineNumbers.scrollTop),
            logicalLineCount: editor.value.split('\n').length,
            currentLine: getCurrentLogicalLineNumber(),
            currentColumn: getCurrentColumnNumber()
        });
    }
}

/**
 * 行番号計算のテスト関数（デバッグ用）
 */
export function testLineNumberCalculation() {
    console.log('🧪 Testing line number calculation...');
    updateLineNumbersWithDebug();
}

// デバッグ用にグローバルに公開
if (typeof window !== 'undefined') {
    window.testLineNumberCalculation = testLineNumberCalculation;
    window.updateLineNumbersWithDebug = updateLineNumbersWithDebug;
}