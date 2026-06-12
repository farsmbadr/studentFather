use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use tauri::AppHandle;
use crate::db;
use crate::license;

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
}

#[derive(Deserialize)]
pub struct ExecuteParams {
    pub sql: String,
    pub params: Vec<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct BackupData {
    pub tables: std::collections::HashMap<String, Vec<serde_json::Value>>,
}

const ALL_TABLES: &[&str] = &[
    "students","absence_records","payments","exam_results","attendance_notes",
    "student_groups","exams","books","classes","teachers","subjects",
    "subject_teachers","subject_students","group_subjects","groups",
    "notifications","app_users","custom_roles","login_logs","center_config",
    "student_status","questions","exam_questions","suppliers",
    "supplier_transactions","book_deliveries","book_delivery_payments","expenses","grades",
];

fn json_to_param(v: &serde_json::Value) -> Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send + Sync> {
    // We handle this via dynamic dispatch in execute_sql
    todo!()
}

fn json_to_value(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Null => "NULL".to_string(),
        serde_json::Value::Bool(b) => if *b { "1".to_string() } else { "0".to_string() },
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => {
            let escaped = s.replace('\'', "''");
            format!("'{}'", escaped)
        },
        serde_json::Value::Array(arr) => format!("'{}'", serde_json::to_string(arr).unwrap_or_default()),
        serde_json::Value::Object(obj) => format!("'{}'", serde_json::to_string(obj).unwrap_or_default()),
    }
}

fn build_placeholders(params: &[serde_json::Value]) -> (String, Vec<String>) {
    let mut placeholders = Vec::new();
    let mut values = Vec::new();
    for (i, p) in params.iter().enumerate() {
        placeholders.push(format!("${}", i + 1));
        values.push(match p {
            serde_json::Value::Null => String::new(),
            serde_json::Value::Bool(b) => if *b { "1".to_string() } else { "0".to_string() },
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => s.clone(),
            _ => p.to_string(),
        });
    }
    (placeholders.join(","), values)
}

#[tauri::command]
pub async fn db_query(app: AppHandle, sql: String, params: Vec<serde_json::Value>) -> Result<QueryResult, String> {
    let pool = db::get_pool(&app).map_err(|e| e.to_string())?;

    // Validate SQL (allow only SELECT)
    let trimmed = sql.trim().to_uppercase();
    if !trimmed.starts_with("SELECT") && !trimmed.starts_with("WITH") && !trimmed.starts_with("PRAGMA") {
        return Err("Only SELECT queries are allowed".to_string());
    }

    let mut query = sqlx::query(&sql);
    for p in &params {
        match p {
            serde_json::Value::Null => { query = query.bind(None::<String>); }
            serde_json::Value::Bool(b) => { query = query.bind(*b); }
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() { query = query.bind(i); }
                else if let Some(f) = n.as_f64() { query = query.bind(f); }
                else { query = query.bind(n.to_string()); }
            }
            serde_json::Value::String(s) => { query = query.bind(s.clone()); }
            _ => { query = query.bind(p.to_string()); }
        }
    }

    let rows = query.fetch_all(&pool).await.map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(QueryResult { columns: vec![], rows: vec![] });
    }

    let columns: Vec<String> = rows[0].columns().iter().map(|c| c.name().to_string()).collect();
    let mut result_rows = Vec::new();

    for row in &rows {
        let mut vals = Vec::new();
        for col in &columns {
            let val: sqlx::Value = row.try_get(col).unwrap_or(sqlx::Value::Null);
            let jv = sqlx_value_to_json(val);
            vals.push(jv);
        }
        result_rows.push(vals);
    }

    Ok(QueryResult { columns, rows: result_rows })
}

fn sqlx_value_to_json(val: sqlx::Value) -> serde_json::Value {
    match val {
        sqlx::Value::Null => serde_json::Value::Null,
        sqlx::Value::Integer(i) => serde_json::json!(i),
        sqlx::Value::Real(f) => serde_json::json!(f),
        sqlx::Value::Text(s) => serde_json::json!(s),
        sqlx::Value::Blob(b) => serde_json::json!(b),
        _ => serde_json::Value::Null,
    }
}

#[tauri::command]
pub async fn db_execute(app: AppHandle, sql: String, params: Vec<serde_json::Value>) -> Result<String, String> {
    let pool = db::get_pool(&app).map_err(|e| e.to_string())?;

    let mut query = sqlx::query(&sql);
    for p in &params {
        match p {
            serde_json::Value::Null => { query = query.bind(None::<String>); }
            serde_json::Value::Bool(b) => { query = query.bind(*b as i32); }
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() { query = query.bind(i); }
                else if let Some(f) = n.as_f64() { query = query.bind(f); }
                else { query = query.bind(n.to_string()); }
            }
            serde_json::Value::String(s) => { query = query.bind(s.clone()); }
            _ => { query = query.bind(p.to_string()); }
        }
    }

    let result = query.execute(&pool).await.map_err(|e| e.to_string())?;
    Ok(format!("{}", result.rows_affected()))
}

#[tauri::command]
pub async fn db_batch(app: AppHandle, operations: Vec<ExecuteParams>) -> Result<Vec<String>, String> {
    let pool = db::get_pool(&app).map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    for op in &operations {
        let mut query = sqlx::query(&op.sql);
        for p in &op.params {
            match p {
                serde_json::Value::Null => { query = query.bind(None::<String>); }
                serde_json::Value::Bool(b) => { query = query.bind(*b as i32); }
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() { query = query.bind(i); }
                    else if let Some(f) = n.as_f64() { query = query.bind(f); }
                    else { query = query.bind(n.to_string()); }
                }
                serde_json::Value::String(s) => { query = query.bind(s.clone()); }
                _ => { query = query.bind(p.to_string()); }
            }
        }
        let r = query.execute(&mut *tx).await.map_err(|e| e.to_string())?;
        results.push(format!("{}", r.rows_affected()));
    }

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
pub async fn backup_db(app: AppHandle) -> Result<std::collections::HashMap<String, Vec<serde_json::Value>>, String> {
    let pool = db::get_pool(&app).map_err(|e| e.to_string())?;
    let mut data = std::collections::HashMap::new();

    for table in ALL_TABLES {
        let rows = sqlx::query(&format!("SELECT * FROM \"{}\"", table))
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string())?;

        if rows.is_empty() {
            data.insert(table.to_string(), vec![]);
            continue;
        }

        let columns: Vec<String> = rows[0].columns().iter().map(|c| c.name().to_string()).collect();
        let mut table_rows = Vec::new();

        for row in &rows {
            let mut obj = serde_json::Map::new();
            for col in &columns {
                let val: sqlx::Value = row.try_get(col).unwrap_or(sqlx::Value::Null);
                obj.insert(col.clone(), sqlx_value_to_json(val));
            }
            table_rows.push(serde_json::Value::Object(obj));
        }
        data.insert(table.to_string(), table_rows);
    }

    // Also save to backup directories
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    let now = chrono::Local::now();
    let ts = now.format("%Y-%m-%d_%H%M").to_string();
    let filename = format!("manual-{}.json", ts);

    let dirs = vec!["C:\\CenterMasrBackup"];
    for dir in &dirs {
        if std::path::Path::new(dir).exists() || dir.starts_with("C:\\") {
            std::fs::create_dir_all(dir).ok();
            std::fs::write(std::path::Path::new(dir).join(&filename), &content).ok();
        }
    }
    // Try D: drive
    if std::path::Path::new("D:\\").exists() {
        let d_dir = "D:\\CenterMasrBackup";
        std::fs::create_dir_all(d_dir).ok();
        std::fs::write(std::path::Path::new(d_dir).join(&filename), &content).ok();
    }

    Ok(data)
}

#[tauri::command]
pub async fn restore_db(app: AppHandle, data: BackupData) -> Result<String, String> {
    let pool = db::get_pool(&app).map_err(|e| e.to_string())?;
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;

    // Disable foreign keys for restore
    sqlx::query("PRAGMA foreign_keys = OFF").execute(&mut *tx).await.map_err(|e| e.to_string())?;

    // Clear all tables
    for table in ALL_TABLES {
        sqlx::query(&format!("DELETE FROM \"{}\"", table))
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Insert backed up data
    for (table, rows) in &data.tables {
        if rows.is_empty() { continue; }

        for row_obj in rows {
            let obj = match row_obj.as_object() {
                Some(o) => o,
                None => continue,
            };

            let columns: Vec<&String> = obj.keys().collect();
            let placeholders: Vec<String> = (0..columns.len()).map(|i| format!("?{}", i + 1)).collect();
            let values: Vec<serde_json::Value> = columns.iter().map(|k| obj[*k].clone()).collect();

            let sql = format!(
                "INSERT OR REPLACE INTO \"{}\" ({}) VALUES ({})",
                table,
                columns.iter().map(|c| format!("\"{}\"", c)).collect::<Vec<_>>().join(","),
                placeholders.join(",")
            );

            let mut query = sqlx::query(&sql);
            for v in &values {
                match v {
                    serde_json::Value::Null => { query = query.bind(None::<String>); }
                    serde_json::Value::Bool(b) => { query = query.bind(*b as i32); }
                    serde_json::Value::Number(n) => {
                        if let Some(i) = n.as_i64() { query = query.bind(i); }
                        else if let Some(f) = n.as_f64() { query = query.bind(f); }
                        else { query = query.bind(n.to_string()); }
                    }
                    serde_json::Value::String(s) => { query = query.bind(s.clone()); }
                    _ => { query = query.bind(v.to_string()); }
                }
            }

            query.execute(&mut *tx).await.map_err(|e| e.to_string())?;
        }
    }

    sqlx::query("PRAGMA foreign_keys = ON").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok("تم استعادة البيانات بنجاح".to_string())
}

#[tauri::command]
pub async fn wipe_data(app: AppHandle, password: String) -> Result<String, String> {
    let pool = db::get_pool(&app).map_err(|e| e.to_string())?;

    // Verify super admin password
    let row = sqlx::query("SELECT id FROM app_users WHERE password = ?1 AND is_super_admin = 1")
        .bind(&password)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if row.is_none() {
        return Err("كلمة مرور المشرف العام غير صحيحة".to_string());
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("PRAGMA foreign_keys = OFF").execute(&mut *tx).await.map_err(|e| e.to_string())?;

    for table in ALL_TABLES {
        if *table == "app_users" { continue; }
        sqlx::query(&format!("DELETE FROM \"{}\"", table))
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
    }

    sqlx::query("PRAGMA foreign_keys = ON").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok("تم حذف البيانات بنجاح".to_string())
}

#[tauri::command]
pub async fn activate_license(license_json: String) -> Result<String, String> {
    let val: serde_json::Value = serde_json::from_str(&license_json).map_err(|e| e.to_string())?;

    let machine_id = val["machine_id"].as_str().ok_or("حقل machine_id مطلوب")?;
    let expires_at = val["expires_at"].as_str().ok_or("حقل expires_at مطلوب")?;

    let current_machine_id = license::get_machine_id();
    if machine_id != current_machine_id {
        return Err("هذا الترخيص لجهاز آخر".to_string());
    }

    let license = license::sign(&val).map_err(|e| e.to_string())?;
    license::write_license_file(&license).map_err(|e| e.to_string())?;

    Ok("تم تفعيل الترخيص بنجاح".to_string())
}

#[tauri::command]
pub async fn check_license() -> Result<serde_json::Value, String> {
    let current_machine_id = license::get_machine_id();

    let (valid, license) = match std::fs::metadata("license.json") {
        Ok(_) => {
            match license::read_license_file() {
                Ok(l) => {
                    let sig_ok = license::verify(&l);
                    if !sig_ok {
                        (false, Some(serde_json::json!({
                            "valid": false,
                            "error": "الترخيص غير صالح",
                            "currentMachineId": current_machine_id
                        })))
                    } else {
                        let valid = l["machine_id"] == current_machine_id
                            && is_not_expired(l["expires_at"].as_str().unwrap_or(""));
                        (valid, Some(serde_json::json!({
                            "machine_id": l["machine_id"],
                            "activated_at": l["activated_at"],
                            "expires_at": l["expires_at"],
                            "sig": l["sig"],
                            "valid": valid,
                            "currentMachineId": current_machine_id
                        })))
                    }
                }
                Err(_) => (false, None),
            }
        }
        Err(_) => (false, None),
    };

    match license {
        Some(l) => Ok(l),
        None => {
            // Generate 14-day trial
            let now = chrono::Utc::now();
            let expires = now + chrono::Duration::days(14);
            let trial = serde_json::json!({
                "machine_id": current_machine_id,
                "activated_at": now.to_rfc3339(),
                "expires_at": expires.to_rfc3339()
            });
            let signed = license::sign(&trial).unwrap_or(trial);
            license::write_license_file(&signed).ok();
            Ok(serde_json::json!({
                "machine_id": current_machine_id,
                "activated_at": signed["activated_at"],
                "expires_at": signed["expires_at"],
                "sig": signed.get("sig"),
                "valid": true,
                "currentMachineId": current_machine_id,
                "trial": true
            }))
        }
    }
}

fn is_not_expired(expires_at: &str) -> bool {
    if let Ok(exp) = chrono::DateTime::parse_from_rfc3339(expires_at) {
        chrono::Utc::now() < exp
    } else {
        false
    }
}

#[tauri::command]
pub async fn get_machine_id() -> String {
    license::get_machine_id()
}
