/*
 * =====================================================
 * Sert Editor - アプリケーション初期化
 * =====================================================
 */

import { setEditor, setCurrentContent, setTauriInvoke } from './globals.js';
import { initializeUndoStack } from './undo-redo.js';
import { updateLineNumbers, updateStatus } from './ui-updater.js';
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
                    event.preventDefault();
                    await exitApp();
                });
                console.log('Window close handler set up');
            }
            
            // Tauri APIs の確認
            console.log('Tauri.fs available:', !!window.__TAURI__.fs);
            console.log('Tauri.dialog available:', !!window.__TAURI__.dialog);
            console.log('Tauri.clipboard available:', !!window.__TAURI__.clipboard);
            
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
    
    // カーソルを1行目1列目に設定
    editorElement.setSelectionRange(0, 0);
    editorElement.focus();
    
    console.log('App initialization completed');
}