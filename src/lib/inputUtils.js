// Input sanitization utilities

const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
const arabicDigits = '٠١٢٣٤٥٦٧٨٩';

export function persianToEnglish(str) {
  if (!str) return '';
  let result = String(str);
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), String(i));
    result = result.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return result;
}

// Phone: only digits, max 11, must start with 0
export function sanitizePhone(value) {
  let digits = persianToEnglish(value).replace(/[^0-9]/g, '');
  if (digits.length > 0 && digits[0] !== '0') {
    digits = '0' + digits;
  }
  return digits.substring(0, 11);
}

// Name: only letters (Persian, Arabic, English) and spaces
export function sanitizeName(value) {
  return value.replace(/[0-9۰-۹٠-٩]/g, '');
}