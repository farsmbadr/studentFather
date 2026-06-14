#!/usr/bin/env bash

# CenterMasr Desktop Application - Script التشغيل

set -e

cd "$(dirname "$0")"

echo "🚀 بدء CenterMasr Desktop Application..."
echo "==========================================="

# التحقق من وجود الملفات الأساسية
if [ ! -f "Cargo.toml" ]; then
    echo "❌ خطأ: Cargo.toml غير موجود"
    exit 1
fi

if [ ! -d "src" ]; then
    echo "❌ خطأ: مجلد src غير موجود"
    exit 1
fi

# التحقق من وجود Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ خطأ: Rust/cargo غير مثبت"
    echo "قم بتثبيت Rust من: https://rustup.rs/"
    exit 1
fi

# التحقق من وجود Node.js/npm
if ! command -v npm &> /dev/null; then
    echo "❌ خطأ: Node.js/npm غير مثبت"
    exit 1
fi

# بناء حزمة الويب إذا لم تكن موجودة
if [ ! -d "../dist" ] || [ ! -f "../dist/index.html" ]; then
    echo "📦 بناء الواجهة الأمامية..."
    cd .. && npm run build 2>/dev/null || {
        echo "❌ فشل بناء الواجهة الأمامية"
        echo "تأكد من وجود package.json وصحة جميع التبعيات"
        exit 1
    }
    cd src-tauri
else
    echo "✅ تم العثور على حزمة الويب المبنية"
fi

# بناء وتغليف Tauri
echo "🔧 بناء Tauri desktop app..."
cargo tauri dev
