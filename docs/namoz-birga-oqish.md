# «Birga o‘qish» va «Birga takrorlash» rejimlari

`/namoz-organish/:slug` dars sahifasiga qo‘shilgan ikki rejim. Eski dars sahifasi o‘zgarmagan:
rejim faqat `?rejim=birga-oqish` yoki `?rejim=birga-takrorlash` bo‘lganda ochiladi, chiqilganda
oddiy dars qaytadi.

| Rejim | Vazifasi |
|---|---|
| **Birga o‘qish** | Haqiqiy namoz uchun ovozsiz, qo‘l tegizmasdan ishlaydigan vizual yordamchi |
| **Birga takrorlash** | Mashq: namuna audiosini tinglash, ovoz chiqarib o‘qish, tanilgan so‘zlarni ko‘rish |

Hozircha qo‘llanadi: **Bomdod, Peshin, Asr, Shom, Xufton, Vitr** (farz/vojib tartibi).
Juma, Hayit, Tahajjud, Nafl — dars qadamlari ketma-ketlik uchun tuzilmagan, kartalar ko‘rinmaydi.

## Arxitektura

### Backend (Django REST Framework)

| Fayl | Nima qiladi |
|---|---|
| `apps/learning/birga.py` | Ketma-ketlikni **tasdiqlangan** dars qadamlaridan deterministik quradi; sozlamalar va ogohlantirish matni |
| `apps/learning/views.py` → `birga_view` | `GET /api/namoz-organish/<slug>/birga/` |
| `apps/learning/serializers.py` | Dars javobiga `birga_supported` maydoni qo‘shildi |
| `apps/learning/tests_birga.py` | Ketma-ketlik testlari |

Yangi model va migratsiya **yo‘q** — mavjud `PrayerCategory`, `LessonStep`, `Recitation` va
`apps.quran.Ayah` (Tanzil arabcha matni) ishlatiladi.

**Ketma-ketlik qoidasi:** har bir rakat Fotiha o‘qiladigan qadamdan boshlanadi. Birinchi va ikkinchi
Fotiha qadamlari orasidagi qadamlar (ruku’, qavma, sajda, jalsa) har rakatdan keyin takrorlanadi.
Zam sura Fotihadan keyin darhol keladi (Vitrda — Qunutdan oldin). Niyatdan oldingi tayyorgarlik
qadamlari kirmaydi. Tuzilmani tanib bo‘lmasa — `supported: false`.

**Harakat bosqichlarida faqat zikr:** ruku', qavma, sajda va jalsada ekranda faqat o'qiladigan zikr
ko'rsatiladi. U qadam matnidagi «…» ichidan aynan olinadi (`extract_zikr`): ma'nosi qavsdan,
«uch marta» yozilgan bo'lsa ×3 belgisi bilan. To'liq ko'rsatma «Tafsilot» tabida turadi.
Har bir zikr qachon aytilishi bilan ko'rsatiladi (`link_postures`). Ruku': Borishda «Allohu akbar»,
Ruku'da «Subhana Robbiyal-'aziym» ×3, Turishda «Sami'allohu liman hamidah». Qavma: Tik turgach
«Robbanaa, lakal hamd». Sajda: Borishda «Allohu akbar», Sajdada «Subhana Robbiyal-a'lo» ×3,
Turishda «Allohu akbar». Niyat, takbir va salomda faqat birinchi «…» olinadi (`action_zikr`).
Manbada niyat to'liq yozilmagan bo'lsa («...shu vaqt asr namozining farzini...»), u o'zimizdan
to'ldirilmaydi. «Jalsa va ikkinchi sajda» qadami ikkiga bo'linadi: Jalsa (3–5 s) va Ikkinchi sajda (4–6 s).
Ikkinchi sajdaga Sajda qadamidagi tasbeh («Subhana Robbiyal-a'lo») beriladi.

**Amiyn, salom va farzdan keyingi qism:**
- Har bir Fotihadan keyin alohida «Amiyn» bosqichi (ohista) bor.
- Salom ikki bosqichga bo'lingan: o'ng yelkaga, so'ng chap yelkaga «Assalomu alaykum va rohmatulloh».
- Farz namozlarida salomdan keyin quyidagilar keladi:
  - «Astag'firulloh» ×3. Manba: [muslim.uz Fatvo markazi](https://muslim.uz/uz/e/post/4478-farz-namozlaridan-avval-va-keyingi-sunnat-namozlari), Imom Muslim rivoyati.
  - «Allohumma, antas-salom va minkas-salom, tabarokta ya zaljaloli val-ikrom» bir marta. Manba: [muslim.uz — Namozdan so'ng o'qiladigan duolar](https://muslim.uz/uz/c/prayer/namozdan-so-ng-o-qiladigan-duolar).
  - So'ng «Amiyn». Bu loyiha egasining ko'rsatmasi, chunki muslim.uz manbasida yozilmagan.
- Vitr vojib bo'lgani uchun unda bu qism yo'q.

**Rakat qismini tanlash:** `GET /api/namoz-organish/<slug>/birga/?qism=<n>`. Bu yerda `n` — `rakat_breakdown` indeksi. Masalan Peshin uchun: 0 = 4 rakat sunnat, 1 = 4 rakat farz (standart), 2 = 2 rakat sunnat. Sunnat ketma-ketligi farz qadamlaridan quriladi (`build_part`), manba — muslim.uz:
- [4 rakatli sunnat](https://muslim.uz/uz/c/prayer/to-rt-rakatli-sunnat-namozni-o-qish-tartibi): 3- va 4-rakatda ham Fotihadan keyin zam sura o'qiladi.
- 2 rakatli sunnat: «tartibi ham bundan farqlanmaydi. Faqat niyatda farq bo'ladi», o'rta qa'da bo'lmaydi.
- Niyatda faqat rakat soni va «farzini» → «sunnatini» almashtiriladi (`_niyat_for`).
- Farzdan keyingi istig'for va duo faqat farz qismida chiqadi.

**Audio manbasi:** sura audiolari Tanzil Project'dan (tanzil.net) olinadi, oyatma-oyat; quran.com
ishlatilmaydi. Qori fayllari siqib saqlangan bo'lsa (`compress_quran_audio`), o'zimizdagi
nusxa eshittiriladi. Pleyerda «Manba: Tanzil Project (tanzil.net)» deb ko'rsatiladi.

AI hech qanday diniy matn yoki namoz amalini yaratmaydi: barcha matnlar bazadagi tasdiqlangan
yozuvlardan olinadi.

### Frontend

```
src/
  types/birga.ts                    API turlari
  services/birgaService.ts          API + offline kesh (localStorage) + rasmlarni oldindan yuklash
  utils/birga/arabic.ts             arabcha matnni me’yorlash va solishtirish
  utils/birga/engine.ts             taxminiy vaqt va «keyingi bosqichga o‘tish» qarori (sof funksiyalar)
  utils/birga/birga.test.ts         unit testlar (vitest)
  hooks/useVoiceActivity.ts         mikrofon ovoz faolligi (Web Audio API, faqat qurilmada)
  hooks/useSpeechRecognition.ts     Web Speech API (ar-SA)
  hooks/useScreenControls.ts        Wake Lock va Fullscreen
  hooks/useBirgaSettings.ts         sozlamalar (localStorage)
  components/birga/
    BirgaModeCards.tsx              dars sahifasidagi ikki karta
    BirgaModeView.tsx               yuklash/xato holatlari; lazy chunk
    BirgaOqish.tsx                  sozlash → namoz → yakun
    BirgaSetup.tsx  BirgaLive.tsx  BirgaFinish.tsx  BirgaTakrorlash.tsx  shared.tsx
```

`LessonPage.tsx`ga faqat kartalar va rejim ko‘rinishi qo‘shilgan (24 qator).

## Ishlatilgan brauzer API’lari (qo‘shimcha kutubxona yo‘q)

| API | Qayerda | Qo‘llamasa |
|---|---|---|
| `getUserMedia` + Web Audio `AnalyserNode` | ovoz faolligi (RMS) | taymer |
| Web Speech API `SpeechRecognition` (`ar-SA`) | suralarni Tanzil matni bilan solishtirish | ovoz faolligi + taymer |
| Screen Wake Lock API | ekranni yoniq saqlash | sozlamada «qo‘llamaydi» |
| Fullscreen API | telefonda to‘liq ekran | oddiy ko‘rinish |

Dev uchun faqat `vitest` qo‘shildi (`npm test`).

### «Keyingi bosqichga o‘tish» qoidalari (`engine.ts`)

- **Ruku’, sajda, qavma va boshqa amallar:** faqat vizual taymer. Ruku’ va sajda 4–6 soniya, qavma
  3–5, jalsa bilan ikkinchi sajda 7–11. Tezlik sozlamasi chegarani tanlaydi.
- **Sura va duolar:** o‘qish paytida **taymer yo‘q** — AI tinglaydi.
  1. **Nutq:** sura so‘zlari tartib bo‘yicha yetarli darajada mos kelsa va oxirgi so‘zlar
     eshitilsa, foydalanuvchi to‘xtashi bilan darhol o‘tiladi.
  2. **Zaxira taymer faqat AI tasdiqlay olmaganda boshlanadi** (standart 6 soniya):
     - o‘qib, 2,5 soniyadan ko‘p jim qolsa, lekin matn tanilmagan bo‘lsa (oyatlar orasidagi
       nafas taymerni boshlamaydi), yoki
     - umuman ovoz eshitilmasa va taxminiy vaqt (matn uzunligi ÷ tezlik) o‘tsa.

     Qayta gapirsa taymer bekor bo‘ladi.
  3. Mikrofon ishlamasa — taymer boshidan: taxminiy vaqt + zaxira.
  4. Shovqin sabab «gapiryapti» holati to‘xtamasa ham eng ko‘pi 3 × taxminiy vaqt + zaxira kutiladi.
- Hech qaysi qoida o‘qish tugaganini **tasdiqlamaydi**. Yakuniy ekranda nechta bosqich nutq,
  ovoz yoki taymer bo‘yicha o‘tgani halol ko‘rsatiladi.

## Maxfiylik va xavfsizlik

- Kamera ishlatilmaydi. AI gapirmaydi (TTS yo‘q) va savol bermaydi.
- Ilova ovozni **yozib olmaydi va o‘z serveriga yubormaydi**.
- **Diqqat:** Chrome va Edge’da `SpeechRecognition` ovozni tanish uchun brauzer ishlab chiqaruvchisi
  serveriga yuboradi. Sozlamalarda «Nutqni aniqlash» o‘chirilsa, faqat qurilmadagi ovoz faolligi
  ishlaydi.
- Mikrofon faqat **HTTPS** yoki `localhost`da ishlaydi. Production’da HTTPS majburiy.
- Hanafiy mazhabi bo‘yicha ogohlantirish (`birga.SAFETY_NOTICE`) boshlashdan oldin ko‘rsatiladi va
  tasdiqlanmasa «Boshlash» tugmasi ishlamaydi. Matnni diniy mutaxassis ko‘rib chiqishi tavsiya etiladi.

## Xatolar bilan ishlash

| Holat | Natija |
|---|---|
| Mikrofonga ruxsat berilmadi / topilmadi / uzildi | «Taymer bo‘yicha davom etadi» |
| HTTPS emas | mikrofon so‘ralmaydi, taymer ishlaydi |
| Nutqni aniqlashda tarmoq xatosi | 3 marta qayta urinadi, so‘ng faqat ovoz faolligi |
| Chrome jimlikdan keyin tanishni to‘xtatdi | avtomatik qayta ishga tushadi |
| API ishlamadi | oxirgi saqlangan nusxa (offline yoqilgan bo‘lsa), aks holda «Qayta urinish» |

## Ishga tushirish va testlar

```bash
# backend
cd backend && venv/bin/python manage.py test apps.learning
# frontend
cd frontend && npm install && npm test && npm run dev
```

## Real mikrofon bilan qo‘lda tekshirish

Brauzerda (Chrome yoki Edge, `http://localhost:5173`):

1. Peshin darsini oching → «Birga o‘qish». Ogohlantirishni tasdiqlang → «Boshlash». Mikrofon ruxsati
   so‘raladi.
2. Ruxsat bering. Indikator «AI tinglamoqda…» ko‘rsatadi, gapirganda chiziqlar harakatlanadi.
3. «Fotiha» bosqichida Fotihani ovoz chiqarib o‘qing. Oxirida jim tursangiz, keyingi bosqich ochiladi.
4. Hech narsa demang. Aylana taymer tugagach o‘tishi kerak.
5. Taymer tugayotgan paytda gapirib turing. U kutib turishi kerak.
6. Mikrofonni brauzer sozlamalaridan bloklang va qayta boshlang. «Mikrofonga ruxsat berilmadi» va
   taymer bilan davom etishi kerak.
7. Telefonda: to‘liq ekran ochilishi, ekran o‘chmasligi va «Katta matn» rejimini tekshiring.
8. «Birga takrorlash»: Ixlos surasini o‘qing. Tanilgan arabcha so‘zlar yashil rangga kirishi kerak.
