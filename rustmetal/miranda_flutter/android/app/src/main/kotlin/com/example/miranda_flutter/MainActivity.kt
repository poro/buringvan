package com.example.miranda_flutter

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer

class MainActivity: FlutterActivity() {
    private companion object {
        const val SCREEN_CAPTURE_CHANNEL = "screen_capture"
        const val SCREEN_CAPTURE_REQUEST_CODE = 1000
        const val TAG = "MainActivity"
    }

    private var mediaProjectionManager: MediaProjectionManager? = null
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var methodChannel: MethodChannel? = null
    private var pendingResult: MethodChannel.Result? = null
    private var screenWidth = 0
    private var screenHeight = 0
    private var screenDpi = 0

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        methodChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SCREEN_CAPTURE_CHANNEL)
        methodChannel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "requestScreenCapture" -> requestScreenCapture(result)
                "captureScreen" -> captureScreen(result)
                "stopScreenCapture" -> stopScreenCapture(result)
                else -> result.notImplemented()
            }
        }

        // Initialize screen dimensions
        val displayMetrics = DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        screenWidth = displayMetrics.widthPixels
        screenHeight = displayMetrics.heightPixels
        screenDpi = displayMetrics.densityDpi

        mediaProjectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        
        Log.d(TAG, "Flutter engine configured with screen capture support")
    }

    private fun requestScreenCapture(result: MethodChannel.Result) {
        if (mediaProjection != null) {
            Log.d(TAG, "Screen capture already active")
            result.success(true)
            return
        }

        // Start foreground service first (required for Android 15+)
        ScreenCaptureService.startService(this)
        Log.d(TAG, "Started foreground service for MediaProjection")

        pendingResult = result
        val captureIntent = mediaProjectionManager?.createScreenCaptureIntent()
        startActivityForResult(captureIntent, SCREEN_CAPTURE_REQUEST_CODE)
        Log.d(TAG, "Requesting screen capture permission")
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == SCREEN_CAPTURE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                mediaProjection = mediaProjectionManager?.getMediaProjection(resultCode, data)
                
                // Register callback before creating VirtualDisplay (required for Android 15+)
                mediaProjection?.registerCallback(object : MediaProjection.Callback() {
                    override fun onStop() {
                        Log.d(TAG, "MediaProjection stopped")
                        virtualDisplay?.release()
                        imageReader?.close()
                        virtualDisplay = null
                        imageReader = null
                    }
                }, Handler(Looper.getMainLooper()))
                
                setupImageReader()
                Log.d(TAG, "Screen capture permission granted")
                pendingResult?.success(true)
            } else {
                Log.d(TAG, "Screen capture permission denied")
                pendingResult?.success(false)
            }
            pendingResult = null
        }
    }

    private fun setupImageReader() {
        imageReader = ImageReader.newInstance(screenWidth, screenHeight, PixelFormat.RGBA_8888, 1)
        
        virtualDisplay = mediaProjection?.createVirtualDisplay(
            "ScreenCapture",
            screenWidth,
            screenHeight,
            screenDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface,
            null,
            null
        )
        
        Log.d(TAG, "Image reader setup complete: ${screenWidth}x${screenHeight}")
    }

    private fun captureScreen(result: MethodChannel.Result) {
        if (mediaProjection == null || imageReader == null) {
            Log.e(TAG, "Screen capture not initialized")
            result.error("NOT_INITIALIZED", "Screen capture not initialized", null)
            return
        }

        try {
            val image = imageReader?.acquireLatestImage()
            if (image != null) {
                val captureData = processImage(image)
                image.close()
                
                Log.d(TAG, "Screen captured successfully: ${captureData.size} bytes")
                result.success(mapOf(
                    "width" to screenWidth,
                    "height" to screenHeight,
                    "format" to "RGBA_8888",
                    "data" to captureData,
                    "timestamp" to System.currentTimeMillis()
                ))
            } else {
                Log.w(TAG, "No image available for capture")
                result.error("NO_IMAGE", "No image available", null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error capturing screen", e)
            result.error("CAPTURE_ERROR", "Failed to capture screen: ${e.message}", null)
        }
    }

    private fun processImage(image: Image): ByteArray {
        val planes = image.planes
        val buffer = planes[0].buffer
        val pixelStride = planes[0].pixelStride
        val rowStride = planes[0].rowStride
        val rowPadding = rowStride - pixelStride * screenWidth

        // Create bitmap from image buffer
        val bitmap = Bitmap.createBitmap(
            screenWidth + rowPadding / pixelStride, 
            screenHeight, 
            Bitmap.Config.ARGB_8888
        )
        bitmap.copyPixelsFromBuffer(buffer)

        // Crop bitmap to remove padding
        val croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight)
        
        // Convert to byte array
        val outputStream = ByteArrayOutputStream()
        croppedBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        
        // Save to file
        saveScreenshotToFile(croppedBitmap)
        
        bitmap.recycle()
        croppedBitmap.recycle()
        
        return byteArray
    }

    private fun saveScreenshotToFile(bitmap: Bitmap) {
        try {
            val timestamp = System.currentTimeMillis()
            val filename = "screenshot_$timestamp.png"
            val screenshotsDir = File(applicationContext.getExternalFilesDir(null), "miranda_sessions/screenshots")
            screenshotsDir.mkdirs()
            
            val file = File(screenshotsDir, filename)
            val outputStream = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            outputStream.close()
            
            Log.d(TAG, "Screenshot saved: ${file.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving screenshot", e)
        }
    }

    private fun stopScreenCapture(result: MethodChannel.Result) {
        try {
            virtualDisplay?.release()
            mediaProjection?.stop()
            imageReader?.close()
            
            virtualDisplay = null
            mediaProjection = null
            imageReader = null
            
            // Stop foreground service
            ScreenCaptureService.stopService(this)
            Log.d(TAG, "Stopped foreground service for MediaProjection")
            
            Log.d(TAG, "Screen capture stopped")
            result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping screen capture", e)
            result.error("STOP_ERROR", "Failed to stop screen capture: ${e.message}", null)
        }
    }

    override fun onDestroy() {
        stopScreenCapture(object : MethodChannel.Result {
            override fun success(result: Any?) {}
            override fun error(errorCode: String, errorMessage: String?, errorDetails: Any?) {}
            override fun notImplemented() {}
        })
        super.onDestroy()
    }
}