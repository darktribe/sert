fn main() {
    // PyOxidizerビルドは別途手動で実行
    // cargo buildと統合しない（PyOxidizerのバージョン互換性のため）
    tauri_build::build()
}