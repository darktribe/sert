/*
 * =====================================================
 * Sert Editor - Tauri API ユーティリティ
 * Tauri関連の共通処理をまとめたモジュール
 * =====================================================
 */

import { setTauriInvoke } from '../core/state.js';

/**
 * Tauri APIの初期化
 * ウィンドウクローズイベントの設定も行う
 */
export async function initializeTauri() {
    try {
        if (window.__TAURI__ && window.__TAURI__.core) {
            const invoke = window.__TAURI__.core.invoke;
            setTauriInvoke(invoke);
            
            // ウィンドウクローズイベントの設定
            if (window.__TAURI__.window) {
                const { getCurrentWindow } = window.__TAURI__.window;
                const currentWindow = getCurrentWindow();
                
                await currentWindow.onCloseRequested(async (event) => {
                    event.preventDefault();
                    const { exitApp } = await import('../features/file-operations.js');
                    await exitApp();
                });
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.log('Tauri API初期化失敗:', error);
        return false;
    }
}

/**
 * ファイルダイアログを開く
 */
export async function openFileDialog() {
    if (window.__TAURI__ && window.__TAURI__.dialog) {
        return await window.__TAURI__.dialog.open({
            title: "ファイルを開く",
            multiple: false,
            filters: [
                { name: 'テキストファイル', extensions: ['txt', 'md', 'rs', 'js', 'html', 'css', 'json', 'xml', 'py'] },
                { name: 'すべてのファイル', extensions: ['*'] }
            ]
        });
    }
    throw new Error('ファイルオープン機能はTauriアプリでのみ利用可能です');
}

/**
 * ファイル保存ダイアログを開く
 */
export async function saveFileDialog(title = "名前を付けて保存") {
    if (window.__TAURI__ && window.__TAURI__.dialog) {
        return await window.__TAURI__.dialog.save({
            title: title,
            filters: [
                { name: 'テキストファイル', extensions: ['txt'] },
                { name: 'Markdownファイル', extensions: ['md'] },
                { name: 'すべてのファイル', extensions: ['*'] }
            ]
        });
    }
    throw new Error('ファイル保存機能はTauriアプリでのみ利用可能です');
}

/**
 * ファイルを読み込む
 */
export async function readFile(filePath) {
    const { tauriInvoke } = await import('../core/state.js');
    
    if (window.__TAURI__ && window.__TAURI__.fs) {
        return await window.__TAURI__.fs.readTextFile(filePath);
    } else if (tauriInvoke) {
        return await tauriInvoke('read_file', { path: filePath });
    }
    throw new Error('ファイル読み込み機能はTauriアプリでのみ利用可能です');
}

/**
 * ファイルに書き込む
 */
export async function writeFile(filePath, content) {
    const { tauriInvoke } = await import('../core/state.js');
    
    if (window.__TAURI__ && window.__TAURI__.fs) {
        await window.__TAURI__.fs.writeTextFile(filePath, content);
    } else if (tauriInvoke) {
        await tauriInvoke('write_file', { 
            path: filePath, 
            content: content 
        });
    } else {
        throw new Error('ファイル書き込み機能はTauriアプリでのみ利用可能です');
    }
}

/**
 * クリップボードに書き込む
 */
export async function writeToClipboard(text) {
    const { tauriInvoke } = await import('../core/state.js');
    
    try {
        if (window.__TAURI__ && window.__TAURI__.clipboard) {
            await window.__TAURI__.clipboard.writeText(text);
        } else if (tauriInvoke) {
            await tauriInvoke('write_clipboard', { text: text });
        } else {
            await navigator.clipboard.writeText(text);
        }
        return true;
    } catch (error) {
        console.error('クリップボード書き込みに失敗:', error);
        try {
            document.execCommand('copy');
            return true;
        } catch (fallbackError) {
            console.error('フォールバックのコピーも失敗:', fallbackError);
            return false;
        }
    }
}

/**
 * クリップボードから読み込む
 */
export async function readFromClipboard() {
    const { tauriInvoke } = await import('../core/state.js');
    
    try {
        if (window.__TAURI__ && window.__TAURI__.clipboard) {
            return await window.__TAURI__.clipboard.readText();
        } else if (tauriInvoke) {
            return await tauriInvoke('read_clipboard');
        } else {
            return await navigator.clipboard.readText();
        }
    } catch (error) {
        console.error('クリップボード読み込みに失敗:', error);
        throw error;
    }
}

/**
 * アプリケーションを終了する
 */
export async function exitApplication() {
    const { tauriInvoke } = await import('../core/state.js');
    
    if (tauriInvoke) {
        await tauriInvoke('exit_app');
    } else {
        window.close();
    }
}