/*
 * =====================================================
 * Vinsert Editor - 行ハイライト機能（修正版）
 * =====================================================
 */

import { 
    isLineHighlightEnabled, 
    setIsLineHighlightEnabled,
    setCurrentHighlightedLine,
    saveLineHighlightToStorage,
    loadLineHighlightFromStorage
} from './globals.js';
import { updateLineHighlight } from './ui-updater.js';
import { closeAllMenus } from './menu-controller.js';

/**
 * 行ハイライトのオン・オフを切り替える
 */
export function toggleLineHighlight() {
    const newState = !isLineHighlightEnabled;
    setIsLineHighlightEnabled(newState);
    
    // ローカルストレージに保存
    saveLineHighlightToStorage(newState);
    
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
    console.log('🎨 Initializing line highlight settings...');
    
    try {
        // ローカルストレージから設定を読み込み
        const savedEnabled = loadLineHighlightFromStorage();
        setIsLineHighlightEnabled(savedEnabled);
        
        console.log(`📂 Line highlight loaded from storage: ${savedEnabled}`);
        
        // メニューの初期状態を設定
        updateLineHighlightMenuState(savedEnabled);
        
        // ハイライトが有効な場合は初期ハイライトを設定
        if (savedEnabled) {
            setTimeout(() => {
                updateLineHighlight();
            }, 100);
        }
        
        console.log(`✅ Line highlight initialized: ${savedEnabled ? 'enabled' : 'disabled'}`);
        
    } catch (error) {
        console.error('❌ Line highlight initialization failed:', error);
        
        // エラー時のフォールバック
        setIsLineHighlightEnabled(true);
        updateLineHighlightMenuState(true);
        console.log('🔄 Using fallback line highlight settings');
    }
}