const express = require('express');
const NotificationController = require('../controllers/notification.controller');
const {
  authenticateToken,
  authenticateService,
  authorizeAdmin,
  checkSubscriptionPlan,
  checkNotificationLimits,
  rateLimitByUser,
  validateApiKey
} = require('../middleware/auth.middleware');
const {
  validateCreateNotification,
  validateTestNotification,
  validateDeviceToken,
  validatePreferences,
  validateBulkNotifications,
  validateTopicSubscription,
  validateTopicNotification,
  validateNotificationId,
  validateDeviceId,
  validateNotificationQuery,
  validateStatsQuery,
  validateSmsWebhook,
  validateEmailUnsubscribe
} = require('../middleware/validation.middleware');

const router = express.Router();
const notificationController = new NotificationController();

// Public routes (no authentication required)
router.get('/unsubscribe', 
  validateEmailUnsubscribe,
  notificationController.handleEmailUnsubscribe.bind(notificationController)
);

router.post('/sms/webhook',
  validateSmsWebhook,
  notificationController.handleSmsWebhook.bind(notificationController)
);

router.post('/sms/incoming',
  validateSmsWebhook,
  notificationController.handleIncomingSms.bind(notificationController)
);

// User routes (require authentication)
router.use(authenticateToken);

// Get user notifications
router.get('/',
  validateNotificationQuery,
  rateLimitByUser(60000, 100), // 100 requests per minute
  notificationController.getUserNotifications.bind(notificationController)
);

// Get unread notification count
router.get('/unread-count',
  rateLimitByUser(60000, 200), // 200 requests per minute
  notificationController.getUnreadCount.bind(notificationController)
);

// Mark notification as read
router.put('/:notificationId/read',
  validateNotificationId,
  rateLimitByUser(60000, 100),
  notificationController.markAsRead.bind(notificationController)
);

// Mark all notifications as read
router.put('/read-all',
  rateLimitByUser(60000, 10), // 10 requests per minute
  notificationController.markAllAsRead.bind(notificationController)
);

// Delete notification
router.delete('/:notificationId',
  validateNotificationId,
  rateLimitByUser(60000, 50),
  notificationController.deleteNotification.bind(notificationController)
);

// Send test notification
router.post('/test',
  validateTestNotification,
  checkNotificationLimits,
  rateLimitByUser(60000, 5), // 5 test notifications per minute
  notificationController.sendTestNotification.bind(notificationController)
);

// Device token management
router.post('/device-tokens',
  validateDeviceToken,
  rateLimitByUser(60000, 10),
  notificationController.registerDeviceToken.bind(notificationController)
);

router.delete('/device-tokens/:deviceId',
  validateDeviceId,
  rateLimitByUser(60000, 10),
  notificationController.unregisterDeviceToken.bind(notificationController)
);

// Notification preferences
router.get('/preferences',
  rateLimitByUser(60000, 50),
  notificationController.getPreferences.bind(notificationController)
);

router.put('/preferences',
  validatePreferences,
  rateLimitByUser(60000, 20),
  notificationController.updatePreferences.bind(notificationController)
);

// Push topic subscription (requires basic plan)
router.post('/topics/subscribe',
  validateTopicSubscription,
  checkSubscriptionPlan('basic'),
  rateLimitByUser(60000, 10),
  notificationController.subscribeTopic.bind(notificationController)
);

router.post('/topics/unsubscribe',
  validateTopicSubscription,
  checkSubscriptionPlan('basic'),
  rateLimitByUser(60000, 10),
  notificationController.unsubscribeTopic.bind(notificationController)
);

// Notification statistics
router.get('/stats',
  validateStatsQuery,
  checkSubscriptionPlan('basic'),
  rateLimitByUser(60000, 20),
  notificationController.getStats.bind(notificationController)
);

// Admin routes (require admin role)
router.post('/',
  validateCreateNotification,
  authorizeAdmin,
  rateLimitByUser(60000, 100),
  notificationController.createNotification.bind(notificationController)
);

router.post('/bulk',
  validateBulkNotifications,
  authorizeAdmin,
  rateLimitByUser(60000, 5), // 5 bulk operations per minute
  notificationController.sendBulkNotifications.bind(notificationController)
);

router.post('/topics/send',
  validateTopicNotification,
  authorizeAdmin,
  rateLimitByUser(60000, 10),
  notificationController.sendTopicNotification.bind(notificationController)
);

// Service routes (for inter-service communication)
router.use('/service', authenticateService);

router.post('/service/create',
  validateCreateNotification,
  rateLimitByUser(60000, 1000), // Higher limit for service calls
  notificationController.createNotification.bind(notificationController)
);

router.post('/service/bulk',
  validateBulkNotifications,
  rateLimitByUser(60000, 100),
  notificationController.sendBulkNotifications.bind(notificationController)
);

// API routes (for external integrations)
router.use('/api', validateApiKey);

router.post('/api/send',
  validateCreateNotification,
  rateLimitByUser(60000, 50),
  notificationController.createNotification.bind(notificationController)
);

module.exports = router;
