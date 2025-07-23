/*
 * =====================================================
 * Vinsert Editor - 行ハイライト機能
 * =====================================================
 */

import { 
    isLineHighlightEnabled, 
    setIsLineHighlightEnabled,
    setCurrentHighlightedLine 
} from './globals.js';
import { updateLineHighlight } from './ui-updater.js';
import { closeAllMenus } from './menu-controller.js';

/**
 * 行ハイライトのオン・オフを切り替える
 */
export function toggleLineHighlight() {
    const newState = !isLineHighlightEnabled;
    setIsLineHighlightEnabled(newState);
    
    // メニューアイテムのチェック状態を更新
    updateLineHighlightMenuState(newState);
    
    if (!newState) {
        // ハイライトを無効にした場合は、現在のハイライトを削除
        const existingHighlight = document.querySelector('.line-highlight-overlay');
        if (existingHighlight) {
            existingHighlight.remove();
        }
        setCurrentHighlightedLine(-1);
    } else {
        // ハイライトを有効にした場合は、現在の行をハイライト
        updateLineHighlight();
    }
    
    closeAllMenus();
    
    console.log(`🎨 Line highlight ${newState ? 'enabled' : 'disabled'}`);
}

/**
 * メニューアイテムのチェック状態を更新
 */
export function updateLineHighlightMenuState(enabled) {
    const menuOption = document.getElementById('line-highlight-menu-option');
    if (menuOption) {
        const checkmark = menuOption.querySelector('.menu-checkmark');
        if (checkmark) {
            checkmark.style.visibility = enabled ? 'visible' : 'hidden';
        }
    }
}

/**
 * 行ハイライト設定を初期化
 */
export function initializeLineHighlight() {
    // メニューの初期状態を設定
    updateLineHighlightMenuState(isLineHighlightEnabled);
    
    // ハイライトが有効な場合は初期ハイライトを設定
    if (isLineHighlightEnabled) {
        setTimeout(() => {
            updateLineHighlight();
        }, 100);
    }
}