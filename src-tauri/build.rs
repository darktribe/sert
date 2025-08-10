// src-tauri/build.rs
use std::path::Path;

fn main() {
    #[cfg(target_os = "macos")]
    {
        // ビルド時のPython runtimeパスを設定
        let python_runtime_path = "python-runtime/3.11";
        
        // パスが存在するかチェック
        if Path::new(python_runtime_path).exists() {
            let lib_path = format!("{}/lib", python_runtime_path);
            
            println!("cargo:rustc-link-search=native={}", lib_path);
            println!("cargo:rustc-link-lib=python3.11");
            
            // Python.frameworkのパスを環境変数から設定
            if let Ok(framework_path) = std::env::var("PYTHON_FRAMEWORK_PATH") {
                println!("cargo:rustc-link-search=framework={}", framework_path);
            }
            
            println!("cargo:rerun-if-changed={}", python_runtime_path);
            println!("cargo:rerun-if-env-changed=PYTHON_FRAMEWORK_PATH");
        } else {
            // python-runtime が見つからない場合の警告
            println!("cargo:warning=Python runtime not found at {}. Python features may not work.", python_runtime_path);
        }
    }
    
    tauri_build::build()
}