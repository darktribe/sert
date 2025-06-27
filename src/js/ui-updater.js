/*
 * =====================================================
 * Sert Editor - UI更新機能（多言語化対応版）
 * =====================================================
 */

import { editor, currentFilePath, tauriInvoke } from './globals.js';
import { t } from './locales.js';

/**
 * 行番号の更新
 */
export function updateLineNumbers() {
    const lineNumbers = document.getElementById('line-numbers');
    if (!lineNumbers) return;
    
    const lines = editor.value.split('\n');
    const lineCount = lines.length;
    
    let lineNumbersContent = '';
    for (let i = 1; i <= lineCount; i++) {
        lineNumbersContent += i + '\n';
    }
    
    lineNumbers.textContent = lineNumbersContent;
}

/**
 * 行番号とエディタのスクロール同期
 */
export function syncScroll() {
    const lineNumbers = document.getElementById('line-numbers');
    if (lineNumbers) {
        lineNumbers.scrollTop = editor.scrollTop;
    }
}

/**
 * ステータスバーの更新（多言語化対応）
 */
export function updateStatus() {
    const cursorPosition = document.getElementById('cursor-position');
    const charCount = document.getElementById('char-count');
    const fileEncoding = document.getElementById('file-encoding');
    
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