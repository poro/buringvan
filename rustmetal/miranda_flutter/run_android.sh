#!/bin/bash

echo "🤖 Checking for Android emulators..."

# Check if emulator is running
if flutter devices | grep -q "emulator"; then
    echo "✅ Android emulator detected!"
    echo "🚀 Running Miranda on Android..."
    flutter run -d emulator
else
    echo "❌ No Android emulator found!"
    echo ""
    echo "Please start an Android emulator:"
    echo "1. Open Android Studio"
    echo "2. Click 'More Actions' → 'AVD Manager'"
    echo "3. Start an emulator (click ▶️)"
    echo ""
    echo "Or run: open -a 'Android Studio'"
fi