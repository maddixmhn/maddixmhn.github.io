export type Lang = "en" | "fa";

export const copy = {
  en: {
    title: "maddix | System designer for automation, AI and infrastructure",
    description:
      "Mohammad Mehrani designs complete systems: websites, n8n automations, AI agents, knowledge bases and the Linux infrastructure they run on.",
    nav: { work: "Work", nebula: "Nebula", join: "Join a project", contact: "Contact", other: "فارسی", otherHref: "/fa/", otherLang: "fa" },
    hero: "I design systems that keep working after I log off.",
    lead: "DevOps taught me what breaks in production. Now I design the whole thing: the site people use, the automations behind it, the knowledge it reads and the servers it runs on.",
    ctaWork: "See the work",
    ctaTalk: "Start a project",
    layers: [
      { name: "Interface", body: "The part people touch. Clinic sites, repair guides and shops that load fast on a phone and get found on Google.", tools: "Astro, React, Vue, ASP.NET" },
      { name: "Automation", body: "Work that no longer needs a person. A form reaches Telegram, a webhook starts a workflow, and a failed step tells someone.", tools: "n8n, Telegram bots, webhooks" },
      { name: "Knowledge", body: "Notes kept in Obsidian, linked so a model can find the right one and show where the answer came from.", tools: "Obsidian, retrieval, agent harnesses, MCP" },
      { name: "Infrastructure", body: "Linux servers and pipelines that deploy the same way every time, and roll back when they should.", tools: "Docker, Kubernetes, GitHub Actions, Terraform" },
    ],
    work: { title: "Selected work", visit: "Visit site", more: "Show more projects", less: "Show fewer projects" },
    nebula: {
      title: "Nebula",
      lead: "Nebula is my long-running project on knowledge and models: what happens when an assistant answers from a vault someone actually maintains, instead of from whatever it remembers.",
      steps: [
        { name: "Write", body: "Notes live in an Obsidian vault with stable links and metadata." },
        { name: "Connect", body: "Links and retrieval decide which notes matter for a question." },
        { name: "Answer", body: "The model replies from those notes and names its sources." },
      ],
      cta: "Build this with me",
    },
    join: {
      title: "Build with me",
      lead: "If you write code and one of these projects interests you, tell me what you would like to work on. I read every request and reply on the contact you leave.",
      projects: ["Nebula and the knowledge model", "Automation library for n8n", "ELON OS agent harness", "Client websites", "Something else"],
      name: "Your name",
      contact: "Email or Telegram",
      github: "GitHub profile (optional)",
      skills: "What you are good at",
      project: "Project",
      message: "What would you like to work on?",
      submit: "Send request",
      sending: "Sending",
      sent: "Request received. I will reply on the contact you gave.",
      failed: "The request was not sent. Your text is still here, so you can try again or email mohammad@iodeck.ir.",
      unavailable: "The form is not connected yet. Email mohammad@iodeck.ir instead.",
    },
    background: {
      title: "Background",
      jobs: [
        { when: "2023 to 2024", where: "ParsPack", what: "Infrastructure technical support" },
        { when: "2018 to 2023", where: "Tajhiz Niroo Zangan (TNZ Oil)", what: "Full-stack developer" },
        { when: "2019 to 2020", where: "Enermonde", what: "Support and maintenance" },
        { when: "2018 to 2019", where: "Sama Samaneh", what: "Software technical expert" },
      ],
    },
    contact: { title: "Have a system that needs designing?", lead: "Send a message from the box in the corner. It reaches me on Telegram, and my reply appears right there.", email: "Email" },
    chat: {
      open: "Open chat",
      close: "Close chat",
      ask: "Ask the assistant",
      message: "Message maddix",
      askHint: "Ask about my work, skills or how to reach me.",
      messageHint: "This goes straight to my Telegram. Keep this tab open to see the reply, or leave a contact.",
      input: "Write here",
      name: "Your name (optional)",
      reply: "Email or Telegram (optional)",
      send: "Send",
      sent: "Sent. I will reply here.",
      failed: "Not sent. Check your connection and try again.",
      noAi: "The assistant is unavailable right now. Use the message tab instead.",
      you: "You",
      offline: "Chat is not connected yet. Email mohammad@iodeck.ir.",
    },
    footer: "Mohammad Mehrani, Tehran",
  },
  fa: {
    title: "maddix | طراح سیستم، اتوماسیون، هوش مصنوعی و زیرساخت",
    description:
      "محمد مهرانی سیستم‌های کامل طراحی می‌کند: وب‌سایت، اتوماسیون n8n، عامل هوش مصنوعی، پایگاه دانش و زیرساخت لینوکسی که همهٔ این‌ها رویش اجرا می‌شود.",
    nav: { work: "نمونه‌کارها", nebula: "نبولا", join: "همکاری", contact: "تماس", other: "English", otherHref: "/", otherLang: "en" },
    hero: "سیستم‌هایی طراحی می‌کنم که وقتی من نیستم هم کار می‌کنند.",
    lead: "دواپس به من یاد داد چه چیزهایی در محیط واقعی خراب می‌شوند. حالا کل سیستم را طراحی می‌کنم: سایتی که مردم می‌بینند، اتوماسیون پشت آن، دانشی که از آن می‌خواند و سروری که رویش اجرا می‌شود.",
    ctaWork: "دیدن نمونه‌کارها",
    ctaTalk: "شروع پروژه",
    layers: [
      { name: "رابط کاربری", body: "بخشی که مردم با آن کار می‌کنند: سایت مطب، راهنمای تعمیر و فروشگاهی که روی موبایل سریع باز می‌شود و در گوگل پیدا می‌شود.", tools: "Astro، React، Vue، ASP.NET" },
      { name: "اتوماسیون", body: "کارهایی که دیگر به آدم نیاز ندارند. فرم به تلگرام می‌رسد، وبهوک یک گردش‌کار را راه می‌اندازد و اگر مرحله‌ای شکست بخورد، کسی خبردار می‌شود.", tools: "n8n، ربات تلگرام، وبهوک" },
      { name: "دانش", body: "یادداشت‌هایی در Obsidian که طوری به هم لینک شده‌اند که مدل بتواند یادداشت درست را پیدا کند و بگوید جوابش از کجا آمده.", tools: "Obsidian، بازیابی اطلاعات، هارنس عامل، MCP" },
      { name: "زیرساخت", body: "سرورهای لینوکسی و پایپ‌لاین‌هایی که هر بار یک‌جور دیپلوی می‌کنند و وقتی لازم باشد به نسخهٔ قبل برمی‌گردند.", tools: "Docker، Kubernetes، GitHub Actions، Terraform" },
    ],
    work: { title: "نمونه‌کارهای منتخب", visit: "مشاهدهٔ سایت", more: "نمایش پروژه‌های بیشتر", less: "نمایش کمتر" },
    nebula: {
      title: "نبولا",
      lead: "نبولا پروژهٔ بلندمدت من دربارهٔ دانش و مدل‌هاست: اینکه دستیار به‌جای آنچه از حفظ دارد، از پایگاه دانشی جواب بدهد که کسی واقعاً نگهداری‌اش می‌کند.",
      steps: [
        { name: "نوشتن", body: "یادداشت‌ها با لینک و متادیتای پایدار در Obsidian نگه داشته می‌شوند." },
        { name: "اتصال", body: "لینک‌ها و بازیابی مشخص می‌کنند کدام یادداشت به سؤال مربوط است." },
        { name: "پاسخ", body: "مدل از روی همان یادداشت‌ها جواب می‌دهد و منبعش را می‌گوید." },
      ],
      cta: "با هم بسازیمش",
    },
    join: {
      title: "با من بساز",
      lead: "اگر کدنویسی می‌کنی و یکی از این پروژه‌ها برایت جذاب است، بگو دوست داری روی چه کاری وقت بگذاری. همهٔ درخواست‌ها را می‌خوانم و از راهی که گذاشته‌ای جواب می‌دهم.",
      projects: ["نبولا و مدل دانش", "کتابخانهٔ اتوماسیون n8n", "هارنس عامل ELON OS", "سایت‌های مشتریان", "موضوع دیگر"],
      name: "نام شما",
      contact: "ایمیل یا تلگرام",
      github: "پروفایل GitHub (اختیاری)",
      skills: "در چه کارهایی خوب هستی؟",
      project: "پروژه",
      message: "دوست داری روی چه چیزی کار کنی؟",
      submit: "ارسال درخواست",
      sending: "در حال ارسال",
      sent: "درخواستت رسید. از راهی که گذاشته‌ای جواب می‌دهم.",
      failed: "درخواست ارسال نشد. متنت همین‌جا مانده؛ دوباره امتحان کن یا به mohammad@iodeck.ir ایمیل بزن.",
      unavailable: "فرم هنوز وصل نشده است. لطفاً به mohammad@iodeck.ir ایمیل بزن.",
    },
    background: {
      title: "سوابق",
      jobs: [
        { when: "۲۰۲۳ تا ۲۰۲۴", where: "پارس‌پک", what: "پشتیبان فنی زیرساخت" },
        { when: "۲۰۱۸ تا ۲۰۲۳", where: "تجهیز نیرو زنگان (TNZ Oil)", what: "توسعه‌دهندهٔ فول‌استک" },
        { when: "۲۰۱۹ تا ۲۰۲۰", where: "انرموند", what: "پشتیبانی و نگهداری سرویس" },
        { when: "۲۰۱۸ تا ۲۰۱۹", where: "سما سامانه", what: "کارشناس فنی نرم‌افزار" },
      ],
    },
    contact: { title: "سیستمی داری که باید طراحی شود؟", lead: "از کادر گوشهٔ صفحه پیام بفرست. پیامت در تلگرام به من می‌رسد و جوابم همان‌جا نمایش داده می‌شود.", email: "ایمیل" },
    chat: {
      open: "باز کردن گفتگو",
      close: "بستن گفتگو",
      ask: "پرسش از دستیار",
      message: "پیام به maddix",
      askHint: "دربارهٔ کارها، مهارت‌ها یا راه تماس با من بپرس.",
      messageHint: "این پیام مستقیم به تلگرامم می‌رسد. برای دیدن جواب این صفحه را باز نگه دار یا راه تماس بگذار.",
      input: "اینجا بنویس",
      name: "نام (اختیاری)",
      reply: "ایمیل یا تلگرام (اختیاری)",
      send: "ارسال",
      sent: "ارسال شد. جواب را همین‌جا می‌بینی.",
      failed: "ارسال نشد. اتصال را بررسی کن و دوباره امتحان کن.",
      noAi: "دستیار الان در دسترس نیست. از بخش پیام استفاده کن.",
      you: "شما",
      offline: "گفتگو هنوز وصل نشده است. به mohammad@iodeck.ir ایمیل بزن.",
    },
    footer: "محمد مهرانی، تهران",
  },
} as const;

export type Copy = (typeof copy)[Lang];

type Text = Record<Lang, string>;

export interface Project {
  id: string;
  name: Text;
  url?: string;
  host?: string;
  kind?: Text;
  note?: Text;
}

export const featured: Project[] = [
  {
    id: "drkimiah",
    name: { en: "Dr Kimia Habibi", fa: "دکتر کیمیا حبیبی" },
    url: "https://drkimiah.ir",
    host: "drkimiah.ir",
    kind: { en: "Physiotherapy and physical medicine, Robat Karim", fa: "فیزیوتراپی و طب فیزیکی در رباط‌کریم" },
    note: { en: "A practice website where patients can learn about the clinic and find their way to it.", fa: "وب‌سایت مطب که بیمار از آن با خدمات و راه رسیدن به مطب آشنا می‌شود." },
  },
  {
    id: "bahartamir",
    name: { en: "Bahar System", fa: "بهار سیستم" },
    url: "https://bahartamir.com",
    host: "bahartamir.com",
    kind: { en: "Car audio and monitor repair", fa: "تعمیر مانیتور و سیستم صوتی خودرو" },
    note: { en: "Saeed Bahar's documented repair cases and troubleshooting guides, connected to service intake.", fa: "تجربه‌های مستند تعمیر و راهنماهای عیب‌یابی سعید بهار، متصل به پذیرش خدمات." },
  },
  {
    id: "shiktak",
    name: { en: "Shiktak", fa: "شیک‌تک" },
    url: "https://shiktak.com",
    host: "shiktak.com",
    kind: { en: "Print-on-demand streetwear store", fa: "فروشگاه پوشاک با چاپ سفارشی" },
    note: { en: "Original artwork on tees, hoodies and caps, with PayPal and Stripe checkout and worldwide shipping.", fa: "طرح‌های اورجینال روی تی‌شرت، هودی و کلاه، با پرداخت PayPal و Stripe و ارسال جهانی." },
  },
];

const same = (value: string): Text => ({ en: value, fa: value });

export const more: Project[] = [
  { id: "surinsf", name: { en: "Surin Sanat Farzan", fa: "سورین صنعت فرزان" }, url: "https://surinsf.com" },
  { id: "tehransuzuki", name: { en: "Tehran Suzuki", fa: "تهران سوزوکی" }, url: "https://tehransuzuki.ir" },
  { id: "alefparvaz", name: { en: "Alef Parvaz", fa: "الف پرواز" }, url: "https://alefparvaz.com" },
  { id: "iodeck", name: same("IoDeck"), url: "https://iodeck.ir" },
  { id: "kurtviana", name: same("Kurt Viana Transportes"), url: "https://kurtviana.com" },
  { id: "baharaudio", name: same("BaharAudio") },
  { id: "balerion", name: same("Balerion"), url: "https://dashyar.vercel.app" },
  { id: "panahyar", name: same("Immigration Journey"), url: "https://pyar-phi.vercel.app" },
  { id: "rhaegal", name: same("WebStruct"), url: "https://maddixmhn-rhaegal.vercel.app" },
  { id: "dreamfyre", name: same("Dreamfyre"), url: "https://vermitor.vercel.app" },
  { id: "maddixtools", name: same("Maddix Tools") },
];
