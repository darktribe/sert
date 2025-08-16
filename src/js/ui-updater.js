/*
 * =====================================================
 * Vinsert Editor - UI更新機能（タイプライターモード行番号位置修正版）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke, isLineHighlightEnabled, currentHighlightedLine, setCurrentHighlightedLine } from './globals.js';
import { getCurrentFontSettings } from './font-settings.js';
import { t } from './locales.js';

// 行番号更新の重複実行を防ぐフラグ
let lineNumbersUpdateScheduled = false;

// デバッグモードフラグ（必要時のみログ出力）
const DEBUG_MODE = false;

/**
 * エディタから直接各論理行の位置と高さを実測（export版）
 */
export function getRealLogicalLinePositions(lines) {
    return getRealLogicalLinePositionsInternal(lines);
}

/**
 * エディタから直接各論理行の位置と高さを実測（タイプライターモード対応版）
 */
function getRealLogicalLinePositionsInternal(lines) {
    try {
        // エディタの現在のスタイルを取得
        const computedStyle = window.getComputedStyle(editor);
        
        // タイプライターモードの検出と実際のpadding値を取得
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        const actualPaddingLeft = parseFloat(computedStyle.paddingLeft);
        const actualPaddingRight = parseFloat(computedStyle.paddingRight);
        
        // 測定用の隠し要素を作成（エディタと完全に同じスタイル）
        const measurer = document.createElement('div');
        const lineNumbers = document.getElementById('line-numbers');
        const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 0;
        
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
            font-variant-numeric: ${computedStyle.fontVariantNumeric};
            letter-spacing: ${computedStyle.letterSpacing};
            word-spacing: ${computedStyle.wordSpacing};
            padding: 0;
            margin: 0;
            border: none;
            width: ${editor.clientWidth - actualPaddingLeft - actualPaddingRight}px;
        `;
        
        document.body.appendChild(measurer);
        
        const lineHeight = parseFloat(computedStyle.lineHeight);
        let currentTop = actualPaddingTop; // 実際のpaddingTopを使用
        const positions = [];
        
        if (DEBUG_MODE && isTypewriterMode) {
            console.log(`🖥️ Typewriter mode detected: paddingTop=${actualPaddingTop}px`);
        }
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 空行の場合は標準の行高さを使用
            if (line.length === 0) {
                positions.push({
                    top: currentTop,
                    height: lineHeight,
                    actualPaddingTop: actualPaddingTop
                });
                currentTop += lineHeight;
                continue;
            }
            
            // 行の内容を測定
            measurer.textContent = line;
            const measurerHeight = measurer.offsetHeight;
            const actualHeight = Math.max(measurerHeight, lineHeight);
            
            positions.push({
                top: currentTop,
                height: actualHeight,
                actualPaddingTop: actualPaddingTop
            });
            
            currentTop += actualHeight;
        }
        
        document.body.removeChild(measurer);
        return positions;
        
    } catch (error) {
        if (DEBUG_MODE) console.error('Error getting real logical line positions:', error);
        
        // フォールバック
        const computedStyle = window.getComputedStyle(editor);
        const lineHeight = parseFloat(computedStyle.lineHeight);
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(computedStyle.paddingTop);
        
        return lines.map((_, i) => ({
            top: actualPaddingTop + i * lineHeight,
            height: lineHeight,
            actualPaddingTop: actualPaddingTop
        }));
    }
}

/**
 * 行番号の更新（タイプライターモード行番号位置修正版）
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers || !editor) return;
    
    // 重複実行を防ぐ
    if (lineNumbersUpdateScheduled) {
        return;
    }
    
    lineNumbersUpdateScheduled = true;
    if (DEBUG_MODE) console.log('Updating line numbers...');
    
    try {
        const lines = editor.value.split('\n');
        const lineCount = lines.length;
        
        // 現在のカーソル位置とスクロール位置を保存
        const originalSelectionStart = editor.selectionStart;
        const originalSelectionEnd = editor.selectionEnd;
        const originalScrollTop = editor.scrollTop;
        
        // 各論理行の実測位置と高さを取得
        const linePositions = getRealLogicalLinePositionsInternal(lines);
        
        // タイプライターモードの検出
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        const actualPaddingTop = parseFloat(editor.style.paddingTop) || parseFloat(window.getComputedStyle(editor).paddingTop);
        const baseLineHeight = parseFloat(window.getComputedStyle(editor).lineHeight);
        
        if (DEBUG_MODE && isTypewriterMode) {
            console.log(`🖥️ Typewriter mode: actualPaddingTop=${actualPaddingTop}px, baseLineHeight=${baseLineHeight}px`);
        }
        
        // 論理行番号を配置
        let lineNumbersHTML = '';
        
        for (let i = 0; i < lineCount; i++) {
            const linePosition = linePositions[i];
            
            if (isTypewriterMode) {
                // タイプライターモード：行番号をエディタと同じ位置に調整
                // 行番号コンテナにもタイプライターモードのpaddingTopを適用
                lineNumbersHTML += `<div class="line-number" style="
                    height: ${linePosition.height}px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: flex-end;
                    box-sizing: border-box;
                    position: relative;
                    line-height: ${baseLineHeight}px;
                    margin: 0;
                    padding: 0;
                ">
                    <span style="
                        position: absolute;
                        top: 0;
                        right: 8px;
                        line-height: ${baseLineHeight}px;
                        height: ${baseLineHeight}px;
                        display: flex;
                        align-items: center;
                    ">${i + 1}</span>
                </div>`;
            } else {
                // 通常モード：論理行の最上部に表示
                lineNumbersHTML += `<div class="line-number" style="
                    height: ${linePosition.height}px;
                    display: flex;
                    align-items: flex-start;
                    justify-content: flex-end;
                    box-sizing: border-box;
                    position: relative;
                    line-height: ${baseLineHeight}px;
                ">
                    <span style="
                        position: absolute;
                        top: 0;
                        right: 8px;
                        line-height: ${baseLineHeight}px;
                    ">${i + 1}</span>
                </div>`;
            }
        }
        
        // 行番号コンテナのスタイル設定
        lineNumbers.style.position = 'relative';
        lineNumbers.style.height = 'auto';
        
        // タイプライターモード時は行番号コンテナにも同じpaddingTopを適用
        if (isTypewriterMode) {
            lineNumbers.style.paddingTop = `${actualPaddingTop}px`;
            lineNumbers.style.paddingBottom = `${actualPaddingTop}px`;
            if (DEBUG_MODE) {
                console.log(`🖥️ Applied padding to line numbers: top=${actualPaddingTop}px, bottom=${actualPaddingTop}px`);
            }
        } else {
            // 通常モードでは標準のpadding
            lineNumbers.style.paddingTop = '10px';
            lineNumbers.style.paddingBottom = '10px';
        }
        
        lineNumbers.innerHTML = lineNumbersHTML;
        
        // 元のカーソル位置とスクロール位置を復元
        editor.setSelectionRange(originalSelectionStart, originalSelectionEnd);
        editor.scrollTop = originalScrollTop;
        
        if (DEBUG_MODE) {
            console.log('Line numbers HTML:', lineNumbersHTML.substring(0, 200) + '...');
            console.log(`Line numbers updated: ${lineCount} logical lines, typewriter mode: ${isTypewriterMode}`);
        }
        
        lineNumbersUpdateScheduled = false;
    } catch (error) {
        lineNumbersUpdateScheduled = false;
        if (DEBUG_MODE) console.error('Error updating line numbers:', error);
        
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
 * 行番号とエディタのスクロール同期（タイプライターモード対応版）
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers && editor) {
        // 行番号コンテナをエディタと同期してスクロール
        lineNumbers.scrollTop = editor.scrollTop;
        
        if (DEBUG_MODE) {
            console.log('📜 Line numbers scrolled to:', editor.scrollTop, 'editor scrollTop:', editor.scrollTop);
        }
    }
}

/**
 * 現在の論理行をハイライト（タイプライターモード対応版）
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
        const linePositions = getRealLogicalLinePositionsInternal(lines);
        
        const currentLinePosition = linePositions[currentLogicalLine - 1];
        if (!currentLinePosition) {
            if (DEBUG_MODE) console.warn('⚠️ Could not get position for line', currentLogicalLine);
            return;
        }
        
        // スクロール位置を考慮した表示位置
        const displayTop = currentLinePosition.top - editor.scrollTop;
        
        // タイプライターモードの検出
        const isTypewriterMode = editor.style.paddingTop && parseFloat(editor.style.paddingTop) > 20;
        
        // ハイライト要素を作成
        const highlight = document.createElement('div');
        highlight.className = 'line-highlight-overlay';
        highlight.style.position = 'absolute';
        highlight.style.left = '0';
        highlight.style.top = `${displayTop}px`;
        highlight.style.width = `${editor.clientWidth}px`;
        highlight.style.height = `${currentLinePosition.height}px`; // 論理行の実際の高さ（折り返し含む）
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1';
        
        if (DEBUG_MODE) {
            console.log(`🎨 Line highlight: line ${currentLogicalLine}, top=${displayTop}, height=${currentLinePosition.height}, typewriter=${isTypewriterMode}`);
        }
        
        // 行ハイライトが画面外に出る場合はログに記録
        const editorHeight = editor.clientHeight;
        
        if (displayTop < 0 || displayTop > editorHeight) {
            if (DEBUG_MODE) console.warn(`⚠️ Highlight may be off-screen: displayTop=${displayTop}, editorHeight=${editorHeight}`);
        }
        
        // エディタコンテナに追加
        const editorContainer = document.querySelector('.editor-container');
        if (editorContainer) {
            editorContainer.appendChild(highlight);
        }
        
        if (DEBUG_MODE) {
            console.log(`Line highlight: logical line ${currentLogicalLine}, top: ${displayTop}, height: ${currentLinePosition.height}`);
        }
        
    } catch (error) {
        if (DEBUG_MODE) console.warn('⚠️ Line highlight error:', error);
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
        if (DEBUG_MODE) console.error('Error calculating physical cursor position:', error);
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
                        if (DEBUG_MODE) console.warn('⚠️ Whitespace markers update failed:', updateError);
                    }
                }, 50);
            }
        }).catch((error) => {
            // 空白文字可視化機能が無効な場合は何もしない（エラーログも出さない）
        });
    } catch (error) {
        // エラーは無視（空白文字可視化はオプション機能のため）
        if (DEBUG_MODE) console.warn('⚠️ Whitespace markers update error:', error);
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
                    if (DEBUG_MODE) console.warn('⚠️ Scroll-triggered whitespace update failed:', updateError);
                }
            }
        }).catch(() => {
            // 空白文字可視化機能が無効な場合は何もしない
        });
    } catch (error) {
        // エラーは無視
        if (DEBUG_MODE) console.warn('⚠️ Whitespace scroll update error:', error);
    }
}

/**
 * ファイルパスからファイル名を抽出
 */
function getFileNameFromPath(filePath) {
    if (!filePath) return null;
    
    if (DEBUG_MODE) console.log('🏷️ Extracting filename from path:', filePath);
    
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
    
    if (DEBUG_MODE) console.log('📁 Extracted filename:', fileName);
    return fileName;
}

/**
 * ウィンドウタイトルの更新（多言語化対応）
 */
export async function updateWindowTitle() {
    try {
        if (DEBUG_MODE) console.log('🏷️ Updating window title...');
        if (DEBUG_MODE) console.log('Current file path:', currentFilePath);
        
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
        
        if (DEBUG_MODE) console.log('🏷️ New title:', newTitle);
        
        // Tauri 2.5のウィンドウタイトル更新API
        if (window.__TAURI__ && window.__TAURI__.window) {
            if (DEBUG_MODE) console.log('🏷️ Using Tauri window API');
            const { getCurrentWindow } = window.__TAURI__.window;
            const currentWindow = getCurrentWindow();
            
            await currentWindow.setTitle(newTitle);
            if (DEBUG_MODE) console.log('✅ Window title updated successfully via Tauri API');
            
        } else if (tauriInvoke) {
            if (DEBUG_MODE) console.log('🏷️ Fallback: Using Tauri invoke (if available)');
            // Tauri invokeでのフォールバック（カスタムコマンドが必要）
            if (DEBUG_MODE) console.log('⚠️ Tauri invoke fallback not implemented for setTitle');
            
        } else {
            if (DEBUG_MODE) console.log('🏷️ Fallback: Using document.title');
            // 最後の手段: document.title（開発環境用）
            document.title = newTitle;
            if (DEBUG_MODE) console.log('✅ Document title updated as fallback');
        }
        
    } catch (error) {
        if (DEBUG_MODE) console.error('❌ Failed to update window title:', error);
        
        // エラー時のフォールバック
        try {
            const fallbackTitle = currentFilePath ? 
                t('window.titleFormat', { filename: getFileNameFromPath(currentFilePath) || t('window.defaultTitle').replace('Sert - ', '') }) : 
                t('window.defaultTitle');
            document.title = fallbackTitle;
            if (DEBUG_MODE) console.log('✅ Fallback title set:', fallbackTitle);
        } catch (fallbackError) {
            if (DEBUG_MODE) console.error('❌ Even fallback title update failed:', fallbackError);
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
        if (DEBUG_MODE) console.warn('⚠️ Tab size update after font change failed:', error);
    }
}