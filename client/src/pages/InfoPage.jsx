import { ClubsHeader } from '@/pages/ClubsPage';

// The «درباره ما» and «تماس با ما» pages.
const ABOUT = 'بینابین، جاییست میان فضاها: نه کاملاً خصوصی و نه تماماً عمومی، فضایی از نوع سوم. مسیر جمعی برای بودن، برای کشف شکل‌های تازه‌ی کنار هم بودن. بینابین یک چیزی‌ست بین چیزها. حالا این چیزی می‌تواند بهانه‌ی یک ارتباط جدید باشد بین دو نفر غریبه، یک کارگاه هم‌آموزی بین دو رشته مختلف و حتی محلی برای باهم کارکردن. اینجا جایی است برای تمرین همراهی، شنیدن، فکرکردن و بازگرداندن حس تعلق به زندگی شهری. همه‌ی این‌ها، به لطف همان نقص امید که مختص انسان است، ممکن می‌شود. بینابین، جایی‌ست برای ملاقات، کار و اتفاق.';

// [label, shown value, link, left-to-right]
const CONTACT = [
  ['تلفن', '۰۹۱۲۵۱۱۲۸۱۸', 'tel:+989125112818'],
  ['نشانی', 'تهران، جمالزاده، تقاطع کوچه قدر، پلاک ۷۲، زنگ ۲'],
  ['ایمیل', 'nafisehmousavian@gmail.com', 'mailto:nafisehmousavian@gmail.com', true],
  ['اینستاگرام', 'beinabein.space', 'https://instagram.com/beinabein.space', true],
  ['کانال تلگرام', 'beinabein_space', 'https://t.me/beinabein_space', true],
];

function Page({ title, children }) {
  return (
    <div className="min-h-full bg-white text-black">
      <ClubsHeader />
      <main className="anim-rise mx-auto max-w-[480px] px-3 pb-20">
        <h1 className="mt-11 text-[36px] leading-[1.2]">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function AboutPage() {
  return (
    <Page title="درباره ما">
      <p className="mt-8 text-lg leading-9 text-justify">{ABOUT}</p>
    </Page>
  );
}

export function ContactPage() {
  return (
    <Page title="تماس با ما">
      <div className="mt-8">
        {CONTACT.map(([label, value, href, ltr]) => (
          <div key={label} className="flex items-start justify-between gap-4 border-b border-[#D9D9D9] py-4 text-base last:border-b-0">
            <span className="shrink-0 text-[#7A7879]">{label}</span>
            {href
              ? <a href={href} dir={ltr ? 'ltr' : undefined} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="min-w-0 break-words text-left underline">{value}</a>
              : <span className="min-w-0 text-left">{value}</span>}
          </div>
        ))}
      </div>
    </Page>
  );
}
