use tauri::Manager;

mod db;
mod commands;
mod license;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = db::init(&handle).await {
                    eprintln!("DB init failed: {}", e);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_query,
            commands::db_execute,
            commands::db_batch,
            commands::backup_db,
            commands::restore_db,
            commands::wipe_data,
            commands::activate_license,
            commands::check_license,
            commands::get_machine_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}