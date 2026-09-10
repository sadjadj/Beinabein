# Beinabein API reference

Everything `client/` and `dashboard/` can call on `api/` — routes, auth, and every entity's
fields. Generated from `api/base44-entities/*.jsonc` (the source of truth for the data model) —
regenerate this file's entity tables if those change.

## How it works

One generic route handles all 36 entity types below — there's no per-entity endpoint, `:name` in
the URL is the entity name (e.g. `Workshop`, `Person`). Records are JSON objects; `id` and
`created_date` are set by the server, not sent by the client.

## Auth

Two tiers, no signup/login page — just HTTP Basic Auth (the browser's native prompt):

- **Public** (no auth): listed below, used only by `client/` (the signup flow).
- **Admin**: everything else. Send `Authorization: Basic base64(username:password)` — credentials
  are one of the `ADMIN_USERS` pairs set as a Hamravesh env var. `GET /api/me` returns
  `{ user: "<username>" }` on success, `401 { error: "unauthorized" }` otherwise.

### Public routes

| Method | Path | Entity | Action |
|---|---|---|---|
| GET | `/api/entities/Workshop` | Workshop | list |
| GET | `/api/entities/Workshop/:id` | Workshop | get |
| POST | `/api/entities/Person` | Person | create |
| POST | `/api/entities/WorkshopPurchase` | WorkshopPurchase | create |

Everything else (any other entity, or any write to Workshop) requires admin auth.

## Routes

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/entities/:name?sort=-created_date&limit=500` | — | `Record[]` |
| GET | `/api/entities/:name/:id` | — | `Record` or `404` |
| POST | `/api/entities/:name` | record fields | `201 Record` |
| POST | `/api/entities/:name/bulk` | `Record[]` (no ids) | `201 Record[]` |
| POST | `/api/entities/:name/filter` | `{ field: value \| { $in: [...] } }` | `Record[]` |
| PUT | `/api/entities/:name/:id` | partial patch (shallow merge) | `Record` or `404` |
| PATCH | `/api/entities/:name/many` | `{ filter, set }` | `{ updated: number }` |
| DELETE | `/api/entities/:name/:id` | — | `204` or `404` |
| DELETE | `/api/entities/:name/many` | filter object | `{ deleted: number }` |
| GET | `/api/me` | — (admin) | `{ user: string }` or `401` |
| GET | `/healthz` | — | `{ ok: true }` |

`sort`/filter field names refer to keys inside the record (e.g. `-created_date`, `-purchase_date`),
not real SQL columns — the server stores each record as one JSON blob per row.

### Client shape (already built)

Both `dashboard/src/api/base44Client.js` and `client/src/api/client.js` wrap these routes — call
those instead of `fetch` directly:

```js
// dashboard (admin, all 36 entities + auth)
base44.entities.Workshop.list('-created_date', 500)
base44.entities.Person.create({ full_name, phone })
base44.auth.me()

// client (public, 3 routes only)
api.listWorkshops()
api.createPerson({ full_name, phone })
```

## Entities

### Artist

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `full_name` | string | yes | نام و نام خانوادگی |  |
| `phone` | string |  | شماره تماس |  |
| `social_id` | string |  | آیدی شبکه اجتماعی |  |
| `brand_name` | string |  | نام برند |  |
| `description` | string |  | توضیحات و معرفی |  |

### Brand

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `full_name` | string | yes | نام و نام خانوادگی |  |
| `phone` | string |  | شماره تماس |  |
| `social_id` | string |  | آیدی شبکه اجتماعی |  |
| `collaboration_tags` | array<string> |  | تگ‌های همکاری | default: [] |
| `product_type` | string |  | نوع محصول/اثر |  |
| `brand_name` | string |  | نام برند |  |
| `liaison_position` | string |  | سمت رابط |  |
| `description` | string |  | توضیحات و معرفی |  |

### CafeTag

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام تگ |  |

### Category

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام کتگوری |  |

### CustomIncome

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `title` | string |  | شرح درآمد |  |
| `person_name` | string | yes | نام مشتری |  |
| `person_phone` | string | yes | شماره تماس |  |
| `amount` | number |  | مبلغ | default: 0 |
| `quantity` | number |  | تعداد | default: 1 |
| `purchase_date` | string | yes | تاریخ پرداخت | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, free, azno; default: "cash" |
| `how_met` | string |  | نحوه آشنایی | enum: instagram, telegram, referral, friends, facilitator, event, introduction, other; default: "other" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `description` | string |  | توضیحات |  |

### Event

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `title` | string | yes | اسم رخداد |  |
| `price` | number |  | قیمت | default: 0 |
| `session_count` | number |  | تعداد جلسه |  |
| `description` | string |  | توضیحات |  |
| `tags` | string |  | تگ |  |
| `space` | string |  | فضای برگزاری |  |
| `start_time` | string |  | ساعت شروع |  |
| `end_time` | string |  | ساعت پایان |  |
| `day_of_week` | string |  | روز رخداد |  |
| `start_date` | string |  | تاریخ شروع | format: date |
| `end_date` | string |  | تاریخ پایان | format: date |
| `session_dates` | array<string> |  | تاریخ جلسات | default: [] |
| `capacity` | number |  | ظرفیت |  |
| `is_ended` | boolean |  | پایان یافته | default: false |

### EventPlan

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `event_id` | string | yes | رخداد |  |
| `name` | string | yes | نام مدل ثبت‌نام |  |
| `price_min` | number | yes | کران پایین قیمت | default: 0 |
| `price_max` | number | yes | کران بالای قیمت | default: 0 |
| `is_active` | boolean |  | فعال | default: true |

### EventPurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `event_id` | string | yes | رخداد |  |
| `event_title` | string |  | نام رخداد |  |
| `plan_name` | string |  | مدل ثبت‌نام |  |
| `price` | number |  | مبلغ فاکتور | default: 0 |
| `donation` | number |  | دونیشن | default: 0 |
| `person_name` | string |  | نام کاربر |  |
| `person_phone` | string | yes | شماره تلفن |  |
| `quantity` | number |  | تعداد | default: 1 |
| `purchase_date` | string | yes | تاریخ خرید | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, azno; default: "cash" |
| `how_met` | string |  | نحوه آشنایی | enum: instagram, telegram, referral, friends, facilitator, event, introduction, other; default: "other" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `description` | string |  | توضیحات |  |

### Expense

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `title` | string | yes | عنوان هزینه |  |
| `amount` | number | yes | مبلغ | default: 0 |
| `category` | string |  | دسته‌بندی | enum: repairs, daily, facilitator_payment, cafe_purchase, kitchen_purchase; default: "daily" |
| `date` | string | yes | تاریخ | format: date |
| `description` | string |  | توضیحات |  |
| `facilitator_id` | string |  | تسهیلگر |  |
| `facilitator_name` | string |  | نام تسهیلگر |  |

### Facilitator

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `full_name` | string | yes | نام و نام خانوادگی |  |
| `bio` | string |  | معرفی تسهیلگر |  |
| `phone` | string | yes | شماره تماس |  |
| `social_id` | string |  | آیدی شبکه اجتماعی |  |
| `brand_name` | string |  | نام برند |  |
| `card_number` | string |  | شماره کارت |  |
| `profit_percentage` | number |  | درصد سود تسهیلگر |  |
| `sheba_number` | string |  | شماره شبا |  |

### GreenhouseCategory

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام کتگوری |  |

### GreenhouseItem

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام آیتم |  |
| `category` | string |  | کتگوری |  |
| `price` | number | yes | قیمت | default: 0 |
| `brand` | string |  | برند |  |
| `stock_quantity` | number |  | تعداد موجودی | default: 0 |
| `is_visible` | boolean |  | نمایش در ثبت فروش | default: true |

### GreenhousePurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `person_name` | string |  | نام خریدار |  |
| `person_phone` | string | yes | شماره تماس خریدار |  |
| `item_id` | string |  | آیتم |  |
| `item_name` | string | yes | نام آیتم |  |
| `item_price` | number |  | قیمت آیتم | default: 0 |
| `quantity` | number |  | تعداد | default: 1 |
| `discount` | number |  | درصد تخفیف | default: 0 |
| `purchase_date` | string | yes | تاریخ فروش | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, azno; default: "cash" |
| `purchase_reason` | string |  | دلیل حضور | enum: workshop, workspace, event, independent; default: "independent" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `invoice_id` | string |  | شماره فاکتور |  |

### Group

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `title` | string | yes | اسم گروه |  |
| `description` | string |  | توضیحات گروه |  |
| `tags` | string |  | تگ گروه |  |
| `facilitator_ids` | array<string> |  | تسهیلگران | default: [] |
| `space` | string |  | فضای برگزاری |  |
| `schedule` | array<object> |  | برنامه هفتگی | default: [] |
| `start_date` | string |  | تاریخ شروع | format: date |
| `capacity` | number |  | ظرفیت |  |
| `facilitator_percentage` | number |  | درصد تسهیلگر |  |
| `is_ended` | boolean |  | پایان یافته | default: false |
| `ended_at` | string |  | تاریخ پایان | format: date |

### GroupPlan

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `group_id` | string | yes | گروه |  |
| `name` | string | yes | نام مدل ثبت‌نام |  |
| `price_min` | number | yes | کران پایین قیمت | default: 0 |
| `price_max` | number | yes | کران بالای قیمت | default: 0 |
| `is_active` | boolean |  | فعال | default: true |

### GroupPurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `group_id` | string | yes | گروه |  |
| `group_title` | string |  | اسم گروه |  |
| `month` | string | yes | ماه ثبت‌نام |  |
| `price` | number |  | قیمت | default: 0 |
| `donation` | number |  | دونیشن | default: 0 |
| `plan_name` | string |  | مدل ثبت‌نام |  |
| `person_name` | string |  | اسم کاربر |  |
| `person_phone` | string | yes | شماره تلفن |  |
| `quantity` | number |  | تعداد | default: 1 |
| `purchase_date` | string | yes | تاریخ خرید | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, azno; default: "cash" |
| `how_met` | string |  | نحوه آشنایی | enum: instagram, telegram, referral, friends, facilitator, event, introduction, other; default: "other" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `description` | string |  | توضیحات |  |

### GroupSession

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `group_id` | string | yes | گروه |  |
| `group_title` | string |  | اسم گروه |  |
| `session_number` | number | yes | شماره جلسه |  |
| `session_date` | string | yes | تاریخ جلسه | format: date |
| `month` | string | yes | ماه |  |
| `present_phones` | array<string> |  | حاضران | default: [] |

### InventoryItem

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | اسم آیتم |  |
| `category` | string |  | کتگوری |  |
| `price` | number | yes | قیمت | default: 0 |
| `brand` | string |  | برند |  |
| `tags` | array<string> |  | تگ‌ها | default: [] |
| `is_visible` | boolean |  | نمایش در لیست خرید | default: true |

### ItemPurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `person_name` | string |  | اسم کاربر |  |
| `person_phone` | string | yes | شماره تلفن کاربر |  |
| `item_name` | string | yes | آیتم خریداری شده |  |
| `item_price` | number |  | قیمت آیتم | default: 0 |
| `quantity` | number |  | تعداد | default: 1 |
| `discount` | number |  | درصد تخفیف | default: 0 |
| `purchase_date` | string | yes | تاریخ خرید | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, free, azno; default: "cash" |
| `purchase_reason` | string |  | دلیل خرید | enum: workshop, workspace, event, independent; default: "independent" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `invoice_id` | string |  | شناسه فاکتور |  |

### Person

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `full_name` | string |  | نام و نام خانوادگی |  |
| `phone` | string |  | شماره تلفن |  |
| `how_met` | string |  | نحوه آشنایی | enum: instagram, telegram, referral, friends, facilitator, event, introduction, other |
| `age` | number |  | سن |  |
| `gender` | string |  | جنسیت | enum: male, female |
| `first_usage` | string |  | اولین استفاده | format: date |
| `notes` | string |  | یادداشت |  |
| `tags` | array<string> |  | تگ‌ها | default: [] |
| `social_id` | string |  | آیدی شبکه اجتماعی |  |

### Returns

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `person_name` | string |  | نام مشتری |  |
| `person_phone` | string | yes | شماره تلفن مشتری |  |
| `item_name` | string |  | آیتم مرجوعی |  |
| `amount` | number |  | مبلغ بازگشتی | default: 0 |
| `return_date` | string | yes | تاریخ بازگشت | format: date |
| `reason` | string |  | دلیل بازگشت |  |
| `is_refunded` | boolean |  | بازگشت وجه انجام شد | default: false |

### SalesEvent

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `title` | string | yes | نام ایونت |  |
| `start_date` | string | yes | تاریخ شروع | format: date |
| `end_date` | string | yes | تاریخ پایان | format: date |
| `description` | string |  | توضیحات |  |

### SalesEventCategory

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `event_id` | string | yes | ایونت |  |
| `name` | string | yes | نام کتگوری |  |

### SalesEventItem

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `event_id` | string | yes | ایونت |  |
| `name` | string | yes | نام آیتم |  |
| `category` | string |  | کتگوری |  |
| `brand` | string |  | برند |  |
| `price` | number | yes | قیمت | default: 0 |
| `stock_quantity` | number |  | موجودی | default: 0 |
| `is_visible` | boolean |  | نمایش در ثبت فروش | default: true |

### SalesEventPurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `event_id` | string |  | ایونت |  |
| `event_title` | string |  | نام ایونت |  |
| `person_name` | string |  | نام خریدار |  |
| `person_phone` | string | yes | شماره تماس خریدار |  |
| `item_id` | string |  | آیتم |  |
| `item_name` | string | yes | نام آیتم |  |
| `item_price` | number |  | قیمت آیتم | default: 0 |
| `quantity` | number |  | تعداد | default: 1 |
| `discount` | number |  | درصد تخفیف | default: 0 |
| `brand` | string |  | برند |  |
| `purchase_date` | string | yes | تاریخ فروش | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, azno; default: "cash" |
| `purchase_reason` | string |  | دلیل حضور | enum: workshop, workspace, event, independent; default: "independent" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `invoice_id` | string |  | شماره فاکتور |  |

### Space

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | اسم فضا |  |
| `normal_capacity` | number |  | ظرفیت عادی | default: 0 |
| `plus_capacity` | number |  | ظرفیت پلاس | default: 0 |

### StoreCategory

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام کتگوری |  |

### StoreItem

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام آیتم |  |
| `category` | string |  | کتگوری |  |
| `price` | number | yes | قیمت | default: 0 |
| `brand` | string |  | برند |  |
| `stock_quantity` | number |  | تعداد موجودی | default: 0 |
| `is_visible` | boolean |  | نمایش در ثبت فروش | default: true |

### StorePurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `person_name` | string |  | نام خریدار |  |
| `person_phone` | string | yes | شماره تماس خریدار |  |
| `item_id` | string |  | آیتم |  |
| `item_name` | string | yes | نام آیتم |  |
| `item_price` | number |  | قیمت آیتم | default: 0 |
| `quantity` | number |  | تعداد | default: 1 |
| `discount` | number |  | درصد تخفیف | default: 0 |
| `purchase_date` | string | yes | تاریخ فروش | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, azno; default: "cash" |
| `purchase_reason` | string |  | دلیل حضور | enum: workshop, workspace, event, independent; default: "independent" |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `invoice_id` | string |  | شماره فاکتور |  |

### User

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `role` | string | yes |  | enum: admin, executive, user |

### Workshop

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `title` | string | yes | اسم کارگاه |  |
| `price` | number |  | قیمت | default: 0 |
| `session_count` | number |  | تعداد جلسه |  |
| `is_permanent` | boolean |  | دائمی | default: false |
| `description` | string |  | توضیحات کارگاه |  |
| `tags` | string |  | تگ کارگاه |  |
| `facilitator_ids` | array<string> |  | تسهیلگران | default: [] |
| `space` | string |  | فضای برگزاری |  |
| `start_time` | string |  | ساعت شروع |  |
| `end_time` | string |  | ساعت پایان |  |
| `day_of_week` | string |  | روز کارگاه |  |
| `start_date` | string |  | تاریخ شروع | format: date |
| `end_date` | string |  | تاریخ پایان | format: date |
| `session_dates` | array<string> |  | تاریخ جلسات | default: [] |
| `facilitator_percentage` | number |  | درصد تسهیلگر |  |
| `facilitator_paid` | boolean |  | پرداخت تسهیلگر | default: false |
| `capacity` | number |  | ظرفیت |  |
| `is_ended` | boolean |  | پایان یافته | default: false |

### WorkshopPlan

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `workshop_id` | string | yes | کارگاه |  |
| `name` | string | yes | نام مدل ثبت‌نام |  |
| `price_min` | number | yes | کران پایین قیمت | default: 0 |
| `price_max` | number | yes | کران بالای قیمت | default: 0 |
| `is_active` | boolean |  | فعال | default: true |

### WorkshopPurchase

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `workshop_id` | string | yes | کارگاه |  |
| `workshop_title` | string |  | اسم کارگاه |  |
| `price` | number |  | قیمت | default: 0 |
| `donation` | number |  | دونیشین | default: 0 |
| `plan_name` | string |  | مدل ثبت‌نام |  |
| `person_name` | string |  | اسم کاربر |  |
| `person_phone` | string | yes | شماره تلفن |  |
| `quantity` | number |  | تعداد | default: 1 |
| `purchase_date` | string | yes | تاریخ خرید | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, azno; default: "cash" |
| `how_met` | string |  | نحوه آشنایی | enum: instagram, telegram, referral, friends, facilitator, event, introduction, other; default: "other" |
| `is_installment` | boolean |  | خرید قسطی | default: false |
| `is_paid` | boolean |  | پرداخت شده | default: false |
| `registered_sessions` | number |  | تعداد جلسات ثبت‌نامی |  |
| `description` | string |  | توضیحات |  |
| `registration_type` | string |  | نوع ثبت‌نام | enum: full, single; default: "full" |
| `selected_sessions` | array<number> |  | جلسات انتخابی | default: [] |

### WorkshopSession

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `workshop_id` | string | yes | کارگاه |  |
| `workshop_title` | string |  | اسم کارگاه |  |
| `session_number` | number | yes | شماره جلسه |  |
| `session_date` | string | yes | تاریخ جلسه | format: date |
| `present_phones` | array<string> |  | حاضرین | default: [] |

### WorkspaceOrder

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `subscription_id` | string |  | اشتراک |  |
| `subscription_name` | string |  | نام اشتراک |  |
| `price` | number |  | قیمت | default: 0 |
| `person_name` | string |  | اسم مشتری |  |
| `person_phone` | string | yes | شماره تلفن |  |
| `quantity` | number |  | تعداد | default: 1 |
| `purchase_date` | string | yes | تاریخ خرید | format: date |
| `payment_method` | string |  | مدل پرداخت | enum: online, card_to_card, cash, free, azno; default: "cash" |
| `entry_time` | string |  | زمان ورود |  |
| `usage_start_date` | string |  | تاریخ شروع استفاده | format: date |
| `usage_date` | string |  | تاریخ استفاده | format: date |
| `usage_dates` | array<string> |  | روزهای رزرو شده | default: [] |
| `how_met` | string |  | مدل آشنایی | enum: instagram, telegram, referral, friends, facilitator, event, introduction, other; default: "other" |
| `is_paid` | boolean |  | پرداخت شده | default: false |

### WorkspaceSubscription

| Field | Type | Required | Title (fa) | Notes |
|---|---|---|---|---|
| `name` | string | yes | نام اشتراک |  |
| `price` | number | yes | قیمت | default: 0 |
| `subscription_days` | number |  | تعداد روزهای اشتراک | default: 1 |
