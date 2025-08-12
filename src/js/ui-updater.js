/*
 * =====================================================
 * Vinsert Editor - UI更新機能（多言語化対応版）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke, isLineHighlightEnabled, currentHighlightedLine, setCurrentHighlightedLine } from './globals.js';
import { getCurrentFontSettings } from './font-settings.js';
import { t } from './locales.js';

/**
 * 行番号の更新（論理行対応版・行番号は論理行の先頭に表示）
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) return;
    
    // グローバルに公開（タイプライターモードから呼び出せるように）
    window.updateLineNumbers = updateLineNumbers;
       
    const lines = editor.value.split('\n');
    const lineCount = lines.length;
    
    // 各論理行の物理的な高さを計算するための準備
    const computedStyle = window.getComputedStyle(editor);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const editorWidth = editor.clientWidth - 
                        parseFloat(computedStyle.paddingLeft) - 
                        parseFloat(computedStyle.paddingRight);
    
    // フォントメトリクスを取得するための一時的なキャンバス
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = computedStyle.font;
    
    // 各行の行番号と高さを計算
    let lineNumbersHTML = '';
    let totalHeight = 0;
    
    for (let i = 0; i < lineCount; i++) {
        const lineNumber = i + 1;
        const lineText = lines[i];
        
        // 空行の場合は1行分の高さ
        if (lineText === '') {
            lineNumbersHTML += `<div class="line-number" style="height: ${lineHeight}px; line-height: ${lineHeight}px;">${lineNumber}</div>`;
            totalHeight += lineHeight;
            continue;
        }
        
        // テキストの幅を計算して何行分になるか判定
        const textWidth = context.measureText(lineText).width;
        const wrappedLines = Math.max(1, Math.ceil(textWidth / editorWidth));
        const lineBlockHeight = wrappedLines * lineHeight;
        
        // 行番号要素を作成（行番号は論理行の先頭に配置）
        lineNumbersHTML += `<div class="line-number" style="height: ${lineBlockHeight}px; line-height: ${lineHeight}px;">${lineNumber}</div>`;
        totalHeight += lineBlockHeight;
    }
    
    // 行番号をHTMLとして設定
    lineNumbers.innerHTML = lineNumbersHTML;
    
    // スクロール位置を同期
    syncScroll();
}

/**
 * 行番号とエディタのスクロール同期
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * 現在の論理行をハイライト
 */
export function updateLineHighlight() {
    if (!editor || !isLineHighlightEnabled) {
        // ハイライトが無効な場合は既存のハイライトを削除
        const existingHighlight = document.querySelector('.line-highlight-overlay');
        if (existingHighlight) {
            existingHighlight.remove();
        }
        return;
    }
    
    const cursorPos = editor.selectionStart;
    const textBeforeCursor = editor.value.substring(0, cursorPos);
    const currentLine = textBeforeCursor.split('\n').length;
    
    // 行が変わっていない場合でも、スクロール時のために位置を更新
    setCurrentHighlightedLine(currentLine);
    
    // 既存のハイライトを削除
    const existingHighlight = document.querySelector('.line-highlight-overlay');
    if (existingHighlight) {
        existingHighlight.remove();
    }
    
    // 新しいハイライトを作成
    const lines = editor.value.split('\n');
    const computedStyle = window.getComputedStyle(editor);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const editorWidth = editor.clientWidth - 
                        parseFloat(computedStyle.paddingLeft) - 
                        parseFloat(computedStyle.paddingRight);
    
    // キャンバスを使って各行の高さを計算
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = computedStyle.font;
    
    let topPosition = paddingTop;
    let highlightHeight = lineHeight;
    
    // 現在の行までの高さを計算
    for (let i = 0; i < currentLine - 1; i++) {
        const lineText = lines[i] || '';
        if (lineText === '') {
            topPosition += lineHeight;
        } else {
            const textWidth = context.measureText(lineText).width;
            const wrappedLines = Math.max(1, Math.ceil(textWidth / editorWidth));
            topPosition += wrappedLines * lineHeight;
        }
    }
    
    // 現在の論理行の高さを計算（折り返しも考慮）
    const currentLineText = lines[currentLine - 1] || '';
    if (currentLineText !== '') {
        const textWidth = context.measureText(currentLineText).width;
        const wrappedLines = Math.max(1, Math.ceil(textWidth / editorWidth));
        highlightHeight = wrappedLines * lineHeight;
    }
    
    // ハイライト要素を作成
    const highlight = document.createElement('div');
    highlight.className = 'line-highlight-overlay';
    highlight.style.top = (topPosition - editor.scrollTop) + 'px';
    highlight.style.height = highlightHeight + 'px';
    highlight.style.width = editor.clientWidth + 'px';
    highlight.style.left = '0';
    
    // エディタコンテナに追加
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
        editorContainer.appendChild(highlight);
    }
}

// src/js/ui-updater.js の updateStatus 関数内の該当部分を修正

/**
 * ステータスバーの更新（多言語化対応・スペース修正版）
 */
export function updateStatus() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fileEncoding = document.getElementById('file-encoding');
    const fontSizeDisplay = document.getElementById('font-size-display');
    
    if (cursorPosition) {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        cursorPosition.textContent = `${t('statusBar.line')}: ${line}, ${t('statusBar.column')}: ${column}`;
    }
    
    if (fileEncoding) {
        fileEncoding.textContent = t('statusBar.encoding');
    }
    
    if (charCount) {
        charCount.textContent = `${t('statusBar.charCount')}: ${editor.value.length}`;
    }
    
    // 選択中の文字数表示を更新（修正版）
    const selectionCount = document.getElementById('selection-count');
    if (selectionCount) {
        const selectionStart = editor.selectionStart;
        const selectionEnd = editor.selectionEnd;
        
        if (selectionStart !== selectionEnd) {
            // 文字が選択されている場合
            const selectedLength = selectionEnd - selectionStart;
            // スペースを削除（CSSのmarginで間隔を制御）
            selectionCount.textContent = `${t('statusBar.selectionCount')}: ${selectedLength}`;
            selectionCount.style.display = 'inline';
        } else {
            // 選択されていない場合は非表示
            selectionCount.style.display = 'none';
        }
    }
    
    // フォントサイズ表示の更新
    if (fontSizeDisplay) {
        const fontSettings = getCurrentFontSettings();
        fontSizeDisplay.textContent = `${t('statusBar.fontSize')}: ${fontSettings.fontSize}px`;
    }
    
    // 行ハイライトも更新
    updateLineHighlight();
    
    // 空白文字可視化も更新
    updateWhitespaceMarkersIfEnabled();
}

/**
 * 空白文字可視化が有効な場合のみマーカーを更新
 */
function updateWhitespaceMarkersIfEnabled() {
    try {
        // 動的インポートで循環依存を避ける
        import('./whitespace-visualizer.js').then(module => {
            module.updateWhitespaceMarkers();
        });
    } catch (error) {
        // 空白文字可視化機能が無効な場合は何もしない
    }
}

/**
 * スクロール時の空白文字マーカー更新
 */
export function updateWhitespaceMarkersOnScroll() {
    try {
        import('./whitespace-visualizer.js').then(module => {
            module.updateWhitespaceMarkersOnScroll();
        });
    } catch (error) {
        // 空白文字可視化機能が無効な場合は何もしない
    }
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
 * 空白文字可視化が有効な場合のみマーカーを更新
 */
function updateWhitespaceMarkersIfEnabled() {
    try {
        // 動的インポートで循環依存を避ける
        import('./whitespace-visualizer.js').then(module => {
            module.updateWhitespaceMarkers();
        }).catch(() => {
            // 空白文字可視化機能が無効な場合は何もしない
        });
    } catch (error) {
        // 空白文字可視化機能が無効な場合は何もしない
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