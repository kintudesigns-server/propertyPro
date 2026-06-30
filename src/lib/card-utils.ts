export function validateLuhn(number: string): boolean {
  const digits = number.replace(/\D/g, "");
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(value: string): string {
  const v = value.replace(/\D/g, "");
  const isAmex = /^3[47]/.test(v);
  const parts = [];
  
  if (isAmex) {
    if (v.length > 0) parts.push(v.substring(0, 4));
    if (v.length > 4) parts.push(v.substring(4, 10));
    if (v.length > 10) parts.push(v.substring(10, 15));
  } else {
    for (let i = 0; i < v.length; i += 4) {
      parts.push(v.substring(i, i + 4));
    }
  }
  return parts.join(" ");
}

export function detectCardBrand(number: string): string {
  const v = number.replace(/\D/g, "");
  if (/^4/.test(v)) return "visa";
  if (/^5[1-5]/.test(v) || /^2[2-7]/.test(v)) return "mastercard";
  if (/^3[47]/.test(v)) return "amex";
  if (/^6(?:011|5)/.test(v)) return "discover";
  if (/^3(?:0[0-5]|[68])/.test(v)) return "diners";
  if (/^(?:2131|1800|35)/.test(v)) return "jcb";
  return "card";
}

export function validateExpiry(month: string, year: string): boolean {
  if (!month || !year) return false;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  
  if (y < currentYear) return false;
  if (y === currentYear && m < currentMonth) return false;
  return true;
}
