/**
 * O'zbek tilidagi tarjimalar
 * O'zbek tilida UI matnini o'zgartirish uchun ushbu faylni tahrirlang
 */
export const uz = {
  // ═══════════════════════════════════════════════════════════════════════════
  // Umumiy
  // ═══════════════════════════════════════════════════════════════════════════
  'app.name': 'KKH Tahlil',
  'app.loading': 'Fikrlamoqdaman...',
  'app.save': 'Saqlash',
  'app.cancel': 'Bekor qilish',
  'app.delete': "O'chirish",
  'app.rename': 'Nomini o\'zgartirish',
  'app.search': 'Qidirish...',
  'app.upload': 'Yuklash',
  'app.close': 'Yopish',
  'app.comingSoon': 'Tez kunda',

  // ═══════════════════════════════════════════════════════════════════════════
  // Fayl menejeri
  // ═══════════════════════════════════════════════════════════════════════════
  'files.newProject': 'Yangi loyiha',
  'files.newFolder': 'Yangi papka',
  'files.noProjects': 'Loyihalar yo\'q',
  'files.noProjectsFound': 'Loyihalar topilmadi',
  'files.dropHere': 'Fayllarni bu yerga tashlang yoki Yuklash tugmasini bosing',
  'files.uploadFiles': 'Fayllarni yuklash',
  'files.uploadSuccess': 'Yuklandi',
  'files.uploadFailed': 'Yuklash muvaffaqiyatsiz',
  'files.uploadFile': 'Fayl yuklash',
  'files.newSubfolder': 'Yangi ichki papka',

  // ═══════════════════════════════════════════════════════════════════════════
  // Ma'lumotlarni ko'rish
  // ═══════════════════════════════════════════════════════════════════════════
  'data.overview': "Ma'lumotlar sharhi",
  'data.samples': 'namunalar',
  'data.variables': 'o\'zgaruvchilar',
  'data.classColumns': 'Sinf ustunlari',
  'data.groups': 'guruhlar',
  'data.numericVariables': 'raqamli o\'zgaruvchilar aniqlandi',
  'data.viewFull': "To'liq ma'lumotlarni ko'rish",
  'data.fullView': "To'liq ma'lumotlar",
  'data.rows': 'qatorlar',
  'data.columns': 'ustunlar',
  'data.scrollHint': "Barcha ma'lumotlarni ko'rish uchun gorizontal va vertikal aylantiring",

  // ═══════════════════════════════════════════════════════════════════════════
  // Tahlil sozlamalari
  // ═══════════════════════════════════════════════════════════════════════════
  'analysis.settings': 'Tahlil sozlamalari',
  'analysis.configure': 'Statistik tahlil parametrlarini sozlash',
  'analysis.method': 'Tahlil usuli',
  'analysis.anova': 'Bir faktorli ANOVA',
  'analysis.anovaDesc': 'Statistik muhim farqlarni aniqlash uchun guruhlar o\'rtasidagi o\'rtacha qiymatlarni taqqoslaydi',
  'analysis.pca': 'PCA',
  'analysis.pcaDesc': "Maksimal dispersiyani saqlab qolgan holda ma'lumotlar o'lchamini kamaytiradi",
  'analysis.groupingVar': "Guruhlash o'zgaruvchisi",
  'analysis.selectColumn': 'Ustunni tanlang...',
  'analysis.uniqueGroups': 'noyob guruhlar',
  'analysis.groupsFound': 'guruh topildi',
  'analysis.fdrThreshold': 'FDR chegarasi',
  'analysis.fdrHelp': "False Discovery Rate — yolg'on ijobiy natijalar ulushini nazorat qiladi. Standart: 0.05",
  'analysis.designLabel': 'Dizayn yorlig\'i',
  'analysis.visualization': 'Natijalarni vizualizatsiya qilish',
  'analysis.noPlots': 'Grafiksiz',
  'analysis.nominal': 'Nominal (p < 0.05)',
  'analysis.bonferroni': 'Bonferroni',
  'analysis.benjamini': 'Benjamini-Hochberg',
  'analysis.allVariables': "Barcha o'zgaruvchilar",
  'analysis.numComponents': 'Komponentlar soni',
  'analysis.numComponentsHelp': 'Asosiy komponentlar soni. Odatda vizualizatsiya uchun 2-3 ta yetarli',
  'analysis.scalingMethod': 'Masshtablash usuli',
  'analysis.autoScale': 'Avto-masshtablash',
  'analysis.autoScaleDesc': "Standartlashtirish: o'rtacha = 0, std = 1",
  'analysis.meanCenter': "O'rtacha bo'yicha markazlashtirish",
  'analysis.meanCenterDesc': "Faqat o'rtacha bo'yicha markazlashtirish",
  'analysis.pareto': 'Pareto',
  'analysis.paretoDesc': 'Standart og\'ishning kvadrat ildizi bo\'yicha masshtablash',
  'analysis.run': 'Ishga tushirish',
  'analysis.running': 'Tahlil bajarilmoqda...',
  'analysis.complete': 'Tahlil tugallandi',
  'analysis.failed': 'Tahlil muvaffaqiyatsiz',
  'analysis.significantVars': 'muhim o\'zgaruvchilar',

  // ═══════════════════════════════════════════════════════════════════════════
  // Natijalar
  // ═══════════════════════════════════════════════════════════════════════════
  'results.anova': 'ANOVA natijalari',
  'results.analyzed': 'o\'zgaruvchilar tahlil qilindi',
  'results.totalVars': 'Jami o\'zgaruvchilar',
  'results.benjaminiSig': 'Benjamini muhim',
  'results.bonferroniSig': 'Bonferroni muhim',
  'results.numGroups': 'Guruhlar',
  'results.variable': 'O\'zgaruvchi',
  'results.pValue': 'P-qiymat',
  'results.fdr': 'FDR',
  'results.significant': 'Muhim',
  'results.notSignificant': 'Yo\'q',
  'results.topSignificant': 'Eng muhim o\'zgaruvchilar',
  'results.observations': 'kuzatuvlar',
  'results.median': 'Mediana',
  'results.range': 'Diapazon',

  // ═══════════════════════════════════════════════════════════════════════════
  // Box Plot
  // ═══════════════════════════════════════════════════════════════════════════
  'boxplot.resizeHint': '+ aylantirish - o\'lchamini o\'zgartirish',
  'boxplot.minimize': 'Kichraytirish',
  'boxplot.maximize': 'Kattalashtirish',
  'boxplot.addToChat': 'Chatga qo\'shish',
  'boxplot.groups': 'guruhlar',

  // ═══════════════════════════════════════════════════════════════════════════
  // AI Yordamchi
  // ═══════════════════════════════════════════════════════════════════════════
  'ai.title': 'AI Yordamchi',
  'ai.placeholder': 'Tahlil haqida so\'rang...',
  'ai.hint': "Tahlil natijalari haqida savollar bering. Masalan: \"Qaysi o'zgaruvchilar eng muhim?\"",
  'ai.noAnalysis': 'AI tahlilini olish uchun tahlilni ishga tushiring',

  // ═══════════════════════════════════════════════════════════════════════════
  // Sarlavha
  // ═══════════════════════════════════════════════════════════════════════════
  'header.noProject': 'Loyiha tanlanmagan',
  'header.configurations': 'Sozlamalar',
  'header.export': 'Natijalarni eksport qilish (ZIP)',

  // ═══════════════════════════════════════════════════════════════════════════
  // PCA
  // ═══════════════════════════════════════════════════════════════════════════
  'pca.comingSoon': 'PCA vizualizatsiyasi tez kunda!',
  'pca.comingSoonDesc': 'Biz interaktiv PCA ball grafiklari va yuklash grafiklari ustida ishlamoqdamiz.',

  // ═══════════════════════════════════════════════════════════════════════════
  // Eksport
  // ═══════════════════════════════════════════════════════════════════════════
  'export.complete': 'Eksport tugallandi!',
  'export.completeDesc': "Excel, PNG boxplotlar va asl ma'lumotlar bilan ZIP fayl yuklandi",
  'export.failed': 'Eksport muvaffaqiyatsiz',
  'export.anovaOnly': 'Eksport faqat ANOVA natijalari uchun mavjud',

  // ═══════════════════════════════════════════════════════════════════════════
  // Maslahatlar va tavsiflar
  // ═══════════════════════════════════════════════════════════════════════════
  'tooltip.bonferroni': 'Qat\'iy tuzatish, minimal yolg\'on ijobiy natijalar',
  'tooltip.benjamini': 'Sezuvchanlik va o\'ziga xoslik o\'rtasidagi muvozanat (tavsiya etiladi)',
  'tooltip.allVars': 'To\'liq ko\'rib chiqish',
  'tooltip.nominal': 'p < 0.05 bo\'lgan o\'zgaruvchilarni ko\'rsatish',
  'tooltip.noPlots': 'Grafiklar yaratmaslik',

  // ═══════════════════════════════════════════════════════════════════════════
  // Bo'sh holat
  // ═══════════════════════════════════════════════════════════════════════════
  'empty.dropHere': 'Faylni shu yerga tashlang',
  'empty.startAnalysis': 'Tahlilni boshlang',
  'empty.description': "Boshlash uchun CSV yoki Excel faylini yuklang. Platforma ma'lumotlar tuzilishini avtomatik aniqlaydi va ANOVA yoki PCA tahlili uchun tayyorlaydi.",
  'empty.uploadBtn': "Ma'lumotlar faylini yuklash",
  'empty.supported': 'Qo\'llab-quvvatlanadi: .csv, .xlsx, .xls',
} as const

