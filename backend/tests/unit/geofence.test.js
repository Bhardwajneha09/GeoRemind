jest.mock('../../models', () => {
  return {
    User: {
      findByPk: jest.fn()
    },
    Geofence: {
      findAll: jest.fn()
    },
    Reminder: {
      findAll: jest.fn()
    },
    ReminderLog: {
      create: jest.fn()
    }
  };
});

jest.mock('../../services/firebaseService', () => ({
  sendPushNotification: jest.fn().mockResolvedValue({ success: true })
}));

const { User, Geofence, Reminder, ReminderLog } = require('../../models');
const { sendPushNotification } = require('../../services/firebaseService');
const { checkUserGeofences } = require('../../services/geofenceService');

describe('GeofenceService Unit Tests', () => {
  let mockIo;
  const mockUserId = 'user-uuid-1234';
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    fcm_token: 'mock-fcm-token-5678'
  };

  const geofenceCenterLat = 40.7128;
  const geofenceCenterLng = -74.006;
  const geofenceRadius = 100; // 100 metres

  beforeEach(() => {
    jest.clearAllMocks();

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    User.findByPk.mockResolvedValue(mockUser);
    ReminderLog.create.mockImplementation((logData) =>
      Promise.resolve({
        id: 'log-uuid-999',
        ...logData
      })
    );
  });

  test('Test that reminders trigger when inside geofence', async () => {
    const mockReminder = {
      id: 'reminder-1',
      user_id: mockUserId,
      geofence_id: 'geofence-1',
      message: 'Welcome to Central Station!',
      trigger_type: 'enter',
      is_recurring: false,
      is_active: true,
      last_triggered_at: null,
      save: jest.fn().mockResolvedValue(true)
    };

    const mockGeofence = {
      id: 'geofence-1',
      user_id: mockUserId,
      name: 'Central Station',
      lat: geofenceCenterLat,
      lng: geofenceCenterLng,
      radius_m: geofenceRadius,
      is_active: true,
      reminders: [mockReminder]
    };

    Geofence.findAll.mockResolvedValue([mockGeofence]);

    // Coordinates directly at the geofence center (distance = 0m <= 100m)
    const triggered = await checkUserGeofences(
      mockUserId,
      geofenceCenterLat,
      geofenceCenterLng,
      mockIo
    );

    expect(triggered).toHaveLength(1);
    expect(triggered[0].eventType).toBe('enter');
    expect(triggered[0].reminder.id).toBe('reminder-1');
    expect(triggered[0].distance).toBe(0);

    // Verify ReminderLog was created
    expect(ReminderLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reminder_id: 'reminder-1',
        user_id: mockUserId,
        trigger_type: 'enter'
      })
    );

    // Verify Socket.io emit
    expect(mockIo.to).toHaveBeenCalledWith(`user:${mockUserId}`);
    expect(mockIo.emit).toHaveBeenCalledWith(
      'reminder:triggered',
      expect.objectContaining({
        reminderId: 'reminder-1',
        eventType: 'enter'
      })
    );

    // Verify push notification
    expect(sendPushNotification).toHaveBeenCalledWith(
      mockUser.fcm_token,
      'Reminder: Central Station',
      'Welcome to Central Station!',
      expect.any(Object)
    );

    // Non-recurring reminder should be saved with is_active = false
    expect(mockReminder.is_active).toBe(false);
    expect(mockReminder.last_triggered_at).toBeInstanceOf(Date);
    expect(mockReminder.save).toHaveBeenCalled();
  });

  test("Test that reminders don't trigger when outside geofence", async () => {
    const mockReminder = {
      id: 'reminder-2',
      user_id: mockUserId,
      geofence_id: 'geofence-1',
      message: 'Don’t forget coffee!',
      trigger_type: 'enter',
      is_recurring: false,
      is_active: true,
      last_triggered_at: null,
      save: jest.fn().mockResolvedValue(true)
    };

    const mockGeofence = {
      id: 'geofence-1',
      user_id: mockUserId,
      name: 'Central Station',
      lat: geofenceCenterLat,
      lng: geofenceCenterLng,
      radius_m: geofenceRadius,
      is_active: true,
      reminders: [mockReminder]
    };

    Geofence.findAll.mockResolvedValue([mockGeofence]);

    // Point located ~1 km away from geofence center
    const outsideLat = 40.722;
    const outsideLng = -74.006;

    const triggered = await checkUserGeofences(mockUserId, outsideLat, outsideLng, mockIo);

    expect(triggered).toHaveLength(0);
    expect(ReminderLog.create).not.toHaveBeenCalled();
    expect(mockIo.emit).not.toHaveBeenCalled();
    expect(mockReminder.save).not.toHaveBeenCalled();
  });

  test('Test enter vs exit trigger types', async () => {
    // 1. Exit trigger when user was previously inside and now outside
    const mockExitReminder = {
      id: 'reminder-exit',
      user_id: mockUserId,
      geofence_id: 'geofence-1',
      message: 'Goodbye from the station!',
      trigger_type: 'exit',
      is_recurring: false,
      is_active: true,
      last_triggered_at: new Date('2024-01-01T10:00:00Z'), // previously triggered enter
      save: jest.fn().mockResolvedValue(true)
    };

    const mockGeofence = {
      id: 'geofence-1',
      user_id: mockUserId,
      name: 'Central Station',
      lat: geofenceCenterLat,
      lng: geofenceCenterLng,
      radius_m: geofenceRadius,
      is_active: true,
      reminders: [mockExitReminder]
    };

    Geofence.findAll.mockResolvedValue([mockGeofence]);

    // Point outside geofence perimeter (~300 metres away)
    const outsideLat = 40.7155;
    const outsideLng = -74.006;

    const triggeredExit = await checkUserGeofences(mockUserId, outsideLat, outsideLng, mockIo);

    expect(triggeredExit).toHaveLength(1);
    expect(triggeredExit[0].eventType).toBe('exit');
    expect(triggeredExit[0].reminder.id).toBe('reminder-exit');
    expect(ReminderLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'exit'
      })
    );

    // 2. Exit reminder should NOT trigger if user was never inside
    mockExitReminder.last_triggered_at = null;
    ReminderLog.create.mockClear();

    const triggeredNeverInside = await checkUserGeofences(
      mockUserId,
      outsideLat,
      outsideLng,
      mockIo
    );
    expect(triggeredNeverInside).toHaveLength(0);
    expect(ReminderLog.create).not.toHaveBeenCalled();

    // 3. Enter reminder should NOT trigger when outside
    const mockEnterReminder = {
      id: 'reminder-enter',
      user_id: mockUserId,
      geofence_id: 'geofence-1',
      message: 'Hello!',
      trigger_type: 'enter',
      is_recurring: false,
      is_active: true,
      last_triggered_at: null,
      save: jest.fn().mockResolvedValue(true)
    };
    mockGeofence.reminders = [mockEnterReminder];

    const triggeredEnterOutside = await checkUserGeofences(
      mockUserId,
      outsideLat,
      outsideLng,
      mockIo
    );
    expect(triggeredEnterOutside).toHaveLength(0);
  });

  test('Test is_recurring behavior', async () => {
    // Non-recurring reminder
    const nonRecurringReminder = {
      id: 'non-rec-1',
      user_id: mockUserId,
      geofence_id: 'geofence-1',
      message: 'One-time notification',
      trigger_type: 'enter',
      is_recurring: false,
      is_active: true,
      last_triggered_at: null,
      save: jest.fn().mockResolvedValue(true)
    };

    // Recurring reminder
    const recurringReminder = {
      id: 'rec-1',
      user_id: mockUserId,
      geofence_id: 'geofence-1',
      message: 'Recurring notification',
      trigger_type: 'enter',
      is_recurring: true,
      is_active: true,
      last_triggered_at: new Date('2024-01-01T08:00:00Z'), // previously triggered
      save: jest.fn().mockResolvedValue(true)
    };

    const mockGeofence = {
      id: 'geofence-1',
      user_id: mockUserId,
      name: 'Central Station',
      lat: geofenceCenterLat,
      lng: geofenceCenterLng,
      radius_m: geofenceRadius,
      is_active: true,
      reminders: [nonRecurringReminder, recurringReminder]
    };

    Geofence.findAll.mockResolvedValue([mockGeofence]);

    // Check location inside geofence
    const triggered = await checkUserGeofences(
      mockUserId,
      geofenceCenterLat,
      geofenceCenterLng,
      mockIo
    );

    expect(triggered).toHaveLength(2);

    // Non-recurring reminder deactivated
    expect(nonRecurringReminder.is_active).toBe(false);
    expect(nonRecurringReminder.save).toHaveBeenCalled();

    // Recurring reminder remains active
    expect(recurringReminder.is_active).toBe(true);
    expect(recurringReminder.save).toHaveBeenCalled();
  });
});
