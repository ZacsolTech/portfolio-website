import * as migration_20260806_071631_drop_booking_reminder_sent_at from './20260806_071631_drop_booking_reminder_sent_at'

export const migrations = [
  {
    up: migration_20260806_071631_drop_booking_reminder_sent_at.up,
    down: migration_20260806_071631_drop_booking_reminder_sent_at.down,
    name: '20260806_071631_drop_booking_reminder_sent_at',
  },
]
