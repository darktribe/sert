/*
 * =====================================================
 * Vinsert Editor - ダイアログドラッグ機能（シンプル版）
 * =====================================================
 */

/**
 * ダイアログドラッグ機能のクラス（簡素化版）
 */
class DialogDragger {
    constructor() {
        this.draggedElement = null;
        this.startX = 0;
        this.startY = 0;
        this.startLeft = 0;
        this.startTop = 0;
        this.isDragging = false;
    }
    
    /**
     * ダイアログにドラッグ機能を追加
     */
    makeDraggable(dialogElement) {
        if (!dialogElement || dialogElement._vinsertDragEnabled) {
            return false;
        }
        
        console.log('🖱️ Making dialog draggable:', dialogElement.className);
        
        // 処理済みマーク
        dialogElement._vinsertDragEnabled = true;
        
        // 既存のヘッダーを探す
        const header = dialogElement.querySelector('.search-dialog-header');
        if (!header) {
            console.warn('⚠️ No header found for dialog');
            return false;
        }
        
        // ヘッダーが既にドラッグ設定済みかチェック
        if (header._vinsertDragSetup) {
            return true;
        }
        
        // ダイアログを絶対位置指定に変更
        this.setupDialogPosition(dialogElement);
        
        // ヘッダーにドラッグ機能を追加
        this.setupHeader(header, dialogElement);
        
        console.log('✅ Dialog drag functionality added');
        return true;
    }
    
    /**
     * ヘッダーにドラッグ機能を設定
     */
    setupHeader(header, dialog) {
        if (header._vinsertDragSetup) return;
        
        // ドラッグヒントを追加
        const existingHint = header.querySelector('.drag-hint');
        if (!existingHint) {
            const hintText = document.createElement('small');
            hintText.className = 'drag-hint';
            hintText.textContent = ' (ドラッグ可能)';
            hintText.style.cssText = `
                font-size: 11px;
                color: #888;
                margin-left: 8px;
                font-weight: normal;
                pointer-events: none;
            `;
            header.appendChild(hintText);
        }
        
        // スタイル設定
        header.style.cursor = 'move';
        header.style.userSelect = 'none';
        header.style.webkitUserSelect = 'none';
        
        // イベントリスナー追加
        header.addEventListener('mousedown', (e) => this.handleMouseDown(e, dialog), { passive: false });
        header.addEventListener('touchstart', (e) => this.handleTouchStart(e, dialog), { passive: false });
        
        // ホバー効果
        header.addEventListener('mouseenter', () => {
            if (!this.isDragging) {
                header.style.backgroundColor = '#4a4a4a';
            }
        });
        
        header.addEventListener('mouseleave', () => {
            if (!this.isDragging) {
                header.style.backgroundColor = '#37373d';
            }
        });
        
        header._vinsertDragSetup = true;
        dialog._vinsertDragHeader = header;
    }
    
    /**
     * ダイアログの位置を設定
     */
    setupDialogPosition(dialogElement) {
        if (dialogElement.style.position === 'fixed') {
            return;
        }
        
        dialogElement.style.position = 'fixed';
        dialogElement.style.transform = 'none';
        dialogElement.style.margin = '0';
        
        // 初期位置を中央に設定
        this.centerDialog(dialogElement);
    }
    
    /**
     * ダイアログを画面中央に配置
     */
    centerDialog(dialogElement) {
        const rect = dialogElement.getBoundingClientRect();
        const centerX = Math.max(0, (window.innerWidth - rect.width) / 2);
        const centerY = Math.max(0, (window.innerHeight - rect.height) / 2);
        
        dialogElement.style.left = centerX + 'px';
        dialogElement.style.top = centerY + 'px';
    }
    
    /**
     * マウスダウンイベントハンドラー
     */
    handleMouseDown(e, dialog) {
        e.preventDefault();
        e.stopPropagation();
        this.startDrag(e.clientX, e.clientY, dialog);
    }
    
    /**
     * タッチスタートイベントハンドラー
     */
    handleTouchStart(e, dialog) {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.touches[0];
        this.startDrag(touch.clientX, touch.clientY, dialog);
    }
    
    /**
     * ドラッグ開始処理
     */
    startDrag(clientX, clientY, dialog) {
        if (!dialog) return;
        
        this.draggedElement = dialog;
        this.isDragging = true;
        
        const rect = dialog.getBoundingClientRect();
        this.startX = clientX;
        this.startY = clientY;
        this.startLeft = rect.left;
        this.startTop = rect.top;
        
        // グローバルイベントリスナーを追加
        document.addEventListener('mousemove', this.handleMouseMove.bind(this), { passive: false });
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // ドラッグ中のスタイル
        dialog.style.transition = 'none';
        dialog.style.zIndex = '20000';
        dialog.style.userSelect = 'none';
        
        // ヘッダーのスタイル更新
        const header = dialog._vinsertDragHeader;
        if (header) {
            header.style.backgroundColor = '#007acc';
        }
        
        // カーソルを変更
        document.body.style.cursor = 'move';
        document.body.style.userSelect = 'none';
        
        console.log('✅ Drag started');
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
        this.endDrag();
    }
    
    /**
     * タッチエンドイベントハンドラー
     */
    handleTouchEnd(e) {
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
            
            // ヘッダーのスタイルを復元
            const header = this.draggedElement._vinsertDragHeader;
            if (header) {
                header.style.backgroundColor = '#37373d';
            }
        }
        
        // カーソルを復元
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        this.draggedElement = null;
        
        console.log('✅ Drag ended');
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
    return false;
}

/**
 * 新しいダイアログを検出して自動的にドラッグ機能を追加
 */
let dialogObserver = null;
let observerRunning = false;

export function enableDragForAllDialogs() {
    console.log('🖱️ Setting up dialog drag detection...');
    
    // 既存のObserverを停止
    if (dialogObserver) {
        dialogObserver.disconnect();
        dialogObserver = null;
    }
    
    // 既存のダイアログを処理
    const existingDialogs = document.querySelectorAll('.search-dialog');
    existingDialogs.forEach(dialog => {
        if (!dialog._vinsertDragEnabled) {
            enableDialogDrag(dialog);
        }
    });
    
    // 新しいObserverを作成（簡素化）
    dialogObserver = new MutationObserver((mutations) => {
        if (observerRunning) return;
        observerRunning = true;
        
        // 少し遅延してから処理
        setTimeout(() => {
            try {
                const allDialogs = document.querySelectorAll('.search-dialog');
                allDialogs.forEach(dialog => {
                    if (!dialog._vinsertDragEnabled && dialog.offsetParent !== null) {
                        enableDialogDrag(dialog);
                    }
                });
            } catch (error) {
                console.error('❌ Observer error:', error);
            } finally {
                observerRunning = false;
            }
        }, 300);
    });
    
    // Observer開始（設定を最小限に）
    dialogObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Dialog drag detection enabled');
}

/**
 * システム初期化
 */
export function initializeDialogDragSystem() {
    console.log('🖱️ Initializing dialog drag system...');
    enableDragForAllDialogs();
    console.log('✅ Dialog drag system initialized');
}

// DOM準備完了時の自動初期化
let initialized = false;

function autoInitialize() {
    if (initialized) return;
    initialized = true;
    initializeDialogDragSystem();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
} else {
    autoInitialize();
}