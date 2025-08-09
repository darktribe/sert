/*
 * =====================================================
 * Vinsert Editor - メニュー制御（Tauri 2.5 MacOS対応版）
 * =====================================================
 */

// メニューの状態管理
let currentOpenMenu = null;
let isMenuOperationInProgress = false;

/**
 * ドロップダウンメニューの表示/非表示切り替え
 */
export function toggleMenu(menuId) {
    // 操作中の場合は無視
    if (isMenuOperationInProgress) {
        console.log('Menu operation in progress, ignoring click');
        return;
    }
    
    isMenuOperationInProgress = true;
    
    console.log('Toggle menu called:', menuId);
    const menu = document.getElementById(menuId);
    if (!menu) {
        console.error('Menu not found:', menuId);
        isMenuOperationInProgress = false;
        return;
    }
    
    // 他のメニューを閉じる
    const allMenus = document.querySelectorAll('.dropdown-menu');
    allMenus.forEach(m => {
        if (m.id !== menuId) {
            m.style.display = 'none';
        }
    });
    
    // 対象メニューを切り替え
    if (currentOpenMenu === menuId) {
        // 既に開いているメニューをクリックした場合は閉じる
        menu.style.display = 'none';
        currentOpenMenu = null;
        console.log('Menu closed:', menuId);
    } else {
        // 新しいメニューを開く
        menu.style.display = 'block';
        currentOpenMenu = menuId;
        console.log('Menu opened:', menuId);
    }
    
    // 操作完了フラグをリセット（少し遅延させる）
    setTimeout(() => {
        isMenuOperationInProgress = false;
    }, 100);
}

/**
 * すべてのメニューを閉じる
 */
export function closeAllMenus() {
    console.log('Closing all menus');
    const menus = document.querySelectorAll('.dropdown-menu');
    menus.forEach(menu => {
        menu.style.display = 'none';
    });
    currentOpenMenu = null;
}

/**
 * メニュー外クリック時の処理（Tauri 2.5対応版）
 */
export function handleGlobalClick(e) {
    // メニュー操作中は無視
    if (isMenuOperationInProgress) {
        return;
    }
    
    const menuItem = e.target.closest('.menu-item');
    const dropdownMenu = e.target.closest('.dropdown-menu');
    const menuOption = e.target.closest('.menu-option');
    
    // メニューアイテムのクリックの場合は何もしない（toggleMenuが処理する）
    if (menuItem) {
        return;
    }
    
    // メニューオプションがクリックされた場合は、遅延してからメニューを閉じる
    if (menuOption) {
        setTimeout(() => {
            closeAllMenus();
        }, 200);
        return;
    }
    
    // メニュー外のクリックの場合のみメニューを閉じる
    if (!dropdownMenu) {
        closeAllMenus();
    }
}

/**
 * ESCキーでメニューを閉じる処理
 */
export function handleMenuEscape(e) {
    if (e.key === 'Escape') {
        closeAllMenus();
    }
}