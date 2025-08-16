// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/*
 * =====================================================
 * Vinsert Editor - Rustバックエンド (Tauri 2.5対応)
 * Python拡張機能対応のシンプルなテキストエディタ
 * =====================================================
 */

use tauri::Manager;
use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::env;

static mut PYTHON_TYPE: PythonType = PythonType::Unknown;

#[derive(Debug, Clone, Copy, PartialEq)]
enum PythonType {
    Unknown,
    Embedded,    // python-build-standaloneによる組み込みPython
    System,      // システム環境のPython
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
        
        // 標準出力をキャプチャするための設定
        let sys = py.import_bound("sys").map_err(|e| format!("Failed to import sys: {}", e))?;
        let io_module = py.import_bound("io").map_err(|e| format!("Failed to import io: {}", e))?;
        let string_io = io_module.getattr("StringIO").map_err(|e| format!("Failed to get StringIO: {}", e))?;
        let output_buffer = string_io.call0().map_err(|e| format!("Failed to create StringIO: {}", e))?;
        
        // 標準出力を一時的にStringIOにリダイレクト
        let original_stdout = sys.getattr("stdout").map_err(|e| format!("Failed to get stdout: {}", e))?;
        sys.setattr("stdout", &output_buffer).map_err(|e| format!("Failed to redirect stdout: {}", e))?;
        
        let locals = PyDict::new_bound(py);
        let result = py.run_bound(&code, None, Some(&locals));
        
        // 標準出力を元に戻す
        sys.setattr("stdout", original_stdout).map_err(|e| format!("Failed to restore stdout: {}", e))?;
        
        // 出力を取得
        let output = output_buffer.call_method0("getvalue")
            .map_err(|e| format!("Failed to get output: {}", e))?
            .to_string();
        
        match result {
            Ok(_) => {
                // printされた内容を返す
                if !output.is_empty() {
                    Ok(output.trim().to_string())
                } else {
                    // 結果を取得する場合（例：最後の変数の値）
                    match locals.get_item("result") {
                        Ok(Some(val)) => Ok(format!("{}", val)),
                        _ => Ok("Code executed successfully".to_string()),
                    }
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
 * Python詳細情報を取得（組み込み判定機能強化版）
 */
#[tauri::command]
fn get_python_info() -> Result<String, String> {
    Python::with_gil(|py| {
        // 基本情報を取得
        let sys = py.import_bound("sys").map_err(|e| format!("sysモジュール取得失敗: {}", e))?;
        let version = sys.getattr("version").and_then(|v| v.extract::<String>()).unwrap_or_else(|_| "Unknown".to_string());
        let executable = sys.getattr("executable").and_then(|v| v.extract::<String>()).unwrap_or_else(|_| "Unknown".to_string());
        
        // 組み込みPython判定
        let is_embedded = detect_embedded_python(&executable);
        
        // 現在のPYTHON_TYPEも取得
        let current_python_type = unsafe { PYTHON_TYPE };
        let python_type_display = match current_python_type {
            PythonType::Embedded => "🔗 EMBEDDED (組み込みPython)",
            PythonType::System => "🖥️ SYSTEM (システムPython)",
            PythonType::Unknown => "❓ UNKNOWN (不明)"
        };
        
        let python_type = if is_embedded {
            "🔗 EMBEDDED (組み込みPython)"
        } else {
            "🖥️ SYSTEM (システムPython)"
        };
        
        // site-packagesのパス
        let site_packages = sys.getattr("path")
            .and_then(|path_list| path_list.extract::<Vec<String>>())
            .unwrap_or_else(|_| vec![]);
        
        let site_packages_info = site_packages.iter()
            .take(3) // 上位3件のみ表示
            .map(|p| format!("  - {}", p))
            .collect::<Vec<_>>()
            .join("\n");
        
        let result = format!(
            "🐍 Python環境情報 🐍\n\n\
            📊 起動時判定: {}\n\
            📊 現在の環境タイプ: {}\n\
            📋 バージョン: {}\n\
            📁 実行ファイル: {}\n\
            🎯 判定結果: {}\n\n\
            📦 Python Path (上位3件):\n{}\n\
            \n🔍 組み込み判定条件:\n\
            - パスに 'python-standalone' が含まれる: {}\n\
            - アプリディレクトリ内のPython: {}\n",
            python_type_display,
            python_type,
            version,
            executable,
            if is_embedded { "アプリケーション組み込み" } else { "システム環境" },
            if site_packages_info.is_empty() { "  (なし)".to_string() } else { site_packages_info },
            executable.contains("python-standalone"),
            {
                if let Ok(current_exe) = std::env::current_exe() {
                    if let Some(exe_dir) = current_exe.parent() {
                        let exe_dir_str = exe_dir.to_string_lossy();
                        executable.starts_with(exe_dir_str.as_ref())
                    } else { false }
                } else { false }
            }
        );
        
        Ok(result)
    })
}

/**
 * 開発者向け詳細Python環境診断（修正版・1つだけ）
 */
#[tauri::command]
fn debug_python_environment() -> Result<String, String> {
    Python::with_gil(|py| {
        let mut result = String::new();
        
        // 基本環境情報
        result.push_str("🔍 PYTHON環境詳細診断 (強化版)\n");
        result.push_str("=" .repeat(60).as_str());
        result.push_str("\n\n");
        
        // 現在のグローバル状態を表示
        let current_python_type = unsafe { PYTHON_TYPE };
        result.push_str(&format!("📊 起動時判定結果: {:?}\n", current_python_type));
        
        match current_python_type {
            PythonType::Embedded => {
                result.push_str("🟢 【組み込みPython環境】が検出されました\n");
                result.push_str("   ✓ アプリケーション内蔵のPython環境を使用\n");
                result.push_str("   ✓ ユーザーのPython環境に依存しない独立動作\n");
            },
            PythonType::System => {
                result.push_str("🔵 【ユーザー環境Python】が検出されました\n");
                result.push_str("   ✓ システムまたはユーザーインストールのPython環境を使用\n");
                result.push_str("   ✓ 拡張機能はユーザー環境のライブラリを利用可能\n");
            },
            PythonType::Unknown => {
                result.push_str("🔴 【不明・エラー】Python環境の判定に失敗\n");
            }
        }
        result.push_str("\n");
        
        // Python実行ファイル情報
        match py.import_bound("sys") {
            Ok(sys) => {
                let executable = sys.getattr("executable")
                    .and_then(|v| v.extract::<String>())
                    .unwrap_or_else(|_| "Unknown".to_string());
                    
                result.push_str(&format!("📁 Python実行ファイル: {}\n", executable));
                
                // 組み込み判定の詳細（現在時点での再評価）
                let is_embedded_now = detect_embedded_python(&executable);
                result.push_str(&format!("🎯 現在時点での組み込み判定: {}\n", is_embedded_now));
                
                // 判定理由の詳細
                result.push_str("🔍 判定根拠:\n");
                
                if executable.contains("python-standalone") {
                    result.push_str("   ✓ パスに 'python-standalone' が含まれる\n");
                }
                
                if let Ok(current_exe) = std::env::current_exe() {
                    if let Some(exe_dir) = current_exe.parent() {
                        let exe_dir_str = exe_dir.to_string_lossy();
                        if executable.starts_with(exe_dir_str.as_ref()) {
                            result.push_str("   ✓ アプリケーションディレクトリ内のPython\n");
                        }
                    }
                }
                
                // 現在のアプリケーション情報
                if let Ok(current_exe) = std::env::current_exe() {
                    result.push_str(&format!("🏠 アプリ実行ファイル: {}\n", current_exe.display()));
                    if let Some(exe_dir) = current_exe.parent() {
                        result.push_str(&format!("📂 アプリディレクトリ: {}\n", exe_dir.display()));
                    }
                }
                
                result.push_str("\n");
                
                // Python version詳細
                if let Ok(version) = sys.getattr("version").and_then(|v| v.extract::<String>()) {
                    result.push_str(&format!("🐍 Pythonバージョン: {}\n", version));
                }
                
                // Python path詳細
                if let Ok(path_list) = sys.getattr("path").and_then(|p| p.extract::<Vec<String>>()) {
                    result.push_str("📦 Python Path (上位5件):\n");
                    for (i, path) in path_list.iter().take(5).enumerate() {
                        result.push_str(&format!("   {}. {}\n", i + 1, path));
                    }
                    if path_list.len() > 5 {
                        result.push_str(&format!("   ... 他{}件\n", path_list.len() - 5));
                    }
                }
                
            },
            Err(e) => {
                result.push_str(&format!("❌ sys モジュール取得エラー: {}\n", e));
            }
        }
        
        // 環境変数チェック
        result.push_str("\n🌍 関連環境変数:\n");
        let env_vars = ["PYO3_PYTHON", "PYTHONHOME", "PYTHONPATH"];
        for var in &env_vars {
            match std::env::var(var) {
                Ok(value) => result.push_str(&format!("   {}: {}\n", var, value)),
                Err(_) => result.push_str(&format!("   {}: (未設定)\n", var)),
            }
        }
        
        // 最終結論
        result.push_str("\n🎯 最終結論:\n");
        let python_type = unsafe { PYTHON_TYPE };
        match python_type {
            PythonType::Embedded => {
                result.push_str("   🟢 【組み込みPython】を使用中\n");
                result.push_str("   → アプリケーション内蔵のPython環境\n");
                result.push_str("   → ユーザー環境に依存しない独立動作\n");
            },
            PythonType::System => {
                result.push_str("   🔵 【システムPython】を使用中\n");
                result.push_str("   → ユーザーがインストールしたPython環境\n");
                result.push_str("   → 拡張機能はユーザー環境のライブラリを利用可能\n");
            },
            PythonType::Unknown => {
                result.push_str("   🔴 【不明・エラー】\n");
                result.push_str("   → Python環境の判定に失敗\n");
            }
        }
        
        result.push_str("\n");
        result.push_str("=" .repeat(60).as_str());
        
        Ok(result)
    })
}

fn detect_embedded_python(executable: &str) -> bool {
    // 実行ファイルパスからの判定
    if executable.contains("python-standalone") {
        return true;
    }
    
    // アプリケーションバンドル内かチェック
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            let exe_dir_str = exe_dir.to_string_lossy();
            if executable.starts_with(exe_dir_str.as_ref()) {
                return true;
            }
        }
    }
    
    false
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
// 公式Tauriクリップボードプラグインを使用（修正版）
// =====================================================

/**
 * クリップボードにテキストを書き込む（公式プラグイン使用・修正版）
 */
#[tauri::command]
fn write_clipboard(app: tauri::AppHandle, text: String) -> Result<(), String> {
    println!("📋 Writing to clipboard using official plugin: {} characters", text.len());
    
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    match app.clipboard().write_text(text) {
        Ok(()) => {
            println!("✅ Clipboard write successful (official plugin)");
            Ok(())
        }
        Err(e) => {
            println!("❌ Clipboard write failed (official plugin): {}", e);
            Err(format!("Clipboard write failed: {}", e))
        }
    }
}

/**
 * クリップボードからテキストを読み込む（公式プラグイン使用・修正版）
 */
#[tauri::command]
fn read_clipboard(app: tauri::AppHandle) -> Result<String, String> {
    println!("📋 Reading from clipboard using official plugin");
    
    use tauri_plugin_clipboard_manager::ClipboardExt;
    
    match app.clipboard().read_text() {
        Ok(text) => {
            println!("✅ Clipboard read successful (official plugin): {} characters", text.len());
            Ok(text)
        }
        Err(e) => {
            println!("❌ Clipboard read failed (official plugin): {}", e);
            Err(format!("Clipboard read failed: {}", e))
        }
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

/**
 * フォルダを開く（クロスプラットフォーム対応）
 */
#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    println!("📁 Opening folder: {}", path);
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        let result = Command::new("explorer")
            .arg(&path)
            .spawn();
        
        match result {
            Ok(mut child) => {
                // プロセスが正常に起動したかチェック
                match child.try_wait() {
                    Ok(Some(status)) => {
                        // 即座に終了した場合はステータスをチェック
                        if status.success() {
                            println!("✅ Folder opened successfully (Windows)");
                            Ok(())
                        } else {
                            println!("⚠️ Explorer exited with non-zero status, but folder might have opened");
                            Ok(()) // Windows explorerは既に開いているフォルダでも非ゼロで終了することがある
                        }
                    },
                    Ok(None) => {
                        // プロセスがまだ実行中（正常）
                        println!("✅ Folder opened successfully (Windows)");
                        Ok(())
                    },
                    Err(e) => {
                        println!("⚠️ Could not check process status: {}, but explorer started", e);
                        Ok(()) // プロセスは起動したので成功とみなす
                    }
                }
            },
            Err(e) => {
                Err(format!("Failed to start explorer: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let status = Command::new("open")
            .arg(&path)
            .status()
            .map_err(|e| format!("Failed to execute open command: {}", e))?;
        
        if status.success() {
            println!("✅ Folder opened successfully (macOS)");
            Ok(())
        } else {
            Err("Failed to open folder (macOS)".to_string())
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let status = Command::new("xdg-open")
            .arg(&path)
            .status()
            .map_err(|e| format!("Failed to execute xdg-open command: {}", e))?;
        
        if status.success() {
            println!("✅ Folder opened successfully (Linux)");
            Ok(())
        } else {
            Err("Failed to open folder (Linux)".to_string())
        }
    }
    
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

// =====================================================
// メイン関数とアプリケーション設定
// =====================================================

fn initialize_python() -> PythonType {
    // PyO3 0.22.6の初期化
    // auto-initializeフィーチャーが有効な場合、初回のPython::with_gil()で自動初期化される
    
    // Python環境を詳細に確認
    let python_type = detect_python_environment();
    println!("🐍 Python初期化完了: {:?}", python_type);
    python_type
}

/**
 * Python環境の詳細を検出・確認する関数（緊急修正版）
 */
fn detect_python_environment() -> PythonType {
    println!("=== Python環境詳細分析（組み込みPython対応版） ===");
    
    // ビルド時の組み込みPythonフラグをチェック（ランタイムで取得）
    let is_embedded_build = std::env::var("VINSERT_EMBEDDED_PYTHON")
        .unwrap_or_else(|_| "0".to_string())
        .parse::<i32>()
        .unwrap_or(0) == 1;
    let embedded_python_path = std::env::var("VINSERT_PYTHON_PATH")
        .unwrap_or_else(|_| "".to_string());
    
    println!("🔍 ビルド時の組み込みPythonフラグ: {}", is_embedded_build);
    println!("🔍 組み込みPythonパス: {}", embedded_python_path);
    
    match Python::with_gil(|py| -> Result<PythonType, PyErr> {
        // 基本的なPython動作テスト
        let simple_test = py.eval_bound("2 + 2", None, None)?;
        println!("🐍 Python基本動作テスト: {}", simple_test);
        
        // Python実行ファイルパスを取得
        let sys = py.import_bound("sys")?;
        let executable = sys.getattr("executable")?.extract::<String>()?;
        println!("🐍 実行中のPython実行ファイル: {}", executable);
        
        // 組み込みPython判定の複数の方法
        let mut embedded_indicators = Vec::new();
        
        // 1. ビルド時フラグによる判定
        if is_embedded_build {
            embedded_indicators.push("ビルド時組み込みフラグ");
        }
        
        // 2. 実行ファイルパスによる判定
        if executable.contains("python-standalone") || (!embedded_python_path.is_empty() && executable.contains(&embedded_python_path)) {
            embedded_indicators.push("実行ファイルパスが組み込みPythonを示している");
        }
        
        // 3. アプリケーション内部パスかチェック
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(exe_dir) = current_exe.parent() {
                let exe_dir_str = exe_dir.to_string_lossy();
                if executable.starts_with(exe_dir_str.as_ref()) {
                    embedded_indicators.push("Pythonがアプリケーションディレクトリ内にある");
                }
            }
        }
        
        // 4. PyOxidizer/組み込み環境の特徴を検出
        if let Ok(modules) = sys.getattr("modules") {
            if modules.contains("oxidized_importer").unwrap_or(false) {
                embedded_indicators.push("PyOxidizer組み込み環境");
            }
        }
        
        // 5. frozen属性チェック
        if let Ok(frozen) = sys.getattr("frozen") {
            if !frozen.is_none() {
                embedded_indicators.push("frozen属性が設定されている");
            }
        }
        
        // 6. site-packagesの場所をチェック
        if let Ok(path_list) = sys.getattr("path") {
            if let Ok(paths) = path_list.extract::<Vec<String>>() {
                for path in &paths {
                    if path.contains("python-standalone") {
                        embedded_indicators.push("site-packagesが組み込みPython内にある");
                        break;
                    }
                }
            }
        }
        
        // 判定結果
        if !embedded_indicators.is_empty() {
            println!("✅ 組み込みPython検出指標:");
            for indicator in &embedded_indicators {
                println!("   - {}", indicator);
            }
            Ok(PythonType::Embedded)
        } else {
            println!("📍 システムPython検出 (組み込み指標なし)");
            Ok(PythonType::System)
        }
    }) {
        Ok(python_type) => {
            println!("🎯 最終判定: {:?}", python_type);
            python_type
        },
        Err(e) => {
            println!("❌ Python環境検出エラー: {}", e);
            PythonType::Unknown
        }
    }
}

fn main() {
    // Pythonの初期化
    let python_type = initialize_python();
    unsafe {
        PYTHON_TYPE = python_type;
    }
    
    tauri::Builder::default()
        // プラグインの初期化（公式clipboardプラグインを追加）
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init()) // 公式クリップボードプラグインを追加
        
        // Tauriコマンドの登録
        .invoke_handler(tauri::generate_handler![
            // Python関連
            test_python,
            execute_python,
            evaluate_python_expression,
            run_python_file,
            get_python_info,
            debug_python_environment,
            
            // アプリケーション制御
            exit_app,
            
            // クリップボード操作（公式プラグイン使用）
            write_clipboard,
            read_clipboard,
            
            // ファイル操作
            read_file,
            write_file,
            
            // フォルダを開く（カスタムコマンド）
            open_folder
        ])
        
        // メニューの設定（Tauri 2.5対応）
        .menu(move |app| {
            create_native_menu(app)
        })
        
        // メニューイベントハンドラー（Tauri 2.5対応）
        .on_menu_event(move |app, event| {
            handle_menu_event(&app, event);
        })
        
        // アプリケーション初期化処理
        .setup(|app| {
            println!("🚀 Sert Editor starting up...");
            
            // ウィンドウの取得と設定
            let windows = app.webview_windows();
            if let Some(_window) = windows.get("main") {
                println!("✅ Main window found and configured for multi-display support");
                
                // ウィンドウの基本設定はtauri.conf.jsonで設定済みのため、
                // ここでは追加の設定は不要
                
                #[cfg(target_os = "macos")]
                {
                    println!("🖥️ macOS native menu enabled");
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
            
            // ===== 起動時にPython環境を明確に表示 =====
            println!("");
            println!("=== PYTHON環境検出結果 ===");
            
            let python_type = unsafe { PYTHON_TYPE };
            match python_type {
                PythonType::Embedded => {
                    println!("🟢 使用中のPython: 【組み込みPython】");
                    println!("   → アプリケーション内蔵のPythonインタープリターを使用");
                    println!("   → ユーザーのPython環境に依存せず、独立して動作");
                    println!("   → PyOxidizerまたは類似の組み込み技術を検出");
                },
                PythonType::System => {
                    println!("🔵 使用中のPython: 【ユーザー環境Python】");
                    println!("   → ユーザーがインストールしたPython環境を使用");
                    println!("   → システムまたはHomebrewなどからPythonを読み込み");
                    println!("   → 拡張機能はユーザー環境のPythonライブラリを利用可能");
                },
                PythonType::Unknown => {
                    println!("🔴 使用中のPython: 【不明・エラー】");
                    println!("   → Python環境の検出に失敗しました");
                    println!("   → 拡張機能が正常に動作しない可能性があります");
                }
            }
            println!("========================");
            println!("");
            
            // Python環境情報の詳細表示（詳細版）
            println!("=== Python Environment Details ===");
            match get_python_info() {
                Ok(info) => {
                    println!("✅ Python環境詳細情報:\n{}", info);
                    
                    // 追加のテスト実行
                    println!("🧪 Running additional Python verification tests...");
                    match test_python() {
                        Ok(test_result) => println!("✅ Python test passed: {}", test_result),
                        Err(test_error) => println!("❌ Python test failed: {}", test_error),
                    }
                },
                Err(e) => {
                    println!("❌ Python環境情報取得エラー: {}", e);
                    println!("🔧 Troubleshooting: Check if Python is properly installed");
                }
            }
            println!("=== End Python Details ===");
            
            println!("📋 Clipboard operations enabled (official plugin)");
            println!("📁 File operations enabled (JavaScript-based dialogs)");
            println!("🍎 Native menu system enabled");
            println!("🎯 Sert Editor ready!");
            
            Ok(())
        })
        
        // アプリケーション実行
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/**
 * ネイティブメニューを作成（Tauri 2.5対応）
 */
/**
 * ネイティブメニューを作成（Tauri 2.5対応）
 */
fn create_native_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    use tauri::menu::*;
    
    // アプリメニュー（macOS固有）
    #[cfg(target_os = "macos")]
    let app_menu = {
        let about_item = MenuItem::with_id(app, "about", "Vinsertについて", true, None::<&str>)?;
        let separator = PredefinedMenuItem::separator(app)?;
        let hide_item = PredefinedMenuItem::hide(app, Some("Vinsertを隠す"))?;
        let hide_others_item = PredefinedMenuItem::hide_others(app, Some("他を隠す"))?;
        let show_all_item = PredefinedMenuItem::show_all(app, Some("すべてを表示"))?;
        let quit_item = PredefinedMenuItem::quit(app, Some("Vinsertを終了"))?;
        
        Submenu::with_items(
            app,
            "Vinsert",
            true,
            &[
                &about_item,
                &separator,
                &hide_item,
                &hide_others_item,
                &show_all_item,
                &separator,
                &quit_item,
            ],
        )?
    };
    
     // Windows固有のメニュー設定
    #[cfg(target_os = "windows")]
    let app_menu = {
        let about_item = MenuItem::with_id(app, "about", "Vinsertについて", true, None::<&str>)?;
        let separator = PredefinedMenuItem::separator(app)?;
        let exit_item = MenuItem::with_id(app, "exit_app", "終了", true, Some("Alt+F4"))?;
        
        Submenu::with_items(
            app,
            "アプリケーション",
            true,
            &[
                &about_item,
                &separator,
                &exit_item,
            ],
        )?
    };
    
    // ファイルメニュー
    let new_item = MenuItem::with_id(app, "new_file", "新規作成", true, Some("CmdOrCtrl+N"))?;
    let open_item = MenuItem::with_id(app, "open_file", "開く", true, Some("CmdOrCtrl+O"))?;
    let save_item = MenuItem::with_id(app, "save_file", "上書き保存", true, Some("CmdOrCtrl+S"))?;
    let save_as_item = MenuItem::with_id(app, "save_as_file", "名前をつけて保存", true, Some("CmdOrCtrl+Shift+S"))?;
    
    let file_separator = PredefinedMenuItem::separator(app)?;
    
    // macOSでは終了メニューをアプリメニューに配置するため、ファイルメニューには含めない
    #[cfg(target_os = "macos")]
    let file_menu = Submenu::with_items(
        app,
        "ファイル",
        true,
        &[
            &new_item,
            &open_item,
            &file_separator,
            &save_item,
            &save_as_item,
        ],
    )?;
    
    #[cfg(target_os = "windows")]
    let file_menu = {
        Submenu::with_items(
            app,
            "ファイル",
            true,
            &[
                &new_item,
                &open_item,
                &file_separator,
                &save_item,
                &save_as_item,
            ],
        )?
    };
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let file_menu = {
        let exit_item = MenuItem::with_id(app, "exit_app", "終了", true, Some("Ctrl+Q"))?;
        Submenu::with_items(
            app,
            "ファイル",
            true,
            &[
                &new_item,
                &open_item,
                &file_separator,
                &save_item,
                &save_as_item,
                &file_separator,
                &exit_item,
            ],
        )?
    };
    
    // 編集メニュー
    let undo_item = MenuItem::with_id(app, "undo", "元に戻す", true, Some("CmdOrCtrl+Z"))?;
    let redo_item = MenuItem::with_id(app, "redo", "やりなおし", true, Some("CmdOrCtrl+Shift+Z"))?;
    let edit_separator1 = PredefinedMenuItem::separator(app)?;
    let cut_item = PredefinedMenuItem::cut(app, Some("切り取り"))?;
    let copy_item = PredefinedMenuItem::copy(app, Some("コピー"))?;
    let paste_item = PredefinedMenuItem::paste(app, Some("貼り付け"))?;
    let edit_separator2 = PredefinedMenuItem::separator(app)?;
    let select_all_item = PredefinedMenuItem::select_all(app, Some("すべて選択"))?;
    
    let edit_menu = Submenu::with_items(
        app,
        "編集",
        true,
        &[
            &undo_item,
            &redo_item,
            &edit_separator1,
            &cut_item,
            &copy_item,
            &paste_item,
            &edit_separator2,
            &select_all_item,
        ],
    )?;
    
    // 表示メニュー
    let font_settings_item = MenuItem::with_id(app, "font_settings", "フォント設定", true, None::<&str>)?;
    let font_size_input_item = MenuItem::with_id(app, "font_size_input", "フォントサイズ指定", true, None::<&str>)?;
    let view_separator1 = PredefinedMenuItem::separator(app)?;
    let increase_font_item = MenuItem::with_id(app, "increase_font", "フォントサイズを大きく", true, Some("CmdOrCtrl+Plus"))?;
    let decrease_font_item = MenuItem::with_id(app, "decrease_font", "フォントサイズを小さく", true, Some("CmdOrCtrl+Minus"))?;
    let view_separator2 = PredefinedMenuItem::separator(app)?;
    let line_highlight_item = MenuItem::with_id(app, "toggle_line_highlight", "行ハイライト", true, None::<&str>)?;
    let typewriter_mode_item = MenuItem::with_id(app, "toggle_typewriter_mode", "タイプライターモード", true, None::<&str>)?;
    let view_separator3 = PredefinedMenuItem::separator(app)?;
    let whitespace_vis_item = MenuItem::with_id(app, "toggle_whitespace_visualization", "空白文字の可視化", true, None::<&str>)?;
    let whitespace_settings_item = MenuItem::with_id(app, "whitespace_settings", "空白文字の設定", true, None::<&str>)?;
    
    let view_menu = Submenu::with_items(
        app,
        "表示",
        true,
        &[
            &font_settings_item,
            &font_size_input_item,
            &view_separator1,
            &increase_font_item,
            &decrease_font_item,
            &view_separator2,
            &line_highlight_item,
            &typewriter_mode_item,
            &view_separator3,
            &whitespace_vis_item,
            &whitespace_settings_item,
        ],
    )?;
    
    // 検索メニュー
    let find_item = MenuItem::with_id(app, "show_search", "検索", true, Some("CmdOrCtrl+F"))?;
    let replace_item = MenuItem::with_id(app, "show_replace", "置換", true, Some("CmdOrCtrl+H"))?;
    
    let search_menu = Submenu::with_items(
        app,
        "検索",
        true,
        &[
            &find_item,
            &replace_item,
        ],
    )?;
    
    // 機能拡張メニュー
    let extension_settings_item = MenuItem::with_id(app, "extension_settings", "拡張機能設定", true, None::<&str>)?;
    let extension_separator = PredefinedMenuItem::separator(app)?;
    let language_settings_item = MenuItem::with_id(app, "language_settings", "言語設定", true, None::<&str>)?;
    let theme_item = MenuItem::with_id(app, "show_theme", "テーマ", true, None::<&str>)?;
    let extension_separator2 = PredefinedMenuItem::separator(app)?;
    let open_app_folder_item = MenuItem::with_id(app, "open_app_folder", "アプリフォルダを開く", true, None::<&str>)?;
    
    let extensions_menu = Submenu::with_items(
        app,
        "機能拡張",
        true,
        &[
            &extension_settings_item,
            &extension_separator,
            &language_settings_item,
            &theme_item,
            &extension_separator2,
            &open_app_folder_item,
        ],
    )?;
    
    // ウィンドウメニュー（macOS固有）
    #[cfg(target_os = "macos")]
    let window_menu = {
        let minimize_item = PredefinedMenuItem::minimize(app, Some("しまう"))?;
        let zoom_item = PredefinedMenuItem::maximize(app, Some("拡大/縮小"))?;
        
        Submenu::with_items(
            app,
            "ウィンドウ",
            true,
            &[
                &minimize_item,
                &zoom_item,
            ],
        )?
    };
    
    // メニューバーを構築
    #[cfg(target_os = "macos")]
    let menu = Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &search_menu,
            &extensions_menu,
            &window_menu,
        ],
    )?;
    
    // メニューバーを構築
    #[cfg(target_os = "macos")]
    let menu = Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &search_menu,
            &extensions_menu,
            &window_menu,
        ],
    )?;
    
    #[cfg(target_os = "windows")]
    let menu = Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &search_menu,
            &extensions_menu,
        ],
    )?;
    
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let menu = Menu::with_items(
        app,
        &[
            &file_menu,
            &edit_menu,
            &view_menu,
            &search_menu,
            &extensions_menu,
        ],
    )?;
    
    Ok(menu)
}

/**
 * メニューイベントを処理（Tauri 2.5対応）
 */
fn handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    println!("🍎 Native menu event: {:?}", event.id());
    
    // WebViewを取得
    if let Some(webview) = app.webview_windows().get("main") {
        let script = match event.id().0.as_str() {
            // ファイルメニュー
            "new_file" => "try { if (window.newFile) window.newFile(); } catch(e) { console.error('newFile error:', e); }",
            "open_file" => "try { if (window.openFile) window.openFile(); } catch(e) { console.error('openFile error:', e); }",
            "save_file" => "try { if (window.saveFile) window.saveFile(); } catch(e) { console.error('saveFile error:', e); }",
            "save_as_file" => "try { if (window.saveAsFile) window.saveAsFile(); } catch(e) { console.error('saveAsFile error:', e); }",
            "exit_app" => "try { if (window.exitApp) window.exitApp(); } catch(e) { console.error('exitApp error:', e); }",
            
            // 編集メニュー
            "undo" => "try { if (window.undo) window.undo(); } catch(e) { console.error('undo error:', e); }",
            "redo" => "try { if (window.redo) window.redo(); } catch(e) { console.error('redo error:', e); }",
            
            // 表示メニュー
            "font_settings" => "try { if (window.showFontSettingsDialog) window.showFontSettingsDialog(); } catch(e) { console.error('fontSettings error:', e); }",
            "font_size_input" => "try { if (window.showFontSizeInputDialog) window.showFontSizeInputDialog(); } catch(e) { console.error('fontSizeInput error:', e); }",
            "increase_font" => "try { if (window.increaseFontSize) window.increaseFontSize(); } catch(e) { console.error('increaseFontSize error:', e); }",
            "decrease_font" => "try { if (window.decreaseFontSize) window.decreaseFontSize(); } catch(e) { console.error('decreaseFontSize error:', e); }",
            "toggle_line_highlight" => "try { if (window.toggleLineHighlight) window.toggleLineHighlight(); } catch(e) { console.error('toggleLineHighlight error:', e); }",
            "toggle_typewriter_mode" => "try { if (window.toggleTypewriterMode) window.toggleTypewriterMode(); } catch(e) { console.error('toggleTypewriterMode error:', e); }",
            "toggle_whitespace_visualization" => "try { if (window.toggleWhitespaceVisualization) window.toggleWhitespaceVisualization(); } catch(e) { console.error('toggleWhitespaceVisualization error:', e); }",
            "whitespace_settings" => "try { if (window.showWhitespaceVisualizationDialog) window.showWhitespaceVisualizationDialog(); } catch(e) { console.error('whitespaceSettings error:', e); }",
            
            // 検索メニュー
            "show_search" => "try { if (window.showSearchDialog) window.showSearchDialog(); } catch(e) { console.error('showSearchDialog error:', e); }",
            "show_replace" => "try { if (window.showReplaceDialog) window.showReplaceDialog(); } catch(e) { console.error('showReplaceDialog error:', e); }",
            
            // 機能拡張メニュー
            "extension_settings" => "try { if (window.showExtensionSettingsDialog) window.showExtensionSettingsDialog(); } catch(e) { console.error('extensionSettings error:', e); }",
            "language_settings" => "try { if (window.showLanguageSettingsDialog) window.showLanguageSettingsDialog(); } catch(e) { console.error('languageSettings error:', e); }",
            "show_theme" => "try { if (window.showThemeDialog) window.showThemeDialog(); } catch(e) { console.error('showTheme error:', e); }",
            "open_app_folder" => "try { if (window.openAppFolder) window.openAppFolder(); } catch(e) { console.error('openAppFolder error:', e); }",
            
            // アバウトメニュー
            "about" => "try { if (window.showAboutDialog) window.showAboutDialog(); } catch(e) { console.error('showAboutDialog error:', e); }",
            
            _ => {
                println!("⚠️ Unhandled menu event: {:?}", event.id());
                return;
            }
        };
        
        // JavaScriptを実行（エラーハンドリング付き）
        if let Err(e) = webview.eval(script) {
            println!("❌ Failed to execute menu script: {}", e);
            
            // フォールバック: より直接的な方法で実行を試行
            let fallback_script = format!(
                "setTimeout(() => {{ try {{ {} }} catch(e) {{ console.error('Fallback execution error:', e); }} }}, 100);",
                script
            );
            
            if let Err(e2) = webview.eval(&fallback_script) {
                println!("❌ Fallback execution also failed: {}", e2);
            }
        } else {
            println!("✅ Menu script executed: {:?}", event.id());
        }
    } else {
        println!("❌ Failed to get main webview for menu event");
    }
}