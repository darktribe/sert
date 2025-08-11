use std::env;
use std::path::{Path, PathBuf};
use std::fs;
use std::process::Command;

// python-build-standaloneのバージョン
const PYTHON_VERSION: &str = "3.11.9";
const PBS_VERSION: &str = "20240415";

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    
    // 従来のPyO3ビルドを実行（安全なフォールバック）
    let use_system_python = std::env::var("USE_SYSTEM_PYTHON").unwrap_or_else(|_| "false".to_string()) == "true";
    
    if !use_system_python {
        if let Err(e) = setup_standalone_python() {
            println!("cargo:warning=Failed to setup standalone Python: {}", e);
            println!("cargo:warning=Falling back to system Python");
            setup_system_python_fallback();
        }
    } else {
        println!("cargo:warning=Using system Python as requested");
        setup_system_python_fallback();
    }
    
    // Tauriビルドを実行
    tauri_build::build();
}

fn setup_standalone_python() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = env::var("OUT_DIR")?;
    let target = env::var("TARGET")?;
    
    // プラットフォーム固有の設定
    let (python_archive, python_executable) = get_platform_config(&target)?;
    
    let python_dir = Path::new(&out_dir).join("python-standalone");
    let python_exe_path = python_dir.join(&python_executable);
    
    // 既にPythonがセットアップされている場合はスキップ
    if python_exe_path.exists() {
        println!("cargo:warning=Standalone Python already exists, skipping download");
        set_pyo3_env_vars(&python_dir, &python_executable)?;
        return Ok(());
    }
    
    println!("cargo:warning=Setting up standalone Python for target: {}", target);
    
    // Pythonアーカイブをダウンロード
    let archive_path = download_python_archive(&out_dir, &python_archive)?;
    
    // アーカイブを展開
    extract_python_archive(&archive_path, &python_dir)?;
    
    // PyO3用の環境変数を設定
    set_pyo3_env_vars(&python_dir, &python_executable)?;
    
    // アーカイブファイルを削除
    let _ = fs::remove_file(archive_path);
    
    println!("cargo:warning=Standalone Python setup completed successfully");
    Ok(())
}

fn get_platform_config(target: &str) -> Result<(String, String), Box<dyn std::error::Error>> {
    let (os, arch, variant) = if target.contains("x86_64-pc-windows") {
        ("windows", "x86_64", "pc-windows-msvc-shared")
    } else if target.contains("x86_64-apple-darwin") {
        ("macos", "x86_64", "apple-darwin-install_only")
    } else if target.contains("aarch64-apple-darwin") {
        ("macos", "aarch64", "apple-darwin-install_only")
    } else if target.contains("x86_64-unknown-linux") {
        ("linux", "x86_64", "unknown-linux-gnu-install_only")
    } else if target.contains("aarch64-unknown-linux") {
        ("linux", "aarch64", "unknown-linux-gnu-install_only")
    } else {
        return Err(format!("Unsupported target: {}", target).into());
    };
    
    // 修正されたファイル名形式
    let archive_name = format!("cpython-{}-{}-{}-pgo+lto-full.tar.zst", PYTHON_VERSION, arch, variant);
    
    let executable = match os {
        "windows" => "python.exe",
        _ => "bin/python3",
    };
    
    println!("cargo:warning=Looking for archive: {}", archive_name);
    Ok((archive_name, executable.to_string()))
}

fn download_python_archive(out_dir: &str, archive_name: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let url = format!(
        "https://github.com/indygreg/python-build-standalone/releases/download/{}/{}",
        PBS_VERSION,
        archive_name
    );
    
    let archive_path = Path::new(out_dir).join(archive_name);
    
    if archive_path.exists() {
        println!("cargo:warning=Archive already exists, skipping download");
        return Ok(archive_path);
    }
    
    println!("cargo:warning=Downloading Python from: {}", url);
    
    let response = reqwest::blocking::get(&url)?;
    if !response.status().is_success() {
        return Err(format!("Failed to download: HTTP {}", response.status()).into());
    }
    
    let bytes = response.bytes()?;
    fs::write(&archive_path, bytes)?;
    
    println!("cargo:warning=Downloaded Python archive: {} bytes", archive_path.metadata()?.len());
    Ok(archive_path)
}

fn extract_python_archive(archive_path: &Path, python_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    if python_dir.exists() {
        fs::remove_dir_all(python_dir)?;
    }
    fs::create_dir_all(python_dir)?;
    
    println!("cargo:warning=Extracting Python archive to: {}", python_dir.display());
    
    // .tar.zstアーカイブの場合、まずzstdで展開してからtarで展開
    if archive_path.extension().and_then(|s| s.to_str()) == Some("zst") {
        // zstdコマンドが利用可能かチェック
        if Command::new("zstd").arg("--version").output().is_ok() {
            // zstdコマンドを使用
            let tar_path = archive_path.with_extension("");
            
            let output = Command::new("zstd")
                .arg("-d")
                .arg(archive_path)
                .arg("-o")
                .arg(&tar_path)
                .output()?;
            
            if !output.status.success() {
                return Err(format!("zstd decompression failed: {}", String::from_utf8_lossy(&output.stderr)).into());
            }
            
            // tarで展開
            let tar_file = fs::File::open(&tar_path)?;
            let mut archive = tar::Archive::new(tar_file);
            archive.unpack(python_dir)?;
            
            // 一時tarファイルを削除
            let _ = fs::remove_file(tar_path);
        } else {
            return Err("zstd command not found. Please install zstd: brew install zstd".into());
        }
    } else {
        return Err("Unsupported archive format".into());
    }
    
    println!("cargo:warning=Python extraction completed");
    Ok(())
}

fn set_pyo3_env_vars(python_dir: &Path, python_executable: &str) -> Result<(), Box<dyn std::error::Error>> {
    let python_exe = python_dir.join(python_executable);
    
    if !python_exe.exists() {
        return Err(format!("Python executable not found: {}", python_exe.display()).into());
    }
    
    // PyO3用の環境変数を設定
    println!("cargo:rustc-env=PYO3_PYTHON={}", python_exe.display());
    
    // macOS用のPythonライブラリリンク設定
    if cfg!(target_os = "macos") {
        // Pythonライブラリディレクトリを探す
        let lib_candidates = vec![
            python_dir.join("lib"),
            python_dir.join("lib").join("python3.11"),
            python_dir.join("Library").join("lib"),
        ];
        
        for candidate in lib_candidates {
            if candidate.exists() {
                println!("cargo:rustc-link-search=native={}", candidate.display());
                break;
            }
        }
        
        // Python Framework パスを探す
        let framework_candidates = vec![
            python_dir.join("Python.framework").join("Versions").join("3.11"),
            python_dir.join("lib").join("python3.11").join("config-3.11-darwin"),
        ];
        
        for candidate in framework_candidates {
            if candidate.exists() {
                println!("cargo:rustc-link-search=native={}", candidate.display());
                break;
            }
        }
        
        // libpython.dylibを明示的にリンク
        println!("cargo:rustc-link-lib=dylib=python3.11");
    }
    
    // 組み込みPythonのフラグを設定
    println!("cargo:rustc-env=VINSERT_EMBEDDED_PYTHON=1");
    println!("cargo:rustc-env=VINSERT_PYTHON_PATH={}", python_exe.display());
    
    println!("cargo:warning=PyO3 environment variables set for: {}", python_exe.display());
    Ok(())
}

fn setup_system_python_fallback() {
    println!("cargo:warning=Setting up system Python fallback");
    
    // システムPython用のフラグを設定
    println!("cargo:rustc-env=VINSERT_EMBEDDED_PYTHON=0");
    println!("cargo:rustc-env=VINSERT_PYTHON_PATH=system");
    
    // macOSでのシステムPythonリンク設定
    if cfg!(target_os = "macos") {
        // Homebrewのpython3をチェック
        if let Ok(output) = Command::new("brew").args(&["--prefix", "python@3.11"]).output() {
            if output.status.success() {
                let prefix = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let lib_path = format!("{}/lib", prefix);
                println!("cargo:rustc-link-search=native={}", lib_path);
                println!("cargo:rustc-link-lib=dylib=python3.11");
                println!("cargo:warning=Using Homebrew Python at: {}", prefix);
                return;
            }
        }
        
        // システムのpython3をチェック
        if let Ok(output) = Command::new("python3-config").arg("--ldflags").output() {
            if output.status.success() {
                let ldflags = String::from_utf8_lossy(&output.stdout);
                for flag in ldflags.split_whitespace() {
                    if flag.starts_with("-L") {
                        let path = flag.trim_start_matches("-L");
                        println!("cargo:rustc-link-search=native={}", path);
                    } else if flag.starts_with("-l") {
                        let lib = flag.trim_start_matches("-l");
                        if lib.contains("python") {
                            println!("cargo:rustc-link-lib=dylib={}", lib);
                        }
                    }
                }
                println!("cargo:warning=Using system Python with python3-config");
                return;
            }
        }
        
        // フォールバック: 共通のシステムパス
        let common_paths = vec![
            "/usr/lib",
            "/usr/local/lib",
            "/opt/homebrew/lib",
            "/Library/Frameworks/Python.framework/Versions/3.11/lib",
        ];
        
        for path in common_paths {
            if Path::new(path).exists() {
                println!("cargo:rustc-link-search=native={}", path);
            }
        }
        
        println!("cargo:rustc-link-lib=dylib=python3.11");
    }
    
    println!("cargo:warning=System Python fallback configured");
}