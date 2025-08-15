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
    
    console.log('Updating line numbers...');
    
    try {
        const lines = editor.value.split('\n');
        const lineCount = lines.length;
        
        // エディタのスタイル情報を取得
        const computedStyle = window.getComputedStyle(editor);
        const fontSize = parseFloat(computedStyle.fontSize);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        
        // エディタの実効幅を計算（パディングを除く）
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        // 測定用の隠し要素を作成
        const measurer = document.createElement('div');
        measurer.style.cssText = `
            position: absolute;
            top: -9999px;
            left: -9999px;
            visibility: hidden;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: ${computedStyle.fontFamily};
            font-size: ${fontSize}px;
            line-height: ${lineHeight}px;
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        
        // 行番号HTML生成と位置計算
        let lineNumbersHTML = '';
        let currentTop = 0;
        
        for (let i = 0; i < lineCount; i++) {
            const lineText = lines[i] || ' '; // 空行の場合は1文字分の高さを確保
            
            // 各行の実際の高さを測定
            measurer.textContent = lineText;
            const actualHeight = measurer.offsetHeight;
            
            // 行番号を絶対位置で配置
            lineNumbersHTML += `<div class="line-number" style="position: absolute; top: ${currentTop}px; right: 8px; line-height: ${lineHeight}px;">${i + 1}</div>`;
            
            currentTop += actualHeight;
        }
        
        // 測定用要素を削除
        document.body.removeChild(measurer);
        
        // 行番号コンテナを相対位置に設定
        lineNumbers.style.position = 'relative';
        lineNumbers.style.height = `${currentTop + paddingTop * 2}px`;
        lineNumbers.innerHTML = lineNumbersHTML;
        
        console.log(`Line numbers updated: ${lineCount} logical lines, total height: ${currentTop}px`);
        
    } catch (error) {
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
 * 現在の論理行をハイライト（シンプル確実版）
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
    const currentLogicalLine = textBeforeCursor.split('\n').length;
    
    setCurrentHighlightedLine(currentLogicalLine);
    
    // 既存のハイライトを削除
    const existingHighlight = document.querySelector('.line-highlight-overlay');
    if (existingHighlight) {
        existingHighlight.remove();
    }
    
    // 論理行全体の高さを測定するため、測定用要素を作成
    try {
        const lines = editor.value.split('\n');
        const currentLineText = lines[currentLogicalLine - 1] || '';
        
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
        
        // 現在の論理行のテキストを設定（空行の場合は1文字分の高さを確保）
        measurer.textContent = currentLineText || ' ';
        
        document.body.appendChild(measurer);
        
        // 実際の高さを取得
        const lineActualHeight = measurer.offsetHeight;
        
        // 測定用要素を削除
        document.body.removeChild(measurer);
        
        // 現在の論理行までの累積高さを計算
        let topPosition = parseFloat(computedStyle.paddingTop);
        const baseLineHeight = parseFloat(computedStyle.lineHeight);
        
        for (let i = 0; i < currentLogicalLine - 1; i++) {
            const lineText = lines[i] || '';
            if (lineText === '') {
                topPosition += baseLineHeight;
            } else {
                // 各行の実際の高さを測定
                measurer.textContent = lineText;
                document.body.appendChild(measurer);
                const height = measurer.offsetHeight;
                document.body.removeChild(measurer);
                topPosition += height;
            }
        }
        
        // ハイライト要素を作成
        const highlight = document.createElement('div');
        highlight.className = 'line-highlight-overlay';
        highlight.style.position = 'absolute';
        highlight.style.left = '0';
        highlight.style.top = `${topPosition - editor.scrollTop}px`;
        highlight.style.width = `${editor.clientWidth}px`;
        highlight.style.height = `${lineActualHeight}px`;
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1';
        
        // エディタコンテナに追加
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(highlight);
        }
        
    } catch (error) {
        console.warn('⚠️ Line highlight measurement failed:', error);
        
        // フォールバック: 基本的な1行ハイライト
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        
        const highlight = document.createElement('div');
        highlight.className = 'line-highlight-overlay';
        highlight.style.position = 'absolute';
        highlight.style.left = '0';
        highlight.style.top = `${paddingTop + (currentLogicalLine - 1) * lineHeight - editor.scrollTop}px`;
        highlight.style.width = `${editor.clientWidth}px`;
        highlight.style.height = `${lineHeight}px`;
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1';
        
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(highlight);
        }
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