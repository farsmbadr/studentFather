use anyhow::Result;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use tauri::{AppHandle, Manager};

pub async fn init(app: &AppHandle) -> Result<SqlitePool> {
    let app_dir = app.path().app_data_dir().expect("app data dir");
    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("data.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    app.manage(pool.clone());
    Ok(pool)
}

pub fn get_pool(app: &AppHandle) -> Result<SqlitePool> {
    app.try_state::<SqlitePool>()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("DB pool not initialized"))
}