/*
 * =====================================================
 * Vinsert Editor - ダイアログドラッグ機能システム（修正版）
 * 無限ループ・重複表示・ドラッグ不能問題を修正
 * =====================================================
 */

/**
 * ダイアログドラッグ機能のクラス
 */
class DialogDragger {
    constructor() {
        this.draggedElement = null;
        this.startX = 0;
        this.startY = 0;
        this.startLeft = 0;
        this.startTop = 0;
        this.isDragging = false;
        this.processedDialogs = new WeakSet(); // 処理済みダイアログを追跡
        
        // イベントリスナーをバインド
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
    }
    
    /**
     * ダイアログにドラッグ機能を追加
     */
    makeDraggable(dialogElement) {
        if (!dialogElement || this.processedDialogs.has(dialogElement)) {
            return false; // 既に処理済みまたは無効な要素
        }
        
        console.log('🖱️ Making dialog draggable:', dialogElement.className);
        
        // 処理済みマークを追加
        this.processedDialogs.add(dialogElement);
        
        // ドラッグハンドルを探す（既存のヘッダーを優先）
        let dragHandle = dialogElement.querySelector('.search-dialog-header');
        
        if (dragHandle) {
            // 既存のヘッダーを使用
            this.setupExistingHeader(dragHandle);
        } else {
            // 新しいドラッグハンドルを作成
            dragHandle = this.createDragHandle();
            dialogElement.insertBefore(dragHandle, dialogElement.firstChild);
        }
        
        // ダイアログを絶対位置指定に変更
        this.setupDialogPosition(dialogElement);
        
        // イベントリスナーを追加
        this.addEventListeners(dragHandle);
        
        // ダイアログに参照を保存
        dialogElement._dragHandle = dragHandle;
        dialogElement._dragger = this;
        
        console.log('✅ Dialog drag functionality added successfully');
        return true;
    }
    
    /**
     * 既存のヘッダーをドラッグハンドルとして設定
     */
    setupExistingHeader(header) {
        // 既にドラッグヒントが追加されているかチェック
        if (header.querySelector('.drag-hint')) {
            return; // 既に処理済み
        }
        
        header.style.cursor = 'move';
        header.style.userSelect = 'none';
        
        // ドラッグヒントを追加（一度だけ）
        const hintText = document.createElement('small');
        hintText.className = 'drag-hint';
        hintText.textContent = ' (ドラッグ移動可能)';
        hintText.style.cssText = `
            font-size: 11px;
            color: #888;
            margin-left: 8px;
            font-weight: normal;
        `;
        header.appendChild(hintText);
    }
    
    /**
     * 新しいドラッグハンドルを作成
     */
    createDragHandle() {
        const dragHandle = document.createElement('div');
        dragHandle.className = 'dialog-drag-handle';
        dragHandle.innerHTML = '<span>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</span>';
        dragHandle.style.cssText = `
            background-color: #37373d;
            padding: 4px 16px;
            cursor: move;
            user-select: none;
            font-size: 10px;
            color: #888;
            text-align: center;
            border-bottom: 1px solid #3e3e40;
            border-radius: 8px 8px 0 0;
            transition: background-color 0.2s;
        `;
        return dragHandle;
    }
    
    /**
     * ダイアログの位置を設定
     */
    setupDialogPosition(dialogElement) {
        if (dialogElement.style.position === 'fixed') {
            return; // 既に設定済み
        }
        
        dialogElement.style.position = 'fixed';
        dialogElement.style.transform = 'none';
        dialogElement.style.margin = '0';
        
        // 初期位置を中央に設定
        this.centerDialog(dialogElement);
    }
    
    /**
     * イベントリスナーを追加
     */
    addEventListeners(dragHandle) {
        // 重複追加を防ぐため、既存のリスナーをチェック
        if (dragHandle._dragListenersAdded) {
            return;
        }
        
        dragHandle.addEventListener('mousedown', this.handleMouseDown);
        dragHandle.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        
        // ホバー効果を追加
        dragHandle.addEventListener('mouseenter', () => {
            if (!this.isDragging) {
                dragHandle.style.backgroundColor = '#4a4a4a';
            }
        });
        
        dragHandle.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                dragHandle.style.backgroundColor = '#37373d';
            }
        });
        
        dragHandle._dragListenersAdded = true;
    }
    
    /**
     * ダイアログを画面中央に配置
     */
    centerDialog(dialogElement) {
        // ダイアログのサイズを取得（表示されている必要がある）
        const rect = dialogElement.getBoundingClientRect();
        const centerX = Math.max(0, (window.innerWidth - rect.width) / 2);
        const centerY = Math.max(0, (window.innerHeight - rect.height) / 2);
        
        dialogElement.style.left = centerX + 'px';
        dialogElement.style.top = centerY + 'px';
    }
    
    /**
     * マウスダウンイベントハンドラー
     */
    handleMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('🖱️ Mouse down on drag handle');
        this.startDrag(e.clientX, e.clientY, e.target);
    }
    
    /**
     * タッチスタートイベントハンドラー
     */
    handleTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        console.log('👆 Touch start on drag handle');
        this.startDrag(touch.clientX, touch.clientY, e.target);
    }
    
    /**
     * ドラッグ開始処理
     */
    startDrag(clientX, clientY, target) {
        // ドラッグハンドルまたはその親ダイアログを特定
        const dragHandle = target.closest('.dialog-drag-handle, .search-dialog-header');
        const dialog = dragHandle ? dragHandle.closest('.search-dialog, [class*="dialog"]:not([class*="overlay"])') : null;
        
        if (!dialog) {
            console.warn('⚠️ Could not find dialog for drag handle');
            return;
        }
        
        console.log('🖱️ Starting drag for dialog:', dialog.className);
        
        this.draggedElement = dialog;
        this.isDragging = true;
        
        const rect = dialog.getBoundingClientRect();
        this.startX = clientX;
        this.startY = clientY;
        this.startLeft = rect.left;
        this.startTop = rect.top;
        
        // グローバルイベントリスナーを追加
        document.addEventListener('mousemove', this.handleMouseMove, { passive: false });
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        
        // ドラッグ中のスタイル
        dialog.style.transition = 'none';
        dialog.style.zIndex = '20000';
        dialog.style.userSelect = 'none';
        
        // ドラッグハンドルのスタイル更新
        if (dragHandle) {
            dragHandle.style.backgroundColor = '#007acc';
        }
        
        // カーソルを変更
        document.body.style.cursor = 'move';
        document.body.style.userSelect = 'none';
        
        console.log('✅ Drag started successfully');
    }
    
    /**
     * マウス移動イベントハンドラー
     */
    handleMouseMove(e) {
        e.preventDefault();
        this.updatePosition(e.clientX, e.clientY);
    }
    
    /**
     * タッチ移動イベントハンドラー
     */
    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.updatePosition(touch.clientX, touch.clientY);
    }
    
    /**
     * 位置更新処理
     */
    updatePosition(clientX, clientY) {
        if (!this.isDragging || !this.draggedElement) return;
        
        const deltaX = clientX - this.startX;
        const deltaY = clientY - this.startY;
        
        let newLeft = this.startLeft + deltaX;
        let newTop = this.startTop + deltaY;
        
        // 画面境界内に制限
        const rect = this.draggedElement.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width;
        const maxTop = window.innerHeight - rect.height;
        
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
        
        this.draggedElement.style.left = newLeft + 'px';
        this.draggedElement.style.top = newTop + 'px';
    }
    
    /**
     * マウスアップイベントハンドラー
     */
    handleMouseUp(e) {
        console.log('🖱️ Mouse up - ending drag');
        this.endDrag();
    }
    
    /**
     * タッチエンドイベントハンドラー
     */
    handleTouchEnd(e) {
        console.log('👆 Touch end - ending drag');
        this.endDrag();
    }
    
    /**
     * ドラッグ終了処理
     */
    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // グローバルイベントリスナーを削除
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        
        // スタイルを復元
        if (this.draggedElement) {
            this.draggedElement.style.transition = '';
            this.draggedElement.style.zIndex = '';
            this.draggedElement.style.userSelect = '';
            
            // ドラッグハンドルのスタイルを復元
            const dragHandle = this.draggedElement._dragHandle;
            if (dragHandle) {
                dragHandle.style.backgroundColor = '#37373d';
            }
        }
        
        // カーソルを復元
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        this.draggedElement = null;
        
        console.log('✅ Drag ended successfully');
    }
    
    /**
     * ドラッグ機能を削除
     */
    removeDragFunctionality(dialogElement) {
        if (!dialogElement) return;
        
        const dragHandle = dialogElement._dragHandle;
        if (dragHandle) {
            dragHandle.removeEventListener('mousedown', this.handleMouseDown);
            dragHandle.removeEventListener('touchstart', this.handleTouchStart);
            
            // 独自作成のハンドルの場合は削除
            if (dragHandle.classList.contains('dialog-drag-handle')) {
                dragHandle.remove();
            }
        }
        
        // 処理済みマークを削除
        this.processedDialogs.delete(dialogElement);
        
        // 参照をクリア
        delete dialogElement._dragHandle;
        delete dialogElement._dragger;
    }
}

// グローバルインスタンス
const globalDialogDragger = new DialogDragger();

/**
 * ダイアログにドラッグ機能を追加する関数（エクスポート用）
 */
export function enableDialogDrag(dialogElement) {
    if (dialogElement && typeof dialogElement.getBoundingClientRect === 'function') {
        return globalDialogDragger.makeDraggable(dialogElement);
    }
    console.warn('⚠️ Invalid dialog element for drag functionality');
    return false;
}

/**
 * ダイアログからドラッグ機能を削除する関数（エクスポート用）
 */
export function disableDialogDrag(dialogElement) {
    if (dialogElement && dialogElement._dragger) {
        dialogElement._dragger.removeDragFunctionality(dialogElement);
        return true;
    }
    return false;
}

/**
 * 特定のダイアログを手動でドラッグ可能にする関数
 */
export function makeDialogDraggable(selector) {
    const dialog = document.querySelector(selector);
    if (dialog) {
        return enableDialogDrag(dialog);
    }
    console.warn('⚠️ Dialog not found:', selector);
    return false;
}

/**
 * MutationObserverを使用した自動ダイアログ検出（改良版）
 */
let dialogObserver = null;
let observerTimeout = null;

export function enableDragForAllDialogs() {
    console.log('🖱️ Setting up automatic dialog drag detection...');
    
    // 既存のObserverを停止
    if (dialogObserver) {
        dialogObserver.disconnect();
    }
    
    // 既存のダイアログを処理
    const existingDialogs = document.querySelectorAll('.search-dialog, [class*="dialog"]:not([class*="overlay"])');
    existingDialogs.forEach(dialog => {
        if (!globalDialogDragger.processedDialogs.has(dialog)) {
            enableDialogDrag(dialog);
        }
    });
    
    // 新しいObserverを作成
    dialogObserver = new MutationObserver((mutations) => {
        // デバウンス処理
        if (observerTimeout) {
            clearTimeout(observerTimeout);
        }
        
        observerTimeout = setTimeout(() => {
            let foundNewDialogs = false;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // ダイアログオーバーレイが追加された場合
                        if (node.classList && node.classList.contains('search-dialog-overlay')) {
                            const dialog = node.querySelector('.search-dialog, [class*="dialog"]:not([class*="overlay"])');
                            if (dialog && !globalDialogDragger.processedDialogs.has(dialog)) {
                                setTimeout(() => enableDialogDrag(dialog), 200);
                                foundNewDialogs = true;
                            }
                        }
                        // ダイアログが直接追加された場合
                        else if (node.classList && (node.classList.contains('search-dialog') || 
                               Array.from(node.classList).some(cls => cls.includes('dialog') && !cls.includes('overlay')))) {
                            if (!globalDialogDragger.processedDialogs.has(node)) {
                                setTimeout(() => enableDialogDrag(node), 200);
                                foundNewDialogs = true;
                            }
                        }
                        // 子要素にダイアログがある場合
                        else {
                            const childDialogs = node.querySelectorAll ? node.querySelectorAll('.search-dialog, [class*="dialog"]:not([class*="overlay"])') : [];
                            childDialogs.forEach(dialog => {
                                if (!globalDialogDragger.processedDialogs.has(dialog)) {
                                    setTimeout(() => enableDialogDrag(dialog), 200);
                                    foundNewDialogs = true;
                                }
                            });
                        }
                    }
                });
            });
            
            if (foundNewDialogs) {
                console.log('🖱️ New dialogs detected and made draggable');
            }
        }, 100);
    });
    
    // Observer開始
    dialogObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Automatic dialog drag detection enabled');
    return dialogObserver;
}

/**
 * 自動初期化関数
 */
export function initializeDialogDragSystem() {
    console.log('🖱️ Initializing dialog drag system...');
    
    // 既存のダイアログにドラッグ機能を追加
    enableDragForAllDialogs();
    
    console.log('✅ Dialog drag system initialized');
}

// DOM読み込み完了時に自動初期化（一度だけ）
let initialized = false;

function autoInitialize() {
    if (initialized) return;
    initialized = true;
    
    setTimeout(initializeDialogDragSystem, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
} else {
    autoInitialize();
}