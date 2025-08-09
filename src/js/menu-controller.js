/*
 * =====================================================
 * Vinsert Editor - メニュー制御（プロダクションビルド対応版）
 * =====================================================
 */

/**
 * ドロップダウンメニューの表示/非表示切り替え
 */
export function toggleMenu(menuId) {
    console.log('Toggle menu called:', menuId);
    const menu = document.getElementById(menuId);
    if (!menu) {
        console.error('Menu not found:', menuId);
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
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
    
    console.log('Menu display set to:', menu.style.display);
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
}

/**
 * メニュー外クリック時の処理（プロダクションビルド対応版）
 */
export function handleGlobalClick(e) {
    const menuItem = e.target.closest('.menu-item');
    const dropdownMenu = e.target.closest('.dropdown-menu');
    
    // メニューアイテムまたはドロップダウンメニュー内のクリックでない場合、すべてのメニューを閉じる
    if (!menuItem && !dropdownMenu) {
        closeAllMenus();
    }
    
    // メニューオプション（.menu-option）がクリックされた場合、メニューを閉じる
    // data-action属性の有無で判定（プロダクションビルド対応）
    if (e.target.classList.contains('menu-option') || e.target.closest('.menu-option')) {
        setTimeout(() => {
            closeAllMenus();
        }, 100);
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