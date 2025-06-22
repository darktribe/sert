// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pyo3::prelude::*;
use pyo3::types::PyDict;

// PyO3の基本テスト関数
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

// Python実行関数（任意のPythonコードを実行）
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

// Python式を評価する関数
#[tauri::command]
fn evaluate_python_expression(expression: String) -> Result<String, String> {
    Python::with_gil(|py| {
        match py.eval_bound(&expression, None, None) {
            Ok(val) => Ok(format!("{}", val)),
            Err(e) => Err(format!("Python evaluation error: {}", e)),
        }
    })
}

// Pythonでファイルを実行する関数
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

// アプリ終了コマンド
#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

// ファイル読み書き用のヘルパー関数
#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file: {}", e)),
    }
}

#[tauri::command]
async fn write_file_content(path: String, content: String) -> Result<(), String> {
    match std::fs::write(&path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to write file: {}", e)),
    }
}

// Pythonのバージョン情報を取得
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

fn main() {
    // PyO3の初期化
    pyo3::prepare_freethreaded_python();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            test_python,
            execute_python,
            evaluate_python_expression,
            run_python_file,
            get_python_info,
            exit_app,
            read_file_content,
            write_file_content
        ])
        .setup(|_app| {
            // アプリケーションの初期化処理
            println!("Sert Editor starting up...");
            
            // PyO3の初期化テスト
            println!("Testing PyO3 integration...");
            match test_python() {
                Ok(result) => println!("✓ PyO3 test successful: {}", result),
                Err(e) => println!("✗ PyO3 test failed: {}", e),
            }
            
            // Python環境情報の表示
            match get_python_info() {
                Ok(info) => println!("✓ {}", info),
                Err(e) => println!("✗ Python info error: {}", e),
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}