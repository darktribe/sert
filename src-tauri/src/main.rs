// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Sert Editor - Rustバックエンド（Tauri 2.5対応版）
 * Python拡張機能対応のシンプルなテキストエディタ
 * ドラッグアンドドロップ・ファイル関連付け対応（修正版）
 * =====================================================
 */

use pyo3::prelude::*;
use pyo3::types::PyDict;
use tauri::{Manager, Emitter, AppHandle, WebviewWindow};
use std::path::Path;

// =====================================================
// アプリケーション初期化とファイル関連付け
// =====================================================

/**
 * 起動時のファイルパスを取得するコマンド
 * コマンドライン引数から渡されたファイルパスを返す
 */
#[tauri::command]
fn get_startup_file_path() -> Result<Option<String>, String> {
    let args: Vec<String> = std::env::args().collect();
    
    // 最初の引数（実行ファイルパス）を除いて、ファイルパスがあるかチェック
    if args.len() > 1 {
        let file_path = &args[1];
        
        // ファイルが存在するかチェック
        if std::path::Path::new(file_path).exists() {
            println!("📂 Startup file detected: {}", file_path);
            return Ok(Some(file_path.clone()));
        } else {
            println!("⚠️ Startup file does not exist: {}", file_path);
        }
    }
    
    Ok(None)
}

/**
 * ファイルパスが有効かチェックするコマンド
 */
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

/**
 * ファイルの基本情報を取得するコマンド
 */
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

/**
 * 現在のウィンドウでファイルを開く（Tauri 2.5対応版）
 */
#[tauri::command]
async fn open_file_in_current_window(window: WebviewWindow, file_path: String) -> Result<(), String> {
    println!("📂 Opening file in current window: {}", file_path);
    
    // ファイルパスの妥当性チェック
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Invalid file path: {}", file_path));
    }
    
    // 現在のウィンドウにファイルを開くイベントを送信
    if let Err(e) = window.emit("open-file-in-current", &file_path) {
        println!("❌ Failed to emit open-file-in-current event: {}", e);
        return Err(format!("Failed to send file open event: {}", e));
    }
    
    println!("✅ File open event sent to current window: {}", file_path);
    Ok(())
}

// =====================================================
// Python統合機能（PyO3）
// =====================================================

/**
 * PyO3の基本テスト関数
 * Python環境が正常に動作するかテストする
 */
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

/**
 * 任意のPythonコードを実行
 * 機能拡張で使用される予定
 */
#[tauri::command]
fn execute_python(code: String) -> Result<String, String> {
    Python::with_gil(|py| {
        let locals = PyDict::new_bound(py);
        match py.run_bound(&code, None, Some(&locals)) {
            Ok(_) => {
                // 結果を取得する場合（例：最後の変数の値）
                match locals.get_item("result") {
                    Ok(Some(val)) => Ok(format!("{}", val)),
                    _ => Ok("Code executed successfully".to_string()),
                }
            },
            Err(e) => Err(format!("Python execution error: {}", e)),
        }
    })
}

/**
 * Python式を評価する関数
 * 機能拡張で使用される予定
 */
#[tauri::command]
fn evaluate_python_expression(expression: String) -> Result<String, String> {
    Python::with_gil(|py| {
        match py.eval_bound(&expression, None, None) {
            Ok(val) => Ok(format!("{}", val)),
            Err(e) => Err(format!("Python evaluation error: {}", e)),
        }
    })
}

/**
 * Pythonファイルを実行する関数
 * 機能拡張読み込みで使用される予定
 */
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

/**
 * Pythonのバージョン情報を取得
 * デバッグ・環境確認用
 */
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
// ファイルドロップ処理 - Tauri 2.5対応（修正版）
// =====================================================

/**
 * 新しいウィンドウを作成してファイルを開く - Tauri 2.5対応版
 */
#[tauri::command]
fn create_new_window_with_file(app_handle: AppHandle, file_path: String) -> Result<String, String> {
    println!("📂 Creating new window for file: {}", file_path);
    
    // ファイルパスの妥当性チェック
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Invalid file path: {}", file_path));
    }
    
    // 一意のウィンドウIDを生成
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    
    let window_label = format!("editor_{}", timestamp);
    
    // ファイル名を取得してタイトルに使用
    let file_name = path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown File");
    let window_title = format!("Sert - {}", file_name);
    
    // Tauri 2.5対応のウィンドウ作成
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
            
            // 新しいウィンドウにファイルパスを送信（遅延実行で確実に送信）
            let file_path_clone = file_path.clone();
            let window_clone = window.clone();
            
            // ウィンドウが完全に読み込まれるまで少し待機
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(1500)); // 1.5秒に増加
                
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

/**
 * 変更状態をチェックして適切な動作を決定するコマンド
 */
#[tauri::command]
async fn handle_file_drop_with_modification_check(
    window: WebviewWindow, 
    app_handle: AppHandle, 
    file_path: String, 
    is_modified: bool
) -> Result<String, String> {
    println!("📁 Handling file drop with modification check:");
    println!("  File: {}", file_path);
    println!("  Is Modified: {}", is_modified);
    
    // ファイルパスの妥当性チェック
    let path = Path::new(&file_path);
    if !path.exists() || !path.is_file() {
        return Err(format!("Invalid file path: {}", file_path));
    }
    
    if is_modified {
        // 変更がある場合：新しいウィンドウを作成
        println!("📂 File is modified, creating new window");
        match create_new_window_with_file(app_handle, file_path) {
            Ok(window_label) => Ok(format!("new_window:{}", window_label)),
            Err(e) => Err(e)
        }
    } else {
        // 変更がない場合：現在のウィンドウでファイルを開く
        println!("📂 No modifications, opening in current window");
        match open_file_in_current_window(window, file_path.clone()).await {
            Ok(_) => Ok(format!("current_window:{}", file_path)),
            Err(e) => Err(e)
        }
    }
}

// =====================================================
// アプリケーション制御
// =====================================================

/**
 * アプリケーション終了コマンド
 * 即座に強制終了する
 */
#[tauri::command]
fn exit_app() {
    println!("🔥 Exit app command called - immediate shutdown");
    std::process::exit(0);
}

// =====================================================
// クリップボード操作（クロスプラットフォーム対応）
// =====================================================

/**
 * クリップボードにテキストを書き込む
 * Windows/macOS/Linux対応
 */
#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> {
    println!("📋 Writing to clipboard: {} characters", text.len());
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let mut child = Command::new("cmd")
            .args(["/C", "echo", &text, "|", "clip"])
            .spawn()
            .map_err(|e| format!("Failed to spawn clipboard command: {}", e))?;
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for clipboard command: {}", e))?;
        
        if status.success() {
            println!("✅ Clipboard write successful (Windows)");
            Ok(())
        } else {
            Err("Clipboard write failed (Windows)".to_string())
        }
    }
    
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
    
    #[cfg(target_os = "linux")]
    {
        use std::process::{Command, Stdio};
        use std::io::Write;
        
        // xclipを試行
        let mut child = Command::new("xclip")
            .args(["-selection", "clipboard"])
            .stdin(Stdio::piped())
            .spawn();
        
        if let Ok(mut child_proc) = child {
            if let Some(stdin) = child_proc.stdin.as_mut() {
                if stdin.write_all(text.as_bytes()).is_ok() {
                    if let Ok(status) = child_proc.wait() {
                        if status.success() {
                            println!("✅ Clipboard write successful (Linux/xclip)");
                            return Ok(());
                        }
                    }
                }
            }
        }
        
        // xclipが失敗した場合、xselを試行
        let mut child = Command::new("xsel")
            .args(["-b", "-i"])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn xsel: {}", e))?;
        
        if let Some(stdin) = child.stdin.as_mut() {
            stdin.write_all(text.as_bytes())
                .map_err(|e| format!("Failed to write to xsel: {}", e))?;
        }
        
        let status = child.wait()
            .map_err(|e| format!("Failed to wait for xsel: {}", e))?;
        
        if status.success() {
            println!("✅ Clipboard write successful (Linux/xsel)");
            Ok(())
        } else {
            Err("Clipboard write failed (Linux)".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Clipboard operation not supported on this platform".to_string())
    }
}

/**
 * クリップボードからテキストを読み込む
 * Windows/macOS/Linux対応
 */
#[tauri::command]
fn read_clipboard() -> Result<String, String> {
    println!("📋 Reading from clipboard");
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let output = Command::new("powershell")
            .args(["-Command", "Get-Clipboard"])
            .output()
            .map_err(|e| format!("Failed to execute clipboard read command: {}", e))?;
        
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
            println!("✅ Clipboard read successful (Windows): {} characters", text.len());
            Ok(text)
        } else {
            Err("Clipboard read failed (Windows)".to_string())
        }
    }
    
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
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        
        // xclipを試行
        let output = Command::new("xclip")
            .args(["-selection", "clipboard", "-o"])
            .output();
        
        if let Ok(output) = output {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout).to_string();
                println!("✅ Clipboard read successful (Linux/xclip): {} characters", text.len());
                return Ok(text);
            }
        }
        
        // xclipが失敗した場合、xselを試行
        let output = Command::new("xsel")
            .args(["-b", "-o"])
            .output()
            .map_err(|e| format!("Failed to execute xsel: {}", e))?;
        
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout).to_string();
            println!("✅ Clipboard read successful (Linux/xsel): {} characters", text.len());
            Ok(text)
        } else {
            Err("Clipboard read failed (Linux)".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Clipboard operation not supported on this platform".to_string())
    }
}

// =====================================================
// ファイル操作（読み書きのみ、ダイアログはJavaScript側で処理）
// =====================================================

/**
 * ファイルを読み込む
 */
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

/**
 * ファイルに書き込む
 */
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
// メイン関数とアプリケーション設定 - Tauri 2.5対応（修正版）
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
            // ファイル関連付け・ドロップ機能
            get_startup_file_path,
            validate_file_path,
            get_file_info,
            create_new_window_with_file,
            open_file_in_current_window,
            handle_file_drop_with_modification_check,
            
            // Python関連
            test_python,
            execute_python,
            evaluate_python_expression,
            run_python_file,
            get_python_info,
            
            // アプリケーション制御
            exit_app,
            
            // クリップボード操作
            write_clipboard,
            read_clipboard,
            
            // ファイル操作
            read_file,
            write_file
        ])
        
        // Tauri 2.5対応のファイルドロップイベント設定（修正版）
        .on_window_event(|window, event| {
            match event {
                // Tauri 2.5の正しいAPIを使用
                tauri::WindowEvent::DragDrop(drag_event) => {
                    match drag_event {
                        tauri::DragDropEvent::Drop { paths, position: _ } => {
                            println!("📁 File drop event detected: {:?}", paths);
                            
                            // 最初のファイルのみ処理
                            if let Some(first_path) = paths.first() {
                                let file_path = first_path.to_string_lossy().to_string();
                                println!("📂 Processing dropped file: {}", file_path);
                                
                                // ファイルパスの妥当性確認
                                if first_path.exists() && first_path.is_file() {
                                    let window_clone = window.clone();
                                    let app_handle = window.app_handle().clone();
                                    let file_path_clone = file_path.clone();
                                    
                                    // JavaScriptに変更状態確認を依頼
                                    tokio::spawn(async move {
                                        // ウィンドウが完全に読み込まれるまで少し待機
                                        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                                        
                                        // フロントエンドに変更状態チェックを依頼
                                        match window_clone.emit("request-modification-status", &file_path_clone) {
                                            Ok(_) => {
                                                println!("✅ Modification status request sent: {}", file_path_clone);
                                            },
                                            Err(e) => {
                                                println!("❌ Failed to request modification status: {}", e);
                                                
                                                // フォールバック: 新しいウィンドウを作成
                                                let timestamp = std::time::SystemTime::now()
                                                    .duration_since(std::time::UNIX_EPOCH)
                                                    .unwrap_or_default()
                                                    .as_millis();
                                                
                                                let window_label = format!("editor_{}", timestamp);
                                                
                                                match tauri::WebviewWindowBuilder::new(
                                                    &app_handle,
                                                    window_label.clone(),
                                                    tauri::WebviewUrl::App("index.html".into())
                                                )
                                                .title(format!("Sert - {}", std::path::Path::new(&file_path_clone)
                                                    .file_name()
                                                    .and_then(|name| name.to_str())
                                                    .unwrap_or("Unknown File")))
                                                .inner_size(1200.0, 800.0)
                                                .center()
                                                .resizable(true)
                                                .build() {
                                                    Ok(new_window) => {
                                                        println!("✅ Fallback new window created: {}", window_label);
                                                        
                                                        // 新しいウィンドウにファイルを送信
                                                        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                                                        
                                                        if let Err(e) = new_window.emit("open-file-on-start", &file_path_clone) {
                                                            println!("❌ Failed to emit open-file-on-start to fallback window: {}", e);
                                                        } else {
                                                            println!("✅ File sent to fallback window: {}", file_path_clone);
                                                        }
                                                    },
                                                    Err(e) => {
                                                        println!("❌ Failed to create fallback window: {}", e);
                                                    }
                                                }
                                            }
                                        }
                                    });
                                    
                                } else {
                                    println!("❌ Invalid file dropped: {}", file_path);
                                }
                            }
                        },
                        _ => {
                            // その他のドラッグイベント（Enter, Over, Leave）は無視
                        }
                    }
                },
                _ => {}
            }
        })
        
        // アプリケーション初期化処理
        .setup(|app| {
            println!("🚀 Sert Editor starting up...");
            
            // ウィンドウの取得と設定
            if let Some(_window) = app.get_webview_window("main") {
                println!("✅ Main window found and configured for multi-display support");
                
                #[cfg(target_os = "macos")]
                {
                    println!("🖥️ macOS multi-display support enabled via configuration");
                    println!("🍎 macOS Dock icon file drop will be handled via system file association");
                }
                
                #[cfg(not(target_os = "macos"))]
                {
                    println!("🖥️ Multi-display support enabled via configuration");
                }
            } else {
                println!("⚠️ Main window not found, using default configuration");
            }
            
            // PyO3の初期化テスト
            println!("🐍 Testing PyO3 integration...");
            match test_python() {
                Ok(result) => println!("✅ PyO3 test successful: {}", result),
                Err(e) => println!("❌ PyO3 test failed: {}", e),
            }
            
            // Python環境情報の表示
            match get_python_info() {
                Ok(info) => println!("✅ {}", info),
                Err(e) => println!("❌ Python info error: {}", e),
            }
            
            println!("📋 Clipboard operations enabled");
            println!("📁 File operations enabled (JavaScript-based dialogs)");
            println!("🗂️ Drag and drop functionality enabled (smart current/new window detection)");
            println!("🔗 File association support enabled");
            println!("🎯 Sert Editor ready!");
            
            Ok(())
        })
        
        // アプリケーション実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}