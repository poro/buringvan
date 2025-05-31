package com.example.miranda_flutter

class RustLibrary {
    companion object {
        init {
            System.loadLibrary("miranda_core")
        }
    }
}