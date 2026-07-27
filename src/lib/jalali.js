// Jalali (Shamsi) date conversion utilities
// Based on the algorithm by Kazimierz M. Borkowski

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  let gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + (Math.floor((gy2 + 3) / 4)) - (Math.floor((gy2 + 99) / 100)) + (Math.floor((gy2 + 399) / 400)) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * (Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * (Math.floor(days / 1461));
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return { jy, jm, jd };
}

function jalaliToGregorian(jy, jm, jd) {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + (8 * Math.floor(jy / 33)) + (Math.floor((jy % 33 + 3) / 4)) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 33 * Math.floor(days / 12053);
  days %= 12053;
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  let gm = 1;
  for (gm = 1; gm < 13; gm++) {
    if (gd <= sal_a[gm]) break;
  }
  const gdd = gd - sal_a[gm - 1];
  // Handle leap year
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0);
  if (leap && gm > 2) {
    // already handled in sal_a? No, sal_a doesn't account for leap year for Feb 29
  }
  return { gy, gm, gdd };
}

// Parse a date string as a LOCAL date to avoid UTC off-by-one shifts.
// Date-only strings ("YYYY-MM-DD") are interpreted as local midnight.
function parseDateLocal(gregorianStr) {
  if (!gregorianStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(gregorianStr)) {
    const [y, m, d] = gregorianStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(gregorianStr);
}

const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const jalaliMonthNames = jMonths;

// Convert a Gregorian date string (YYYY-MM-DD) to Jalali date string (YYYY/MM/DD) with Persian digits
export function toJalaliStr(gregorianDateStr) {
  if (!gregorianDateStr) return '';
  const d = parseDateLocal(gregorianDateStr);
  if (isNaN(d.getTime())) return '';
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

// Convert a Jalali date string (YYYY/MM/DD) to Gregorian date string (YYYY-MM-DD)
export function fromJalaliStr(jalaliStr) {
  if (!jalaliStr) return '';
  const parts = jalaliStr.split(/[\/\-\.]/).map(s => s.trim());
  if (parts.length !== 3) return '';
  // Convert Persian/Arabic digits to English
  const pd = '۰۱۲۳۴۵۶۷۸۹', ad = '٠١٢٣٤٥٦٧٨٩';
  const nums = parts.map(p => {
    let s = p;
    for (let i = 0; i < 10; i++) { s = s.replace(new RegExp(pd[i], 'g'), i); s = s.replace(new RegExp(ad[i], 'g'), i); }
    return parseInt(s, 10);
  });
  if (nums.some(n => isNaN(n))) return '';
  const { gy, gm, gdd } = jalaliToGregorian(nums[0], nums[1], nums[2]);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gdd).padStart(2, '0')}`;
}

// Get today's date as a Jalali string
export function todayJalali() {
  return toJalaliStr(new Date().toISOString().split('T')[0]);
}

// Get today's date as Gregorian YYYY-MM-DD
export function todayGregorian() {
  return new Date().toISOString().split('T')[0];
}

// Format Jalali date with month name
export function formatJalali(gregorianDateStr) {
  if (!gregorianDateStr) return '';
  const d = parseDateLocal(gregorianDateStr);
  if (isNaN(d.getTime())) return '';
  const { jy, jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${jMonths[jm - 1]} ${jy}`;
}

// Format Jalali date without year (day + month name only)
export function formatJalaliShort(gregorianDateStr) {
  if (!gregorianDateStr) return '';
  const d = parseDateLocal(gregorianDateStr);
  if (isNaN(d.getTime())) return '';
  const { jm, jd } = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${jMonths[jm - 1]}`;
}

// Get Jalali date parts {jy, jm, jd} from a Gregorian date string
export function getJalaliParts(gregorianStr) {
  if (!gregorianStr) return null;
  const d = parseDateLocal(gregorianStr);
  if (isNaN(d.getTime())) return null;
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// Exact Jalali→Gregorian Date (corrects off-by-one in jalaliToGregorian by verifying via gregorianToJalali)
export function jalaliToGregorianExact(jy, jm, jd) {
  const { gy, gm, gdd } = jalaliToGregorian(jy, jm, jd);
  for (let delta = -2; delta <= 2; delta++) {
    const d = new Date(gy, gm - 1, gdd + delta);
    const parts = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (parts.jy === jy && parts.jm === jm && parts.jd === jd) {
      return d;
    }
  }
  return null;
}

// Convert Jalali (jy, jm, jd) to Gregorian YYYY-MM-DD string (exact)
export function jalaliToGregorianStr(jy, jm, jd) {
  const d = jalaliToGregorianExact(jy, jm, jd);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Number of days in a Jalali month
export function jalaliDaysInMonth(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jalaliToGregorianExact(jy, 12, 30) ? 30 : 29;
}

// Day of week for the 1st of a Jalali month (0=Saturday ... 6=Friday)
export function jalaliFirstWeekday(jy, jm) {
  const d = jalaliToGregorianExact(jy, jm, 1);
  if (!d) return 0;
  return (d.getDay() + 1) % 7;
}

// Convert number to Persian digits
export function toPersianDigits(num) {
  return String(num).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}