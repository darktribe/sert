// src-tauri/build.rs
fn main() {
    #[cfg(target_os = "macos")]
    {
        // Pythonライブラリのリンク設定
        println!("cargo:rustc-link-search=native=/Applications/Vinsert.app/Contents/Frameworks/Python.framework/Versions/3.11/lib");
        println!("cargo:rustc-link-lib=python3.11");
        
        // Python.frameworkのパスを設定
        if let Ok(framework_path) = std::env::var("PYTHON_FRAMEWORK_PATH") {
            println!("cargo:rustc-link-search=framework={}", framework_path);
        }
    }
    
    tauri_build::build()
}