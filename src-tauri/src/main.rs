use tauri::{Builder, WebviewWindow, Emitter, generate_handler};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
struct ApiRequest {
    method: String,
    path: String,
    body: Option<serde_json::Value>,
    headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse {
    status: u16,
    data: Option<serde_json::Value>,
    error: Option<String>,
}

#[tauri::command]
async fn call_api(request: ApiRequest) -> Result<ApiResponse, String> {
    let client = reqwest::Client::new();
    let url = format!("http://localhost:3001{}", request.path);

    let mut req = match request.method.to_lowercase().as_str() {
        "get" => client.get(&url),
        "post" => client.post(&url),
        "put" => client.put(&url),
        "patch" => client.patch(&url),
        "delete" => client.delete(&url),
        _ => return Err(format!("Unsupported method: {}", request.method)),
    };

    if let Some(body) = request.body {
        req = req.json(&body);
    }

    if let Some(headers) = request.headers {
        for (key, value) in headers {
            req = req.header(key, value);
        }
    }

    let response = req.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let json_result = response.json::<serde_json::Value>().await;
    let (data, error) = match json_result {
        Ok(data) => (Some(data), None),
        Err(_) => {
            let text = response.text().await.unwrap_or_default();
            (None, Some(text))
        }
    };
    Ok(ApiResponse { status, data, error })
}

fn main() {
    Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // أرسل حدث بعد بدء التشغيل
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(2));
                handle.emit("backend-ready", ()).unwrap_or_else(|e| {
                    eprintln!("Failed to emit backend-ready: {}", e);
                });
            });

            Ok(())
        })
        .invoke_handler(generate_handler![
            call_api,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
