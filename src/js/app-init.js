/*
 * =====================================================
 * Sert Editor - アプリケーション初期化
 * =====================================================
 */

import { setEditor, setCurrentContent, setTauriInvoke } from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus, updateWindowTitle } from './ui-updater.js';
import { setupEventListeners } from './event-listeners.js';
import { exitApp } from './app-exit.js';

/**
 * Tauri APIの初期化
 * ウィンドウクローズイベントの設定も行う
 */
async function initializeTauri() {
    try {
        console.log('Initializing Tauri...');
        console.log('window.__TAURI__:', typeof window.__TAURI__);
        
        if (window.__TAURI__ && window.__TAURI__.core) {
            console.log('Tauri core found, setting up invoke');
            setTauriInvoke(window.__TAURI__.core.invoke);
            console.log('Tauri invoke set up successfully');
            
            // ウィンドウクローズイベントの設定
            if (window.__TAURI__.window) {
                console.log('Setting up window close handler');
                const { getCurrentWindow } = window.__TAURI__.window;
                const currentWindow = getCurrentWindow();
                
                await currentWindow.onCloseRequested(async (event) => {
                    console.log('🚪 Window close requested via X button');
                    event.preventDefault();
                    
                    // フラグをリセットして確実に実行
                    if (exitApp.isRunning) {
                        console.log('⚠️ exitApp already running, resetting flag');
                        exitApp.isRunning = false;
                    }
                    
                    // 少し遅延させてダイアログを確実に表示
                    setTimeout(async () => {
                        try {
                            console.log('🚪 Calling exitApp from window close event');
                            await exitApp();
                        } catch (error) {
                            console.error('❌ Window close exitApp failed:', error);
                            // エラー時は強制終了
                            await currentWindow.close();
                        }
                    }, 100);
                });
                console.log('Window close handler set up');
            }
            
            // Tauri APIs の確認
            console.log('Tauri.fs available:', !!window.__TAURI__.fs);
            console.log('Tauri.dialog available:', !!window.__TAURI__.dialog);
            console.log('Tauri.clipboard available:', !!window.__TAURI__.clipboard);
            console.log('Tauri.window available:', !!window.__TAURI__.window);
            
        } else {
            console.log('Tauri core not available');
        }
    } catch (error) {
        console.error('Tauri API初期化失敗:', error);
    }
}

/**
 * アプリケーション初期化
 */
export async function initializeApp() {
    console.log('Starting app initialization...');
    
    await initializeTauri();
    
    const editorElement = document.getElementById('editor');
    if (!editorElement) {
        console.error('エディタ要素が見つかりません');
        return;
    }
    
    console.log('Editor element found, setting up...');
    setEditor(editorElement);
    
    // エディタの初期設定
    setCurrentContent(editorElement.value);
    initializeUndoStack();
    
    // イベントリスナーを設定
    setupEventListeners();
    
    // 初期UI更新
    updateLineNumbers();
    updateStatus();
    
    // 初期タイトル設定を追加
    console.log('🏷️ Setting initial window title...');
    await updateWindowTitle();
    
    // カーソルを1行目1列目に設定
    editorElement.setSelectionRange(0, 0);
    editorElement.focus();
    
    console.log('App initialization completed');
}