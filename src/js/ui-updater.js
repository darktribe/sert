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
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        // エディタと同じ条件で測定用要素を作成
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
            tab-size: ${computedStyle.tabSize};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        
        // 行番号HTML生成（論理行の先頭に配置）
        let lineNumbersHTML = '';
        let currentTop = paddingTop;
        
        for (let i = 0; i < lineCount; i++) {
            const lineText = lines[i] || ' ';
            
            // この論理行の実際の高さを測定
            measurer.textContent = lineText;
            const actualHeight = measurer.offsetHeight;
            
            // 行番号を論理行の先頭に配置（絶対位置で）
            const displayTop = currentTop - editor.scrollTop;
            lineNumbersHTML += `<div class="line-number" style="position: absolute; top: ${displayTop}px; right: 8px; height: ${actualHeight}px; line-height: ${parseFloat(computedStyle.lineHeight)}px;">${i + 1}</div>`;
            
            currentTop += actualHeight;
        }
        
        // 測定用要素を削除
        document.body.removeChild(measurer);
        
        // 行番号コンテナを設定
        lineNumbers.style.position = 'relative';
        lineNumbers.style.height = `${currentTop + paddingTop}px`;
        lineNumbers.innerHTML = lineNumbersHTML;
        
        console.log(`Line numbers updated: ${lineCount} logical lines`);
        
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
    
    // スクロール位置は既に計算済み
}

/**
 * 行番号とエディタのスクロール同期
 */
export function syncScroll() {
    // スクロール時は行番号を再生成して位置を更新
    updateLineNumbers();
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
    
    try {
        // カーソル位置から正確な論理行を計算
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const logicalLines = textBeforeCursor.split('\n');
        const currentLogicalLine = logicalLines.length;
        
        console.log(`Cursor at position ${cursorPos}, logical line ${currentLogicalLine}`);
        
        setCurrentHighlightedLine(currentLogicalLine);
        
        // 既存のハイライトを削除
        const existingHighlight = document.querySelector('.line-highlight-overlay');
        if (existingHighlight) {
            existingHighlight.remove();
        }
        
        // 現在の論理行の内容を取得
        const lines = editor.value.split('\n');
        const currentLineText = lines[currentLogicalLine - 1] || '';
        
        // 論理行全体の位置と高さを正確に計算
        const logicalLineInfo = calculateLogicalLineInfo(currentLogicalLine, currentLineText);
        
        // ハイライト要素を作成（論理行全体をハイライト）
        const highlight = document.createElement('div');
        highlight.className = 'line-highlight-overlay';
        highlight.style.position = 'absolute';
        highlight.style.left = '0';
        highlight.style.top = `${logicalLineInfo.top}px`;
        highlight.style.width = `${editor.clientWidth}px`;
        highlight.style.height = `${logicalLineInfo.height}px`;
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1';
        
        // エディタコンテナに追加
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(highlight);
        }
        
        console.log(`Line highlight: logical line ${currentLogicalLine}, top: ${logicalLineInfo.top}, height: ${logicalLineInfo.height}`);
        
    } catch (error) {
        console.warn('⚠️ Line highlight error:', error);
    }
}

/**
 * 論理行の正確な位置と高さを計算
 */
function calculateLogicalLineInfo(logicalLineNumber, lineText) {
    try {
        const computedStyle = window.getComputedStyle(editor);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        
        // エディタと同じ条件で測定用要素を作成
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
            tab-size: ${computedStyle.tabSize};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editorWidth}px;
        `;
        
        document.body.appendChild(measurer);
        
        // 対象論理行より前の全ての行の累積高さを計算
        const lines = editor.value.split('\n');
        let cumulativeTop = paddingTop;
        
        for (let i = 0; i < logicalLineNumber - 1; i++) {
            const prevLineText = lines[i] || ' ';
            measurer.textContent = prevLineText;
            cumulativeTop += measurer.offsetHeight;
        }
        
        // 現在の論理行の実際の高さを測定
        measurer.textContent = lineText || ' ';
        const actualLineHeight = measurer.offsetHeight;
        
        document.body.removeChild(measurer);
        
        return {
            top: cumulativeTop - editor.scrollTop,
            height: actualLineHeight
        };
        
    } catch (error) {
        console.error('Error calculating logical line info:', error);
        // フォールバック
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        
        return {
            top: paddingTop + (logicalLineNumber - 1) * lineHeight - editor.scrollTop,
            height: lineHeight
        };
    }
}

/**
 * 論理行の位置と高さを計算
 */
function calculateLogicalLinePosition(logicalLineNumber, lineText) {
    try {
        const computedStyle = window.getComputedStyle(editor);
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const editorWidth = editor.clientWidth - paddingLeft - paddingRight;
        const baseLineHeight = parseFloat(computedStyle.lineHeight);
        
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
        
        // 現在の論理行までの累積高さを計算
        const lines = editor.value.split('\n');
        let cumulativeTop = actualPaddingTop;
        
        for (let i = 0; i < logicalLineNumber - 1; i++) {
            const prevLineText = lines[i] || ' ';
            measurer.textContent = prevLineText;
            cumulativeTop += measurer.offsetHeight || baseLineHeight;
        }
        
        // 現在の論理行の高さを測定
        measurer.textContent = lineText || ' ';
        const currentLineHeight = measurer.offsetHeight || baseLineHeight;
        
        document.body.removeChild(measurer);
        
        return {
            top: cumulativeTop,
            height: currentLineHeight
        };
        
    } catch (error) {
        console.error('Error calculating logical line position:', error);
        // フォールバック
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        
        return {
            top: actualPaddingTop + (logicalLineNumber - 1) * lineHeight,
            height: lineHeight
        };
    }
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
    // 最下段での表示調整
    adjustBottomLineVisibility();
    // 最下段での自動スクロール調整
    setTimeout(() => {
        adjustBottomVisibility();
    }, 50);
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

/**
 * 最下段での表示調整（ステータスバーで隠れないように）
 */
function adjustBottomLineVisibility() {
    if (!editor) return;
    
    try {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const currentLogicalLine = textBeforeCursor.split('\n').length;
        const totalLines = editor.value.split('\n').length;
        
        // 最下段にいる場合
        if (currentLogicalLine === totalLines) {
            const statusBar = document.querySelector('.status-bar');
            const statusBarHeight = statusBar ? statusBar.offsetHeight : 24;
            
            // エディタの下端からステータスバーの高さ + 余裕分を引いた位置
            const adjustmentHeight = statusBarHeight + 10;
            
            // 現在のスクロール位置を取得
            const currentScrollTop = editor.scrollTop;
            const maxScrollTop = editor.scrollHeight - editor.clientHeight;
            
            // 最下段で、かつスクロールが最下端近くの場合は少し上にスクロール
            if (currentScrollTop >= maxScrollTop - adjustmentHeight) {
                const newScrollTop = Math.max(0, maxScrollTop - adjustmentHeight);
                if (newScrollTop !== currentScrollTop) {
                    editor.scrollTop = newScrollTop;
                    
                    // 行番号も同期
                    const lineNumbers = document.getElementById('line-numbers');
                    if (lineNumbers) {
                        lineNumbers.scrollTop = newScrollTop;
                    }
                    
                    console.log(`📜 Adjusted bottom line visibility: scrollTop=${newScrollTop}`);
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ Bottom line visibility adjustment failed:', error);
    }
}

/**
 * 最下段での表示調整
 */
function adjustBottomVisibility() {
    if (!editor) return;
    
    try {
        const cursorPos = editor.selectionStart;
        const lines = editor.value.split('\n');
        const totalLines = lines.length;
        
        // カーソルがある行を計算
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const currentLine = textBeforeCursor.split('\n').length;
        
        // 最後の3行以内にいる場合は調整
        if (currentLine >= totalLines - 2 && totalLines > 5) {
            const statusBarHeight = 24;
            const bottomMargin = statusBarHeight + 40; // 十分な余裕
            
            // エディタの実際の表示可能領域を計算
            const effectiveClientHeight = editor.clientHeight - statusBarHeight;
            const maxScrollTop = editor.scrollHeight - effectiveClientHeight;
            const currentScrollTop = editor.scrollTop;
            
            // 下端近くの場合は調整
            if (currentScrollTop >= maxScrollTop - bottomMargin) {
                const newScrollTop = Math.max(0, maxScrollTop - bottomMargin);
                editor.scrollTop = newScrollTop;
                syncScroll();
                console.log('📜 Adjusted for bottom visibility:', newScrollTop);
            }
        }
    } catch (error) {
        console.warn('⚠️ Bottom visibility adjustment failed:', error);
    }
}