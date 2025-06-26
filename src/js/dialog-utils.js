/*
 * =====================================================
 * Sert Editor - 確認ダイアログ表示
 * =====================================================
 */

import { editor } from './globals.js';

/**
 * 新規作成確認ダイアログを表示（キーボードナビゲーション対応）
 */
export async function showNewFileDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'new-file-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            padding: 20px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold;">
                内容に変更があります
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                保存せずに新規作成すると、変更内容は失われます。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-and-new-btn" tabindex="1" style="
                    background-color: #0e639c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存して新規作成</button>
                <button id="new-without-saving-btn" tabindex="2" style="
                    background-color: #d14949;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存せずに新規作成</button>
                <button id="cancel-new-btn" tabindex="3" style="
                    background-color: #5a5a5a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">キャンセル</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-new-btn', 'new-without-saving-btn', 'cancel-new-btn'], 
            ['saveAndNew', 'newWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * ファイルを開く確認ダイアログを表示（キーボードナビゲーション対応）
 */
export async function showOpenFileDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'open-file-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            padding: 20px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold;">
                内容に変更があります
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                保存せずにファイルを開くと、変更内容は失われます。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-and-open-btn" tabindex="1" style="
                    background-color: #0e639c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存してから開く</button>
                <button id="open-without-saving-btn" tabindex="2" style="
                    background-color: #d14949;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存せずに開く</button>
                <button id="cancel-open-btn" tabindex="3" style="
                    background-color: #5a5a5a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">キャンセル</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-open-btn', 'open-without-saving-btn', 'cancel-open-btn'], 
            ['saveAndOpen', 'openWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * 終了確認ダイアログを表示（キーボードナビゲーション対応）
 */
export async function showExitDialog() {
    return new Promise((resolve) => {
        const dialogOverlay = document.createElement('div');
        dialogOverlay.id = 'exit-dialog-overlay';
        dialogOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #2d2d30;
            border: 1px solid #3e3e40;
            border-radius: 6px;
            padding: 20px;
            min-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            color: #d4d4d4;
        `;
        
        dialog.innerHTML = `
            <div style="margin-bottom: 16px; font-size: 16px; font-weight: bold;">
                内容に変更があります
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                保存せずに終了すると、変更内容は失われます。
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="save-and-exit-btn" tabindex="1" style="
                    background-color: #0e639c;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存して終了</button>
                <button id="exit-without-saving-btn" tabindex="2" style="
                    background-color: #d14949;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">保存せずに終了</button>
                <button id="cancel-exit-btn" tabindex="3" style="
                    background-color: #5a5a5a;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, box-shadow 0.2s;
                ">キャンセル</button>
            </div>
        `;
        
        dialogOverlay.appendChild(dialog);
        document.body.appendChild(dialogOverlay);
        
        // ダイアログの共通処理を呼び出し
        setupDialogNavigation(dialogOverlay, ['save-and-exit-btn', 'exit-without-saving-btn', 'cancel-exit-btn'], 
            ['saveAndExit', 'exitWithoutSaving', 'cancel'], resolve);
    });
}

/**
 * ダイアログの共通キーボードナビゲーション処理
 */
function setupDialogNavigation(dialogOverlay, buttonIds, returnValues, resolve) {
    const buttons = buttonIds.map(id => document.getElementById(id));
    let currentButtonIndex = 2; // デフォルトで「キャンセル」を選択
    
    // フォーカススタイルを適用する関数
    function updateFocus() {
        buttons.forEach((btn, index) => {
            if (index === currentButtonIndex) {
                btn.style.boxShadow = '0 0 0 2px #0078d4';
                btn.style.outline = '2px solid #0078d4';
                btn.focus();
            } else {
                btn.style.boxShadow = 'none';
                btn.style.outline = 'none';
            }
        });
    }
    
    // 初期フォーカスを設定
    updateFocus();
    
    // ダイアログ終了処理
    function closeDialog(choice) {
        document.body.removeChild(dialogOverlay);
        document.removeEventListener('keydown', handleDialogKeyDown);
        setTimeout(() => editor.focus(), 0);
        resolve(choice);
    }
    
    // キーボードイベントハンドラー
    function handleDialogKeyDown(e) {
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                updateFocus();
                break;
                
            case 'ArrowRight':
            case 'ArrowDown':
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey && e.key === 'Tab') {
                    currentButtonIndex = (currentButtonIndex - 1 + buttons.length) % buttons.length;
                } else {
                    currentButtonIndex = (currentButtonIndex + 1) % buttons.length;
                }
                updateFocus();
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                closeDialog(returnValues[currentButtonIndex]);
                break;
                
            case 'Escape':
                e.preventDefault();
                closeDialog('cancel');
                break;
        }
    }
    
    // ボタンクリックイベントの設定
    buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => closeDialog(returnValues[index]));
    });
    
    // マウスホバーでフォーカス更新
    buttons.forEach((btn, index) => {
        btn.addEventListener('mouseenter', () => {
            currentButtonIndex = index;
            updateFocus();
        });
    });
    
    // キーボードイベントリスナーを追加
    document.addEventListener('keydown', handleDialogKeyDown);
    
    // オーバーレイクリックでキャンセル
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeDialog('cancel');
        }
    });
}