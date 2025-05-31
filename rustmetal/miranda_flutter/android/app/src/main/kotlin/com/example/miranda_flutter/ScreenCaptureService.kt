package com.example.miranda_flutter

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class ScreenCaptureService : Service() {
    
    companion object {
        const val CHANNEL_ID = "SCREEN_CAPTURE_SERVICE_CHANNEL"
        const val NOTIFICATION_ID = 1001
        const val TAG = "ScreenCaptureService"
        
        fun startService(context: Context) {
            val intent = Intent(context, ScreenCaptureService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, ScreenCaptureService::class.java)
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Screen capture service created")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Screen capture service started")
        
        val notification = createNotification()
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID, 
                    notification, 
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                )
                Log.d(TAG, "Started foreground service with MEDIA_PROJECTION type")
            } else {
                startForeground(NOTIFICATION_ID, notification)
                Log.d(TAG, "Started foreground service (legacy)")
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Failed to start foreground service with MEDIA_PROJECTION type: ${e.message}")
            // Try without the specific type as fallback
            try {
                startForeground(NOTIFICATION_ID, notification)
                Log.d(TAG, "Started foreground service without specific type")
            } catch (e2: Exception) {
                Log.e(TAG, "Failed to start foreground service entirely: ${e2.message}")
                stopSelf()
                return START_NOT_STICKY
            }
        }
        
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Screen capture service destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screen Capture Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Enables screen capture for Miranda analysis"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Miranda Screen Capture")
            .setContentText("Capturing screen for analysis...")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .build()
    }
}