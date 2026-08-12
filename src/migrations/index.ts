import * as migration_20260806_071631_drop_booking_reminder_sent_at from './20260806_071631_drop_booking_reminder_sent_at'
import * as migration_20260807_114500_drop_testimonials from './20260807_114500_drop_testimonials'
import * as migration_20260807_121800_drop_industries from './20260807_121800_drop_industries'
import * as migration_20260807_122400_drop_faqs from './20260807_122400_drop_faqs'
import * as migration_20260807_123000_drop_portfolio from './20260807_123000_drop_portfolio'
import * as migration_20260810_090000_roadmap_prototype from './20260810_090000_roadmap_prototype'

export const migrations = [
  {
    up: migration_20260806_071631_drop_booking_reminder_sent_at.up,
    down: migration_20260806_071631_drop_booking_reminder_sent_at.down,
    name: '20260806_071631_drop_booking_reminder_sent_at',
  },
  {
    up: migration_20260807_114500_drop_testimonials.up,
    down: migration_20260807_114500_drop_testimonials.down,
    name: '20260807_114500_drop_testimonials',
  },
  {
    up: migration_20260807_121800_drop_industries.up,
    down: migration_20260807_121800_drop_industries.down,
    name: '20260807_121800_drop_industries',
  },
  {
    up: migration_20260807_122400_drop_faqs.up,
    down: migration_20260807_122400_drop_faqs.down,
    name: '20260807_122400_drop_faqs',
  },
  {
    up: migration_20260807_123000_drop_portfolio.up,
    down: migration_20260807_123000_drop_portfolio.down,
    name: '20260807_123000_drop_portfolio',
  },
  {
    up: migration_20260810_090000_roadmap_prototype.up,
    down: migration_20260810_090000_roadmap_prototype.down,
    name: '20260810_090000_roadmap_prototype',
  },
]
