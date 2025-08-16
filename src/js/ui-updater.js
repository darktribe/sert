/*
 * =====================================================
 * Vinsert Editor - UI更新機能（多言語化対応版）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke, isLineHighlightEnabled, currentHighlightedLine, setCurrentHighlightedLine } from './globals.js';
import { getCurrentFontSettings } from './font-settings.js';
import { t } from './locales.js';

// 行番号更新の重複実行を防ぐフラグ
let lineNumbersUpdateScheduled = false;

/**
 * 行番号の更新（シンプルスクロール対応版）
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) return;
    
    // 重複実行を防ぐ
    if (lineNumbersUpdateScheduled) {
        return;
    }
    
    lineNumbersUpdateScheduled = true;
    console.log('Updating line numbers...');
    
    try {
        const lines = editor.value.split('\n');
        const lineCount = lines.length;
        
        // 現在のカーソル位置とスクロール位置を保存
        const originalSelectionStart = editor.selectionStart;
        const originalSelectionEnd = editor.selectionEnd;
        const originalScrollTop = editor.scrollTop;
        
        // 各論理行の実際の高さを取得
        const lineHeights = getLogicalLineHeights(lines);
        
        // 論理行番号を通常のブロック要素として配置
        let lineNumbersHTML = '';
        
        for (let i = 0; i < lineCount; i++) {
            const lineHeight = lineHeights[i];
            
            // 論理行の上端に揃えて配置
            lineNumbersHTML += `<div class="line-number" style="height: ${lineHeight}px; line-height: 1.5; display: flex; align-items: flex-start; justify-content: flex-end; padding-top: 0; box-sizing: border-box;">${i + 1}</div>`;
        }
        
        // 元のカーソル位置とスクロール位置を復元
        editor.setSelectionRange(originalSelectionStart, originalSelectionEnd);
        editor.scrollTop = originalScrollTop;
        
        // 行番号コンテナを設定
        lineNumbers.style.position = 'relative';
        lineNumbers.style.height = 'auto';
        lineNumbers.innerHTML = lineNumbersHTML;
        
        console.log('Line numbers HTML:', lineNumbersHTML.substring(0, 200) + '...');
        console.log(`Line numbers updated: ${lineCount} logical lines (block elements)`);
        lineNumbersUpdateScheduled = false;
    } catch (error) {
        lineNumbersUpdateScheduled = false;
        console.error('Error updating line numbers:', error);
        
        // フォールバック: シンプルな行番号表示
        const lines = editor.value.split('\n');
        const lineCount = lines.length;
        let lineNumbersHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbersHTML += `<div class="line-number">${i}</div>`;
        }
        lineNumbers.innerHTML = lineNumbersHTML;
    }
}

/**
 * 行番号とエディタのスクロール同期（即座更新版）
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        // 行番号コンテナをエディタと同期してスクロール
        lineNumbers.scrollTop = editor.scrollTop;
        console.log('📜 Line numbers scrolled to:', editor.scrollTop, 'editor scrollTop:', editor.scrollTop);
    }
}

/**
 * 現在の論理行をハイライト（行番号と同じ計算方法を使用）
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
    
    try {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const currentLogicalLine = textBeforeCursor.split('\n').length;
        
        setCurrentHighlightedLine(currentLogicalLine);
        
        // 既存のハイライトを削除
        const existingHighlight = document.querySelector('.line-highlight-overlay');
        if (existingHighlight) {
            existingHighlight.remove();
        }
        
        // 行番号と同じ方法で論理行の位置と高さを計算（実測値使用）
        const lines = editor.value.split('\n');
        const linePositions = getRealLogicalLinePositions(lines);
        
        const currentLinePosition = linePositions[currentLogicalLine - 1];
        if (!currentLinePosition) {
            console.warn('⚠️ Could not get position for line', currentLogicalLine);
            return;
        }
        
        // スクロール位置を考慮した表示位置
        const displayTop = currentLinePosition.top - editor.scrollTop;
        
        // ハイライト要素を作成
        const highlight = document.createElement('div');
        highlight.className = 'line-highlight-overlay';
        highlight.style.position = 'absolute';
        highlight.style.left = '0';
        highlight.style.top = `${displayTop}px`;
        highlight.style.width = `${editor.clientWidth}px`;
        highlight.style.height = `${currentLinePosition.height}px`;
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1';
        
        // エディタコンテナに追加
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(highlight);
        }
        
        console.log(`Line highlight: logical line ${currentLogicalLine}, top: ${displayTop}, height: ${currentLineHeight} (same method as line numbers)`);
        
    } catch (error) {
        console.warn('⚠️ Line highlight error:', error);
    }
}

/**
 * エディタから直接各論理行の位置と高さを実測
 */
function getRealLogicalLinePositions(lines) {
    const positions = [];
    
    try {
        // 現在のカーソル位置を保存
        const originalSelectionStart = editor.selectionStart;
        const originalSelectionEnd = editor.selectionEnd;
        const originalScrollTop = editor.scrollTop;
        
        let textPosition = 0;
        
        for (let i = 0; i < lines.length; i++) {
            // 論理行の開始位置にカーソルを移動
            editor.setSelectionRange(textPosition, textPosition);
            editor.focus();
            
            // エディタ内でのカーソル位置を実測
            const startCoords = getCaretCoordinatesInEditor(textPosition);
            
            // 論理行の終了位置での座標も取得（高さ計算用）
            const lineEndPosition = textPosition + lines[i].length;
            if (lines[i].length > 0) {
                editor.setSelectionRange(lineEndPosition, lineEndPosition);
                const endCoords = getCaretCoordinatesInEditor(lineEndPosition);
                
                positions.push({
                    top: startCoords.top,
                    height: Math.max(endCoords.top - startCoords.top + endCoords.height, startCoords.height)
                });
            } else {
                // 空行の場合
                positions.push({
                    top: startCoords.top,
                    height: startCoords.height
                });
            }
            
            // 次の論理行の開始位置（改行文字分も含む）
            textPosition += lines[i].length + 1;
        }
        
        // 元のカーソル位置とスクロール位置を復元
        editor.setSelectionRange(originalSelectionStart, originalSelectionEnd);
        editor.scrollTop = originalScrollTop;
        
        return positions;
        
    } catch (error) {
        console.error('Error getting real logical line positions:', error);
        
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
 * エディタ内でのカーソル座標を取得
 */
function getCaretCoordinatesInEditor(position) {
    try {
        // Selection APIを使用してカーソル位置の座標を取得
        const selection = window.getSelection();
        const range = document.createRange();
        
        // テキストノードとオフセットを計算
        const textNode = getTextNodeAtPosition(editor, position);
        if (textNode && textNode.textContent) {
            const offset = position - getTextNodeOffset(editor, textNode);
            range.setStart(textNode, Math.min(offset, textNode.textContent.length));
            range.setEnd(textNode, Math.min(offset, textNode.textContent.length));
            
            const rect = range.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();
            
            return {
                top: rect.top - editorRect.top + editor.scrollTop,
                left: rect.left - editorRect.left + editor.scrollLeft,
                height: rect.height || parseFloat(getComputedStyle(editor).lineHeight)
            };
        }
        
        // フォールバック: 隠しspan要素を使用
        return getCaretCoordinatesWithSpan(position);
        
    } catch (error) {
        console.error('Error getting caret coordinates:', error);
        return getCaretCoordinatesWithSpan(position);
    }
}

/**
 * 隠しspan要素を使用してカーソル座標を取得（フォールバック）
 */
function getCaretCoordinatesWithSpan(position) {
    const computedStyle = getComputedStyle(editor);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    
    // 大まかな行番号を計算
    const textBefore = editor.value.substring(0, position);
    const lineNumber = textBefore.split('\n').length;
    
    return {
        top: paddingTop + (lineNumber - 1) * lineHeight,
        left: 0,
        height: lineHeight
    };
}

/**
 * 指定位置のテキストノードを取得
 */
function getTextNodeAtPosition(element, position) {
    // 簡易実装
    return element.firstChild;
}

/**
 * テキストノードのオフセットを取得
 */
function getTextNodeOffset(element, textNode) {
    // 簡易実装
    return 0;
}

/**
 * テキストエリアの実測値を使用して各論理行の位置を取得（最適化版）
 */
function getLogicalLinePositions(lines) {
    const positions = [];
    
    try {
        // 現在のカーソル位置を保存
        const originalSelectionStart = editor.selectionStart;
        const originalSelectionEnd = editor.selectionEnd;
        
        let textPosition = 0;
        
        for (let i = 0; i < lines.length; i++) {
            // 論理行の開始位置にカーソルを移動
            editor.setSelectionRange(textPosition, textPosition);
            editor.focus(); // フォーカスを確保
            
            // 実際のテキストエリアでの位置を取得
            const rect = getCaretRectFromTextarea(textPosition);
            
            // 論理行の高さを計算（長い行の場合は実測、短い行は基本値）
            let lineHeight = rect.height;
            
            if (lines[i].length > 50) { // 長い行の場合のみ詳細測定
                const lineEndPosition = textPosition + lines[i].length;
                editor.setSelectionRange(lineEndPosition, lineEndPosition);
                const endRect = getCaretRectFromTextarea(lineEndPosition);
                lineHeight = Math.max(endRect.top - rect.top + endRect.height, rect.height);
            }
            
            positions.push({
                top: rect.top,
                height: lineHeight
            });
            
            // 次の論理行の開始位置（改行文字分も含む）
            textPosition += lines[i].length + 1;
        }
        
        // 元のカーソル位置を復元
        editor.setSelectionRange(originalSelectionStart, originalSelectionEnd);
        
        return positions;
        
    } catch (error) {
        console.error('Error getting logical line positions:', error);
        
        // フォールバック: 基本計算
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
 * 論理行の正確な位置と高さを計算（後方互換性のため残す）
 */
function calculateLogicalLinePosition(logicalLineNumber, lineText) {
    // 新しい統一された方法を使用
    const lines = editor.value.split('\n');
    // 各論理行の実測位置と高さを取得
        const linePositions = getRealLogicalLinePositions(lines);
    
    const computedStyle = window.getComputedStyle(editor);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    
    let cumulativeTop = paddingTop;
    for (let i = 0; i < lineCount; i++) {
            const linePosition = linePositions[i];
            
            // 論理行の上端に揃えて配置（実測値使用）
            lineNumbersHTML += `<div class="line-number" style="height: ${linePosition.height}px; line-height: 1.5; display: flex; align-items: flex-start; justify-content: flex-end; padding-top: 0; box-sizing: border-box;">${i + 1}</div>`;
        }
    
    const currentLineHeight = lineHeights[logicalLineNumber - 1] || parseFloat(computedStyle.lineHeight);
    
    return {
        top: cumulativeTop - editor.scrollTop,
        height: currentLineHeight
    };
}

/**
 * カーソルの物理的な位置を計算（タイプライターモード用）
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
        console.error('Error calculating physical cursor position:', error);
        // フォールバック
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const logicalLine = textBeforeCursor.split('\n').length;
        return actualPaddingTop + (logicalLine - 1) * lineHeight;
    }
}

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
    
    // 行ハイライトを更新
    updateLineHighlight();
    
    // 空白文字可視化も更新
    updateWhitespaceMarkersIfEnabled();
}

/**
 * 空白文字可視化が有効な場合のみマーカーを更新（安定版）
 */
function updateWhitespaceMarkersIfEnabled() {
    try {
        // 動的インポートで循環依存を避ける
        import('./whitespace-visualizer.js').then(module => {
            if (module && module.updateWhitespaceMarkers) {
                // 通常の更新は少し遅延させて安定化
                setTimeout(() => {
                    try {
                        module.updateWhitespaceMarkers();
                    } catch (updateError) {
                        console.warn('⚠️ Whitespace markers update failed:', updateError);
                    }
                }, 50);
            }
        }).catch((error) => {
            // 空白文字可視化機能が無効な場合は何もしない（エラーログも出さない）
        });
    } catch (error) {
        // エラーは無視（空白文字可視化はオプション機能のため）
        console.warn('⚠️ Whitespace markers update error:', error);
    }
}

/**
 * スクロール時の空白文字マーカー更新（安定版）
 */
export function updateWhitespaceMarkersOnScroll() {
    try {
        import('./whitespace-visualizer.js').then(module => {
            if (module && module.updateWhitespaceMarkersOnScroll) {
                // スクロール時の更新は即座に実行（ただしエラーハンドリング付き）
                try {
                    module.updateWhitespaceMarkersOnScroll();
                } catch (updateError) {
                    console.warn('⚠️ Scroll-triggered whitespace update failed:', updateError);
                }
            }
        }).catch(() => {
            // 空白文字可視化機能が無効な場合は何もしない
        });
    } catch (error) {
        // エラーは無視
        console.warn('⚠️ Whitespace scroll update error:', error);
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
 * フォント関連の設定が変更されたときの包括的な更新
 */
export function updateAfterFontChange() {
    // フォントサイズ表示を更新
    updateFontSizeDisplay();
    
    // タブサイズを更新（font-settings.jsから）
    try {
        import('./font-settings.js').then(module => {
            if (module && module.updateTabSizeForFont) {
                setTimeout(() => {
                    // フォント適用後に少し遅延してタブサイズを更新
                    module.updateTabSizeForFont();
                }, 100);
            }
        });
    } catch (error) {
        console.warn('⚠️ Tab size update after font change failed:', error);
    }
}
