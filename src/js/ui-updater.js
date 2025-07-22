/*
 * =====================================================
 * Vinsert Editor - UI更新機能（正しい行番号表示位置・タイプライターモード対応版）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke } from './globals.js';
import { getCurrentFontSettings } from './font-settings.js';
import { centerCurrentLine, isTypewriterModeEnabled, onWindowResize } from './typewriter-mode.js';
import { t } from './locales.js';

// 行番号計算用のキャッシュ
let lineNumberCache = {
    lastContent: '',
    lastWidth: 0,
    lastFontSize: 0,
    lineNumbers: []
};

/**
 * エディタの表示幅（文字数）を計算
 */
function getEditorDisplayWidth() {
    if (!editor) return 80;
    
    const style = getComputedStyle(editor);
    const fontSize = parseFloat(style.fontSize);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const borderLeft = parseFloat(style.borderLeftWidth);
    const borderRight = parseFloat(style.borderRightWidth);
    
    const contentWidth = editor.clientWidth - paddingLeft - paddingRight - borderLeft - borderRight;
    
    // 等幅フォントの文字幅を概算
    const charWidth = fontSize * 0.55;
    const charsPerLine = Math.floor(contentWidth / charWidth);
    
    return Math.max(20, charsPerLine); // 最低20文字は確保
}

/**
 * 論理行を視覚行に展開して、各視覚行の行番号を計算
 */
function calculateLineNumbersForVisualLines() {
    if (!editor) return [];
    
    const content = editor.value;
    const editorWidth = getEditorDisplayWidth();
    const currentFontSize = parseFloat(getComputedStyle(editor).fontSize);
    
    // キャッシュをチェック
    if (lineNumberCache.lastContent === content && 
        lineNumberCache.lastWidth === editorWidth &&
        lineNumberCache.lastFontSize === currentFontSize) {
        return lineNumberCache.lineNumbers;
    }
    
    console.log(`📊 Calculating line numbers for visual lines (width: ${editorWidth} chars)`);
    
    const logicalLines = content.split('\n');
    const visualLineNumbers = [];
    
    for (let logicalIndex = 0; logicalIndex < logicalLines.length; logicalIndex++) {
        const logicalLine = logicalLines[logicalIndex];
        const logicalLineNumber = logicalIndex + 1;
        
        if (logicalLine.length === 0) {
            // 空行の場合
            visualLineNumbers.push(logicalLineNumber);
        } else if (logicalLine.length <= editorWidth) {
            // 1行に収まる場合
            visualLineNumbers.push(logicalLineNumber);
        } else {
            // ワードラップが発生する場合
            let remainingText = logicalLine;
            let isFirstVisualLine = true;
            
            while (remainingText.length > 0) {
                if (isFirstVisualLine) {
                    // 論理行の最初の視覚行には行番号を表示
                    visualLineNumbers.push(logicalLineNumber);
                    isFirstVisualLine = false;
                } else {
                    // 継続行には空文字（行番号なし）
                    visualLineNumbers.push('');
                }
                
                // 次のチャンクに進む
                if (remainingText.length <= editorWidth) {
                    break;
                } else {
                    remainingText = remainingText.substring(editorWidth);
                }
            }
        }
    }
    
    // キャッシュを更新
    lineNumberCache = {
        lastContent: content,
        lastWidth: editorWidth,
        lastFontSize: currentFontSize,
        lineNumbers: visualLineNumbers
    };
    
    console.log(`📊 Generated ${visualLineNumbers.length} visual lines for ${logicalLines.length} logical lines`);
    
    return visualLineNumbers;
}

/**
 * より正確な行番号計算（DOM測定ベース）
 */
function calculateAccurateLineNumbers() {
    if (!editor) return [];
    
    const content = editor.value;
    const currentFontSize = parseFloat(getComputedStyle(editor).fontSize);
    
    // 測定用DIVを作成
    const measureDiv = document.createElement('div');
    const editorStyle = getComputedStyle(editor);
    
    measureDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        top: -9999px;
        left: -9999px;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        word-wrap: break-word;
        word-break: normal;
        font-family: ${editorStyle.fontFamily};
        font-size: ${editorStyle.fontSize};
        line-height: ${editorStyle.lineHeight};
        padding: ${editorStyle.padding};
        border: ${editorStyle.border};
        width: ${editor.clientWidth - 20}px;
        box-sizing: border-box;
    `;
    
    document.body.appendChild(measureDiv);
    
    try {
        const logicalLines = content.split('\n');
        const visualLineNumbers = [];
        const lineHeight = parseFloat(editorStyle.lineHeight);
        
        for (let logicalIndex = 0; logicalIndex < logicalLines.length; logicalIndex++) {
            const logicalLine = logicalLines[logicalIndex];
            const logicalLineNumber = logicalIndex + 1;
            
            // 測定用DIVに現在の論理行を設定
            measureDiv.textContent = logicalLine || ' '; // 空行の場合はスペースを設定
            
            // 高さを測定して視覚行数を計算
            const height = measureDiv.offsetHeight;
            const visualLinesInThisLogical = Math.max(1, Math.round(height / lineHeight));
            
            // 最初の視覚行には行番号、残りは空文字
            for (let i = 0; i < visualLinesInThisLogical; i++) {
                if (i === 0) {
                    visualLineNumbers.push(logicalLineNumber);
                } else {
                    visualLineNumbers.push('');
                }
            }
        }
        
        document.body.removeChild(measureDiv);
        
        console.log(`📐 Accurate measurement: ${visualLineNumbers.length} visual lines for ${logicalLines.length} logical lines`);
        
        return visualLineNumbers;
        
    } catch (error) {
        document.body.removeChild(measureDiv);
        console.warn('Failed to calculate accurate line numbers, falling back to simple calculation:', error);
        return calculateLineNumbersForVisualLines();
    }
}

/**
 * 行番号の更新（正しい表示位置）
 * 論理行の先頭にのみ行番号を表示し、ワードラップによる継続行には空白を表示
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers) return;
    
    // より正確な行番号計算を使用
    const visualLineNumbers = calculateAccurateLineNumbers();
    
    // 行番号文字列を生成
    let lineNumbersContent = '';
    for (let i = 0; i < visualLineNumbers.length; i++) {
        const lineNumber = visualLineNumbers[i];
        
        if (lineNumber === '') {
            // 継続行の場合は空文字
            lineNumbersContent += '';
        } else {
            // 論理行の先頭の場合は行番号
            lineNumbersContent += lineNumber;
        }
        
        // 最後の行以外は改行を追加
        if (i < visualLineNumbers.length - 1) {
            lineNumbersContent += '\n';
        }
    }
    
    lineNumbers.textContent = lineNumbersContent;
    
    const logicalLineCount = editor.value.split('\n').length;
    const visualLineCount = visualLineNumbers.length;
    
    console.log(`📊 Line numbers updated: ${logicalLineCount} logical lines → ${visualLineCount} visual lines`);
    
    // 行番号更新後に即座にスクロール同期
    syncScroll();
}

/**
 * 現在のカーソル位置の論理行番号を取得
 */
export function getCurrentLogicalLineNumber() {
    if (!editor) return 1;
    
    const cursorPosition = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPosition);
    const logicalLines = textBeforeCursor.split('\n');
    
    return logicalLines.length;
}

/**
 * 現在のカーソル位置の列番号を取得
 */
export function getCurrentColumnNumber() {
    if (!editor) return 1;
    
    const cursorPosition = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPosition);
    const logicalLines = textBeforeCursor.split('\n');
    const currentLineText = logicalLines[logicalLines.length - 1];
    
    return currentLineText.length + 1;
}

/**
 * エディタサイズ変更時にキャッシュをクリア
 */
export function clearLineNumberCache() {
    lineNumberCache = {
        lastContent: '',
        lastWidth: 0,
        lastFontSize: 0,
        lineNumbers: []
    };
    console.log('🗑️ Line number cache cleared');
}

/**
 * 行番号とエディタのスクロール同期（強化版）
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        // タイプライターモードが有効な場合も強制的に同期
        lineNumbers.scrollTop = editor.scrollTop;
        
        // デバッグログ（必要に応じてコメントアウト）
        // console.log('🔗 Line numbers synced:', editor.scrollTop);
    }
}

/**
 * 強制的な行番号同期（タイプライターモード専用）
 */
export function forceSyncLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        // 少し遅延させてからプロミス形式で同期
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                lineNumbers.scrollTop = editor.scrollTop;
                console.log('🔗 Force sync line numbers:', editor.scrollTop);
                resolve();
            });
        });
    }
    return Promise.resolve();
}

/**
 * ステータスバーの更新（論理行・列番号表示）
 * カーソル移動時にタイプライターモードも適用
 */
export function updateStatus() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fileEncoding = document.getElementById('file-encoding');
    const fontSizeDisplay = document.getElementById('font-size-display');
    
    if (cursorPosition) {
        // 論理行・列番号を取得
        const logicalLine = getCurrentLogicalLineNumber();
        const column = getCurrentColumnNumber();
        
        cursorPosition.textContent = `${t('statusBar.line')}: ${logicalLine}, ${t('statusBar.column')}: ${column}`;
    }
    
    if (fileEncoding) {
        fileEncoding.textContent = t('statusBar.encoding');
    }
    
    if (charCount) {
        charCount.textContent = `${t('statusBar.charCount')}: ${editor.value.length}`;
    }
    
    // フォントサイズ表示の更新
    if (fontSizeDisplay) {
        const fontSettings = getCurrentFontSettings();
        fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: ${fontSettings.fontSize}px`;
    }
    
    // 行番号同期を確実に実行
    syncScroll();
    
    // タイプライターモード適用（カーソル移動時）
    // 遅延実行でスムーズな動作を確保
    if (isTypewriterModeEnabled()) {
        setTimeout(() => {
            centerCurrentLine();
        }, 10);
    }
}

/**
 * カーソル移動専用のステータス更新（タイプライターモード含む）
 * キーボードイベントやクリックイベントから呼び出される
 */
export function updateStatusWithTypewriter() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fileEncoding = document.getElementById('file-encoding');
    const fontSizeDisplay = document.getElementById('font-size-display');
    
    if (cursorPosition) {
        // 論理行・列番号を取得
        const logicalLine = getCurrentLogicalLineNumber();
        const column = getCurrentColumnNumber();
        
        cursorPosition.textContent = `${t('statusBar.line')}: ${logicalLine}, ${t('statusBar.column')}: ${column}`;
    }
    
    if (fileEncoding) {
        fileEncoding.textContent = t('statusBar.encoding');
    }
    
    if (charCount) {
        charCount.textContent = `${t('statusBar.charCount')}: ${editor.value.length}`;
    }
    
    // フォントサイズ表示の更新
    if (fontSizeDisplay) {
        const fontSettings = getCurrentFontSettings();
        fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: ${fontSettings.fontSize}px`;
    }
    
    // 行番号同期を確実に実行
    syncScroll();
    
    // タイプライターモード適用（カーソル移動時により積極的に適用）
    if (isTypewriterModeEnabled()) {
        centerCurrentLine();
    }
}

/**
 * スクロール位置のリアルタイム監視とタイプライターモード適用
 */
export function handleScrollEvent() {
    // 通常のスクロール同期
    syncScroll();
    
    // タイプライターモードが有効な場合の追加処理
    if (isTypewriterModeEnabled()) {
        // ユーザーによる手動スクロールと自動スクロールを区別するため、
        // 短時間だけ待ってからタイプライター調整を行う
        setTimeout(() => {
            // この時点でまだタイプライターモードが有効であれば調整
            if (isTypewriterModeEnabled()) {
                centerCurrentLine();
            }
        }, 100);
    }
}

/**
 * エディタのリサイズイベント処理（ウィンドウサイズ変更時など）
 */
export function handleEditorResize() {
    console.log('📐 Editor resize detected');
    
    // キャッシュをクリア（サイズが変わったため）
    clearLineNumberCache();
    
    // 行番号を再計算（論理行のみ）
    updateLineNumbers();
    
    // タイプライターモードが有効な場合はリサイズ処理を実行
    if (isTypewriterModeEnabled()) {
        console.log('📝 Triggering typewriter mode resize');
        onWindowResize();
    }
    
    // ステータスも更新
    updateStatus();
}

/**
 * ファイルパスからファイル名を抽出
 */
function getFileNameFromPath(filePath) {
    if (!filePath) return null;
    
    console.log('🏷️ Extracting filename from path:', filePath);
    
    // WindowsとUnix系両方のパス区切り文字に対応
    const pathSeparators = ['/', '\\'];
    let fileName = filePath;
    
    for (const separator of pathSeparators) {
        const lastIndex = filePath.lastIndexOf(separator);
        if (lastIndex !== -1) {
            fileName = filePath.substring(lastIndex + 1);
            break;
        }
    }
    
    console.log('📁 Extracted filename:', fileName);
    return fileName;
}

/**
 * ウィンドウタイトルの更新（多言語化対応）
 */
export async function updateWindowTitle() {
    try {
        console.log('🏷️ Updating window title...');
        console.log('Current file path:', currentFilePath);
        
        let newTitle;
        
        if (currentFilePath) {
            const fileName = getFileNameFromPath(currentFilePath);
            if (fileName) {
                newTitle = t('window.titleFormat', { filename: fileName });
            } else {
                newTitle = t('window.defaultTitle');
            }
        } else {
            newTitle = t('window.defaultTitle');
        }
        
        console.log('🏷️ New title:', newTitle);
        
        // Tauri 2.5のウィンドウタイトル更新API
        if (window.__TAURI__ && window.__TAURI__.window) {
            console.log('🏷️ Using Tauri window API');
            const { getCurrentWindow } = window.__TAURI__.window;
            const currentWindow = getCurrentWindow();
            
            await currentWindow.setTitle(newTitle);
            console.log('✅ Window title updated successfully via Tauri API');
            
        } else if (tauriInvoke) {
            console.log('🏷️ Fallback: Using Tauri invoke (if available)');
            // Tauri invokeでのフォールバック（カスタムコマンドが必要）
            console.log('⚠️ Tauri invoke fallback not implemented for setTitle');
            
        } else {
            console.log('🏷️ Fallback: Using document.title');
            // 最後の手段: document.title（開発環境用）
            document.title = newTitle;
            console.log('✅ Document title updated as fallback');
        }
        
    } catch (error) {
        console.error('❌ Failed to update window title:', error);
        
        // エラー時のフォールバック
        try {
            const fallbackTitle = currentFilePath ? 
                t('window.titleFormat', { filename: getFileNameFromPath(currentFilePath) || t('window.defaultTitle').replace('Sert - ', '') }) : 
                t('window.defaultTitle');
            document.title = fallbackTitle;
            console.log('✅ Fallback title set:', fallbackTitle);
        } catch (fallbackError) {
            console.error('❌ Even fallback title update failed:', fallbackError);
        }
    }
}

/**
 * フォントサイズ表示のみを更新（フォント設定変更時に呼び出し）
 */
export function updateFontSizeDisplay() {
    const fontSizeDisplay = document.getElementById('font-size-display');
    if (fontSizeDisplay) {
        const fontSettings = getCurrentFontSettings();
        fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: ${fontSettings.fontSize}px`;
    }
}

/**
 * デバッグ用：スクロール同期の状態を確認
 */
export function debugScrollSync() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        const logicalLineCount = editor.value.split('\n').length;
        const currentLogicalLine = getCurrentLogicalLineNumber();
        const visualLines = calculateAccurateLineNumbers();
        
        console.log('🐛 Scroll sync debug:', {
            editorScrollTop: editor.scrollTop,
            lineNumbersScrollTop: lineNumbers.scrollTop,
            difference: Math.abs(editor.scrollTop - lineNumbers.scrollTop),
            typewriterModeEnabled: isTypewriterModeEnabled(),
            logicalLineCount: logicalLineCount,
            visualLineCount: visualLines.length,
            currentLogicalLine: currentLogicalLine,
            currentColumn: getCurrentColumnNumber(),
            cacheStatus: {
                hasCachedData: lineNumberCache.lineNumbers.length > 0,
                cacheWidth: lineNumberCache.lastWidth,
                cacheFontSize: lineNumberCache.lastFontSize
            }
        });
    }
}