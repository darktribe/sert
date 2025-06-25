/*
 * =====================================================
 * Sert Editor - メニュー制御
 * ドロップダウンメニューの表示/非表示を管理
 * =====================================================
 */

/**
 * ドロップダウンメニューの表示/非表示切り替え
 */
export function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    closeAllMenus();
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

/**
 * すべてのメニューを閉じる
 */
export function closeAllMenus() {
    const menus = document.querySelectorAll('.dropdown-menu');
    menus.forEach(menu => {
        menu.style.display = 'none';
    });
}

/**
 * メニュー外クリック時の処理
 */
export function handleGlobalClick(e) {
    if (!e.target.closest('.menu-item')) {
        closeAllMenus();
    }
}

/**
 * メニューイベントリスナーの設定
 */
export function setupMenuEvents() {
    document.addEventListener('click', handleGlobalClick);
    
    // グローバル関数として設定（HTMLから呼び出すため）
    window.toggleMenu = toggleMenu;
}