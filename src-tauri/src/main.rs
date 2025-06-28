// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Sert Editor - Rustバックエンド（Tauri 2.5専用版）
 * Python拡張機能対応のシンプルなテキストエディタ
 * ドラッグアンドドロップ・ファイル関連付け対応（完全修正版）
 * =====================================================
 */

use pyo3::prelude::*;
use pyo3::types::PyDict;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
use tauri::{Manager, Emitter, AppHandle, WebviewWindow, Window, WindowEvent};
use std::path::Path;

// =====================================================
// アプリケーション初期化とファイル関連付け
// =====================================================

#[tauri::command]
fn get_startup_file_path() -> Result<Option<String>, String> {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() > 1 {
        let file_path = &args[1];
        
        if std::path::Path::new(file_path).exists() {
            println!("📂 Startup file detected: {}", file_path);
            return Ok(Some(file_path.clone()));
        } else {
            println!("⚠️ Startup file does not exist: {}", file_path);
        }
    }
    
    Ok(None)
}

#[tauri::command]
fn validate_file_path(path: String) -> Result<bool, String> {
    let file_path = std::path::Path::new(&path);
    
    if file_path.exists() && file_path.is_file() {
        println!("✅ Valid file path: {}", path);
        Ok(true)
    } else {
        println!("❌ Invalid file path: {}", path);
        Ok(false)
    }
}

#[tauri::command]
fn get_file_info(path: String) -> Result<serde_json::Value, String> {
    let file_path = std::path::Path::new(&path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }
    
    if !file_path.is_file() {
        return Err(format!("Path is not a file: {}", path));
    }
    
    let metadata = std::fs::metadata(&path).map_err(|e| format!("Failed to get metadata: {}", e))?;
    let file_size = metadata.len();
    
    let file_name = file_path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let file_extension = file_path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_string();
    
    let info = serde_json::json!({
        "name": file_name,
        "extension": file_extension,
        "size": file_size,
        "path": path
    });
    
    println!("📋 File info: {}", info);
    Ok(info)
}

#[tauri::command]
async fn open_file_in_current_window(app_handle: AppHandle, window_label: String, file_path: String) -> Result<(), String> {
    println!("📂 Opening file in current window: {} (label: {})", file_path, window_label);
    
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Invalid file path: {}", file_path));
    }
    
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        if let Err(e) = window.emit("open-file-in-current", &file_path) {
            println!("❌ Failed to emit open-file-in-current event: {}", e);
            return Err(format!("Failed to send file open event: {}", e));
        }
        
        println!("✅ File open event sent to current window: {}", file_path);
        Ok(())
    } else {
        Err(format!("Window not found: {}", window_label))
    }
}

#[tauri::command]
async fn create_new_window_with_file(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    println!("📂 Creating new window for file: {}", file_path);
    
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Invalid file path: {}", file_path));
    }
    
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    
    let window_label = format!("editor_{}", timestamp);
    
    let file_name = path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown File");
    let window_title = format!("Sert - {}", file_name);
    
    match tauri::WebviewWindowBuilder::new(
        &app_handle,
        window_label.clone(),
        tauri::WebviewUrl::App("index.html".into())
    )
    .title(window_title)
    .inner_size(1200.0, 800.0)
    .center()
    .resizable(true)
    .build() {
        Ok(window) => {
            println!("✅ New window created: {}", window_label);
            
            let file_path_clone = file_path.clone();
            let window_clone = window.clone();
            
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
                
                if let Err(e) = window_clone.emit("open-file-on-start", &file_path_clone) {
                    println!("❌ Failed to emit open-file-on-start event: {}", e);
                } else {
                    println!("✅ File path sent to new window: {}", file_path_clone);
                }
            });
            
            Ok(window_label)
        },
        Err(e) => {
            println!("❌ Failed to create new window: {}", e);
            Err(format!("Failed to create new window: {}", e))
        }
    }
}

#[tauri::command]
async fn handle_file_drop_with_modification_check(
    app_handle: AppHandle,
    window_label: String,
    file_path: String, 
    is_modified: bool
) -> Result<String, String> {
    println!("📁 Handling file drop with modification check:");
    println!("  File: {}", file_path);
    println!("  Window: {}", window_label);
    println!("  Is Modified: {}", is_modified);
    
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Invalid file path: {}", file_path));
    }
    
    if is_modified {
        println!("📂 File is modified, creating new window");
        match create_new_window_with_file(app_handle, file_path).await {
            Ok(window_label) => Ok(format!("new_window:{}", window_label)),
            Err(e) => Err(e)
        }
    } else {
        println!("📂 No modifications, opening in current window");
        match open_file_in_current_window(app_handle, window_label, file_path.clone()).await {
            Ok(_) => Ok(format!("current_window:{}", file_path)),
            Err(e) => Err(e)
        }
    }
}
=======
>>>>>>> parent of e00ea71 (Macのマルチディスプレイ間移動をサポート)
=======
>>>>>>> parent of e00ea71 (Macのマルチディスプレイ間移動をサポート)
=======

// =====================================================
// Python統合機能（PyO3）
// =====================================================

#[tauri::command]
fn test_python() -> Result<String, String> {
    Python::with_gil(|py| {
        let result = py.eval_bound("2 + 2", None, None);
        match result {
            Ok(val) => Ok(format!("Python result: {}", val)),
            Err(e) => Err(format!("Python error: {}", e)),
        }
    })
}

#[tauri::command]
fn execute_python(code: String) -> Result<String, String> {
    Python::with_gil(|py| {
        let locals = PyDict::new_bound(py);
        match py.run_bound(&code, None, Some(&locals)) {
            Ok(_) => {
                match locals.get_item("result") {
                    Ok(Some(val)) => Ok(format!("{}", val)),
                    _ => Ok("Code executed successfully".to_string()),
                }
            },
            Err(e) => Err(format!("Python execution error: {}", e)),
        }
    })
}

#[tauri::command]
fn evaluate_python_expression(expression: String) -> Result<String, String> {
    Python::with_gil(|py| {
        match py.eval_bound(&expression, None, None) {
            Ok(val) => Ok(format!("{}", val)),
            Err(e) => Err(format!("Python evaluation error: {}", e)),
        }
    })
}

#[tauri::command]
fn run_python_file(file_path: String) -> Result<String, String> {
    Python::with_gil(|py| {
        match std::fs::read_to_string(&file_path) {
            Ok(code) => {
                let locals = PyDict::new_bound(py);
                match py.run_bound(&code, None, Some(&locals)) {
                    Ok(_) => Ok("Python file executed successfully".to_string()),
                    Err(e) => Err(format!("Python file execution error: {}", e)),
                }
            },
            Err(e) => Err(format!("Failed to read Python file: {}", e)),
        }
    })
}

#[tauri::command]
fn get_python_info() -> Result<String, String> {
    Python::with_gil(|py| {
        let code = "import sys\nresult = sys.version";
        let locals = PyDict::new_bound(py);
        match py.run_bound(code, None, Some(&locals)) {
            Ok(_) => {
                match locals.get_item("result") {
                    Ok(Some(version)) => Ok(format!("Python version: {}", version)),
                    _ => Err("Could not get version info".to_string()),
                }
            },
            Err(e) => Err(format!("Failed to get Python info: {}", e)),
        }
    })
}

// =====================================================
// アプリケーション制御
// =====================================================

#[tauri::command]
fn exit_app() {
    println!("🔥 Exit app command called - immediate shutdown");
    std::process::exit(0);
}

// =====================================================
// クリップボード操作（クロスプラットフォーム対応）
// =====================================================

#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> {
    println!("📋 Writing to clipboard: {} characters", text.len());
    
    #[cfg(target_os = "macos")]
    {
        use std::process::{Command, Stdio};
        use std::io::Write;
        
        let mut child = Command::new("pbcopy")
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn pbcopy: {}", e))?;
        
        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to pbcopy: {}", e))?;
        }
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for pbcopy: {}", e))?;
        
        if status.success() {
            println!("✅ Clipboard write successful (macOS)");
            Ok(())
        } else {
            Err("Clipboard write failed (macOS)".to_string())
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Clipboard operation not implemented for this platform".to_string())
    }
}

#[tauri::command]
fn read_clipboard() -> Result<String, String> {
    println!("📋 Reading from clipboard");
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let output = Command::new("pbpaste")
            .output()
            .map_err(|e| format!("Failed to execute pbpaste: {}", e))?;
        
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            println!("✅ Clipboard read successful (macOS): {} characters", text.len());
            Ok(text)
        } else {
            Err("Clipboard read failed (macOS)".to_string())
        }
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Clipboard operation not implemented for this platform".to_string())
    }
}

// =====================================================
// ファイル操作（読み書きのみ、ダイアログはJavaScript側で処理）
// =====================================================

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    println!("📖 Reading file: {}", path);
    
    match std::fs::read_to_string(&path) {
        Ok(content) => {
            println!("✅ File read successfully: {} characters", content.len());
            Ok(content)
        },
        Err(e) => {
            let error_msg = format!("Failed to read file '{}': {}", path, e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    println!("💾 Writing file: {} ({} characters)", path, content.len());
    
    match std::fs::write(&path, &content) {
        Ok(_) => {
            println!("✅ File written successfully: {}", path);
            Ok(())
        },
        Err(e) => {
            let error_msg = format!("Failed to write file '{}': {}", path, e);
            println!("❌ {}", error_msg);
            Err(error_msg)
        }
    }
}

// =====================================================
// メイン関数とアプリケーション設定 - Tauri 2.5専用版
// =====================================================

fn main() {
    // PyO3の初期化
    pyo3::prepare_freethreaded_python();
    
    // コマンドライン引数のログ出力
    let args: Vec<String> = std::env::args().collect();
    println!("🚀 Sert Editor starting with args: {:?}", args);
    
    tauri::Builder::default()
        // プラグインの初期化
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        
        // Tauriコマンドの登録
        .invoke_handler(tauri::generate_handler![
            get_startup_file_path,
            validate_file_path,
            get_file_info,
            create_new_window_with_file,
            open_file_in_current_window,
            handle_file_drop_with_modification_check,
            test_python,
            execute_python,
            evaluate_python_expression,
            run_python_file,
            get_python_info,
            exit_app,
            write_clipboard,
            read_clipboard,
            read_file,
            write_file
        ])
        
        // Tauri 2.5対応のファイルドロップイベント設定
        .on_window_event(|window, event| {
            // エラー処理を含む安全なイベントハンドラー
            if let Err(e) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                if let WindowEvent::DragDrop(drag_event) = event {
                    if let tauri::DragDropEvent::Drop { paths, position: _ } = drag_event {
                        println!("📁 File drop event detected: {:?}", paths);
                        
                        // 最初のファイルのみ処理
                        if let Some(first_path) = paths.first() {
                            let file_path = first_path.to_string_lossy().to_string();
                            let window_label = window.label().to_string();
                            let app_handle = window.app_handle().clone();
                            
                            println!("📂 Processing dropped file: {} on window: {}", file_path, window_label);
                            
                            // ファイルパスの妥当性確認
                            if first_path.exists() && first_path.is_file() {
                                // 非同期処理でエラーハンドリング
                                tokio::spawn(async move {
                                    // 少し待機してからイベントを送信
                                    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
                                    
                                    println!("📡 Sending modification status request for: {}", file_path);
                                    
                                    // ウィンドウを取得してイベントを送信
                                    if let Some(target_window) = app_handle.get_webview_window(&window_label) {
                                        let payload = serde_json::json!({
                                            "filePath": file_path,
                                            "windowLabel": window_label
                                        });
                                        
                                        match target_window.emit("request-modification-status", &payload) {
                                            Ok(_) => {
                                                println!("✅ Modification status request sent successfully: {}", file_path);
                                            },
                                            Err(e) => {
                                                println!("❌ Failed to request modification status: {}", e);
                                                println!("🔄 Attempting fallback: creating new window");
                                                
                                                // フォールバック: 直接新しいウィンドウを作成
                                                match create_new_window_with_file(app_handle, file_path.clone()).await {
                                                    Ok(new_window_label) => {
                                                        println!("✅ Fallback new window created: {}", new_window_label);
                                                    },
                                                    Err(error) => {
                                                        println!("❌ Fallback new window creation failed: {}", error);
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        println!("❌ Target window not found: {}", window_label);
                                        
                                        // ウィンドウが見つからない場合は新しいウィンドウを作成
                                        match create_new_window_with_file(app_handle, file_path.clone()).await {
                                            Ok(new_window_label) => {
                                                println!("✅ New window created for orphaned drop: {}", new_window_label);
                                            },
                                            Err(error) => {
                                                println!("❌ Failed to create window for orphaned drop: {}", error);
                                            }
                                        }
                                    }
                                });
                            } else {
                                println!("❌ Invalid file dropped: {}", file_path);
                            }
                        }
                    }
                }
            })) {
                println!("❌ Panic in window event handler: {:?}", e);
            }
        })
        
        // アプリケーション初期化処理
        .setup(|_app| {
            println!("🚀 Sert Editor starting up...");
            
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
            if let Some(_window) = app.get_webview_window("main") {
                println!("✅ Main window found and configured");
                
                #[cfg(target_os = "macos")]
                {
                    println!("🍎 macOS detected - file association setup needed");
                    println!("📋 To enable Dock icon file drop:");
                    println!("   1. Build: cargo tauri build");
                    println!("   2. Install: target/release/bundle/macos/sert.app");
                    println!("   3. Test: Drag .txt files to Dock icon");
                }
            } else {
                println!("⚠️ Main window not found");
            }
            
=======
>>>>>>> parent of e00ea71 (Macのマルチディスプレイ間移動をサポート)
=======
>>>>>>> parent of e00ea71 (Macのマルチディスプレイ間移動をサポート)
=======
>>>>>>> parent of e00ea71 (Macのマルチディスプレイ間移動をサポート)
            // PyO3の初期化テスト
            println!("🐍 Testing PyO3 integration...");
            match test_python() {
                Ok(result) => println!("✅ PyO3 test successful: {}", result),
                Err(e) => println!("❌ PyO3 test failed: {}", e),
            }
            
            println!("📋 Clipboard operations enabled (macOS only)");
            println!("📁 File operations enabled");
            println!("🗂️ Drag and drop functionality enabled (window-to-window)");
            println!("🔗 File association support ready");
            println!("🎯 Sert Editor ready!");
            
            Ok(())
        })
        
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}