export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  script: string;
  musicTraditions: string[];
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global', script: 'Latn', musicTraditions: ['pop','rock','hip-hop','country','blues','jazz','r&b','folk','electronic'] },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'Latin America / Europe', script: 'Latn', musicTraditions: ['reggaeton','salsa','bachata','flamenco','cumbia','corrido','latin-pop'] },
  { code: 'fr', name: 'French', nativeName: 'Français', region: 'Europe / Africa', script: 'Latn', musicTraditions: ['chanson','french-pop','zouk','rai','french-hip-hop'] },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', region: 'South America / Europe', script: 'Latn', musicTraditions: ['bossa-nova','samba','fado','mpb','sertanejo','funk-carioca','forro'] },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'Middle East / North Africa', script: 'Arab', musicTraditions: ['tarab','khaleeji','mahraganat','rai','maqam','dabke'] },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'South Asia', script: 'Deva', musicTraditions: ['bollywood','ghazal','qawwali','indi-pop','bhajan'] },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'South Asia', script: 'Beng', musicTraditions: ['rabindra-sangeet','baul','nazrul-geeti','adhunik'] },
  { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', region: 'East Asia', script: 'Hans', musicTraditions: ['mandopop','c-rock','guzheng','erhu','peking-opera'] },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'East Asia', script: 'Jpan', musicTraditions: ['j-pop','j-rock','enka','visual-kei','city-pop','vocaloid','anime-music'] },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'East Asia', script: 'Hang', musicTraditions: ['k-pop','k-hip-hop','trot','pansori','k-indie'] },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', region: 'East Africa', script: 'Latn', musicTraditions: ['bongo-flava','taarab','benga','gengetone'] },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', region: 'West Africa', script: 'Latn', musicTraditions: ['afrobeats','juju','fuji','apala','sakara'] },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', region: 'Southern Africa', script: 'Latn', musicTraditions: ['isicathamiya','maskandi','amapiano','gqom','mbube'] },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', region: 'East Africa', script: 'Ethi', musicTraditions: ['ethio-jazz','tizita','amharic-pop'] },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', region: 'Middle East / Europe', script: 'Latn', musicTraditions: ['arabesk','turkish-pop','anatolian-rock','turkish-folk'] },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', region: 'Middle East', script: 'Arab', musicTraditions: ['persian-classical','persian-pop','persian-hip-hop'] },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', region: 'Southeast Asia', script: 'Thai', musicTraditions: ['luk-thung','mor-lam','t-pop','thai-country'] },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['v-pop','nhac-vang','ca-tru','quan-ho'] },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['dangdut','gamelan','keroncong','indo-pop'] },
  { code: 'tl', name: 'Filipino/Tagalog', nativeName: 'Tagalog', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['opm','pinoy-pop','kundiman','harana'] },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', region: 'Eastern Europe / Central Asia', script: 'Cyrl', musicTraditions: ['russian-pop','bard-music','russian-rock','russian-hip-hop','russian-folk'] },
  { code: 'de', name: 'German', nativeName: 'Deutsch', region: 'Europe', script: 'Latn', musicTraditions: ['schlager','krautrock','german-hip-hop','neue-deutsche-welle','berlin-techno'] },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', region: 'Europe', script: 'Latn', musicTraditions: ['opera','italian-pop','cantautore','italo-disco','tarantella'] },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', region: 'Europe', script: 'Latn', musicTraditions: ['dutch-pop','gabber','hardstyle','dutch-hip-hop'] },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', region: 'Europe', script: 'Latn', musicTraditions: ['swedish-pop','melodic-death-metal','swedish-house','nordic-folk'] },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', region: 'Europe', script: 'Latn', musicTraditions: ['danish-pop','danish-hip-hop'] },
  { code: 'nb', name: 'Norwegian', nativeName: 'Norsk', region: 'Europe', script: 'Latn', musicTraditions: ['black-metal','norwegian-pop','norwegian-folk'] },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', region: 'Europe', script: 'Latn', musicTraditions: ['finnish-metal','finnish-tango','finnish-folk'] },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', region: 'Europe', script: 'Latn', musicTraditions: ['polish-disco-polo','polish-hip-hop','polonaise'] },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', region: 'Europe', script: 'Latn', musicTraditions: ['manele','romanian-pop','romanian-folk'] },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', region: 'Europe', script: 'Latn', musicTraditions: ['csardas','hungarian-folk','hungarian-pop'] },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', region: 'Europe', script: 'Latn', musicTraditions: ['czech-pop','czech-folk','czech-rock'] },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', region: 'Europe', script: 'Grek', musicTraditions: ['rebetiko','laiko','greek-pop','entechno'] },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', region: 'Middle East', script: 'Hebr', musicTraditions: ['israeli-pop','mizrahi','piyut','hebrew-hip-hop'] },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'South Asia', script: 'Arab', musicTraditions: ['ghazal','qawwali','pakistani-pop','coke-studio'] },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'South Asia', script: 'Taml', musicTraditions: ['carnatic','kollywood','gaana','tamil-hip-hop'] },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'South Asia', script: 'Telu', musicTraditions: ['tollywood','carnatic','folk-telugu'] },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'South Asia', script: 'Mlym', musicTraditions: ['mappila-pattu','carnatic','malayalam-film'] },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'South Asia', script: 'Knda', musicTraditions: ['carnatic','sandalwood-music','bhavageethe'] },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'South Asia', script: 'Gujr', musicTraditions: ['garba','dandiya','gujarati-folk','bhajan'] },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'South Asia', script: 'Deva', musicTraditions: ['lavani','powada','natya-sangeet','marathi-pop'] },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'South Asia', script: 'Guru', musicTraditions: ['bhangra','punjabi-pop','sufi','dhol'] },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'South Asia', script: 'Deva', musicTraditions: ['nepali-folk','nepali-pop','dohori'] },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', region: 'South Asia', script: 'Sinh', musicTraditions: ['baila','sinhala-pop','sarala-gee'] },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာစာ', region: 'Southeast Asia', script: 'Mymr', musicTraditions: ['mahagita','burmese-pop','saing-waing'] },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', region: 'Southeast Asia', script: 'Khmr', musicTraditions: ['cambodian-rock','khmer-pop','chapei'] },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', region: 'Southeast Asia', script: 'Laoo', musicTraditions: ['lam','lao-pop','khene-music'] },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', region: 'Central Asia', script: 'Cyrl', musicTraditions: ['throat-singing','long-song','morin-khuur','mongolian-hip-hop'] },
  { code: 'bo', name: 'Tibetan', nativeName: 'བོད་སྐད་', region: 'Central Asia', script: 'Tibt', musicTraditions: ['tibetan-chant','tibetan-folk','tibetan-pop'] },
  { code: 'uz', name: 'Uzbek', nativeName: "O'zbek", region: 'Central Asia', script: 'Latn', musicTraditions: ['shashmaqam','uzbek-pop','uzbek-folk'] },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ', region: 'Central Asia', script: 'Cyrl', musicTraditions: ['dombra','kazakh-pop','kazakh-folk'] },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', region: 'Caucasus', script: 'Geor', musicTraditions: ['polyphonic-singing','georgian-folk','georgian-pop'] },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', region: 'Caucasus', script: 'Armn', musicTraditions: ['duduk','armenian-folk','armenian-pop','sharakan'] },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', region: 'Caucasus', script: 'Latn', musicTraditions: ['mugham','azerbaijani-pop','ashiq'] },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', region: 'West Africa', script: 'Latn', musicTraditions: ['hausa-music','bandiri','hausa-hip-hop'] },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', region: 'West Africa', script: 'Latn', musicTraditions: ['highlife','igbo-rap','ogene'] },
  { code: 'wo', name: 'Wolof', nativeName: 'Wolof', region: 'West Africa', script: 'Latn', musicTraditions: ['mbalax','sabar','senegalese-hip-hop'] },
  { code: 'ak', name: 'Akan/Twi', nativeName: 'Twi', region: 'West Africa', script: 'Latn', musicTraditions: ['highlife','hiplife','azonto','gospel-highlife'] },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['dikir-barat','malay-pop','joget','dondang-sayang'] },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', region: 'Southern Africa', script: 'Latn', musicTraditions: ['boeremusiek','afrikaans-pop','sokkie'] },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', region: 'Europe', script: 'Latn', musicTraditions: ['latvian-folk','dainas','latvian-pop'] },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', region: 'Europe', script: 'Latn', musicTraditions: ['sutartines','lithuanian-folk','lithuanian-pop'] },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', region: 'Europe', script: 'Latn', musicTraditions: ['estonian-choral','regilaul','estonian-pop'] },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', region: 'Europe', script: 'Latn', musicTraditions: ['icelandic-pop','rimur','icelandic-electronic'] },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', region: 'Europe', script: 'Latn', musicTraditions: ['cerdd-dant','welsh-choral','welsh-folk','welsh-pop'] },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', region: 'Europe', script: 'Latn', musicTraditions: ['sean-nos','irish-trad','celtic-music'] },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', region: 'Europe', script: 'Latn', musicTraditions: ['trikitixa','basque-folk','basque-rock'] },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', region: 'Europe', script: 'Latn', musicTraditions: ['nova-canco','rumba-catalana','catalan-folk'] },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', region: 'Europe', script: 'Latn', musicTraditions: ['muineira','galician-folk','galician-pop'] },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', region: 'Europe', script: 'Cyrl', musicTraditions: ['turbo-folk','serbian-pop','sevdalinka','kolo'] },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', region: 'Europe', script: 'Latn', musicTraditions: ['tamburica','croatian-pop','klapa'] },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', region: 'Europe', script: 'Cyrl', musicTraditions: ['chalga','bulgarian-folk','mystery-of-voices'] },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', region: 'Eastern Europe', script: 'Cyrl', musicTraditions: ['ukrainian-folk','kobzar','ukrainian-pop','ukrainian-hip-hop'] },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', region: 'Europe', script: 'Latn', musicTraditions: ['slovak-folk','fujara','slovak-pop'] },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', region: 'Europe', script: 'Latn', musicTraditions: ['polka','slovenian-pop','folk-alpine'] },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', region: 'Europe', script: 'Latn', musicTraditions: ['iso-polyphony','albanian-pop','tallava'] },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', region: 'Europe', script: 'Cyrl', musicTraditions: ['macedonian-folk','chalgia','oro'] },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', region: 'Europe', script: 'Latn', musicTraditions: ['sevdalinka','bosnian-pop','ilahija'] },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', region: 'Europe', script: 'Latn', musicTraditions: ['ghana','maltese-folk','maltese-pop'] },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', region: 'Southern Africa', script: 'Latn', musicTraditions: ['xhosa-folk','maskandi','gospel-xhosa'] },
  { code: 'st', name: 'Sotho', nativeName: 'Sesotho', region: 'Southern Africa', script: 'Latn', musicTraditions: ['famo','sotho-folk','sotho-gospel'] },
  { code: 'tn', name: 'Tswana', nativeName: 'Setswana', region: 'Southern Africa', script: 'Latn', musicTraditions: ['tswana-folk','motswako','tswana-gospel'] },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Kinyarwanda', region: 'East Africa', script: 'Latn', musicTraditions: ['inanga','rwandan-pop','gospel-rwandan'] },
  { code: 'rn', name: 'Kirundi', nativeName: 'Ikirundi', region: 'East Africa', script: 'Latn', musicTraditions: ['royal-drums','burundian-pop'] },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', region: 'East Africa', script: 'Latn', musicTraditions: ['qaraami','hees','somali-pop'] },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', region: 'East Africa', script: 'Latn', musicTraditions: ['salegy','tsapiky','hiragasy'] },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingala', region: 'Central Africa', script: 'Latn', musicTraditions: ['soukous','rumba-congolaise','ndombolo'] },
  { code: 'sn', name: 'Shona', nativeName: 'chiShona', region: 'Southern Africa', script: 'Latn', musicTraditions: ['chimurenga','mbira','sungura','jit'] },
  { code: 'ny', name: 'Chewa', nativeName: 'Chichewa', region: 'Southern/East Africa', script: 'Latn', musicTraditions: ['malipenga','chewa-folk','malawian-pop'] },
  { code: 'ee', name: 'Ewe', nativeName: 'Eʋegbe', region: 'West Africa', script: 'Latn', musicTraditions: ['agbadza','ewe-drumming','borborbor'] },
  { code: 'ff', name: 'Fula', nativeName: 'Fulfulde', region: 'West Africa', script: 'Latn', musicTraditions: ['hoddu','fula-flute','fulani-folk'] },
  { code: 'bm', name: 'Bambara', nativeName: 'Bamanankan', region: 'West Africa', script: 'Latn', musicTraditions: ['griot','wassoulou','malian-blues'] },
  { code: 'cr', name: 'Creole (Haitian)', nativeName: 'Kreyòl', region: 'Caribbean', script: 'Latn', musicTraditions: ['kompa','rara','twoubadou','rasin'] },
  { code: 'pap', name: 'Papiamento', nativeName: 'Papiamentu', region: 'Caribbean', script: 'Latn', musicTraditions: ['tumba','muzik-di-zumbi'] },
  { code: 'qu', name: 'Quechua', nativeName: 'Runasimi', region: 'South America', script: 'Latn', musicTraditions: ['huayno','yaraví','tinku','quechua-folk'] },
  { code: 'gn', name: 'Guarani', nativeName: "Avañe'ẽ", region: 'South America', script: 'Latn', musicTraditions: ['guarania','polca-paraguaya','galopa'] },
  { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru', region: 'South America', script: 'Latn', musicTraditions: ['sikuri','morenada','aymara-folk'] },
  { code: 'nah', name: 'Nahuatl', nativeName: 'Nāhuatl', region: 'Central America', script: 'Latn', musicTraditions: ['aztec-music','son-huasteco'] },
  { code: 'haw', name: 'Hawaiian', nativeName: "ʻOlelo Hawaiʻi", region: 'Pacific', script: 'Latn', musicTraditions: ['slack-key-guitar','hawaiian-chant','hula','jawaiian'] },
  { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', region: 'Pacific', script: 'Latn', musicTraditions: ['waiata','haka','poi-song'] },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', region: 'Pacific', script: 'Latn', musicTraditions: ['samoan-choral','siva','samoan-hip-hop'] },
  { code: 'to', name: 'Tongan', nativeName: 'Lea faka-Tonga', region: 'Pacific', script: 'Latn', musicTraditions: ['lakalaka','tongan-hymn'] },
  { code: 'fj', name: 'Fijian', nativeName: 'Na vosa vaka-Viti', region: 'Pacific', script: 'Latn', musicTraditions: ['meke','fijian-choral'] },
  { code: 'yue', name: 'Cantonese', nativeName: '廣東話', region: 'East Asia', script: 'Hant', musicTraditions: ['cantopop','cantonese-opera'] },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', region: 'Southeast Asia', script: 'Java', musicTraditions: ['gamelan','campursari','keroncong'] },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['degung','kacapi-suling','jaipongan'] },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Sinugbuanon', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['bisaya-pop','sinulog-music'] },
  { code: 'ilo', name: 'Ilocano', nativeName: 'Ilokano', region: 'Southeast Asia', script: 'Latn', musicTraditions: ['ilocano-folk','dallot'] },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen', region: 'Central Asia', script: 'Latn', musicTraditions: ['dutar','turkmen-folk','turkmen-pop'] },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', region: 'Central Asia', script: 'Cyrl', musicTraditions: ['komuz','kyrgyz-epic','kyrgyz-folk'] },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', region: 'Central Asia', script: 'Cyrl', musicTraditions: ['shashmaqam','falak','tajik-pop'] },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', region: 'South/Central Asia', script: 'Arab', musicTraditions: ['attan','pashto-folk','pashto-pop'] },
  { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', region: 'Middle East', script: 'Arab', musicTraditions: ['dengbej','kurdish-folk','kurdish-pop'] },
  { code: 'ber', name: 'Berber/Tamazight', nativeName: 'ⵜⴰⵎⴰⵣⵉⵖⵜ', region: 'North Africa', script: 'Tfng', musicTraditions: ['amazigh-music','gnawa','ahwash','izlan'] },
];

export class LanguageRegistry {
  private languages: Map<string, Language>;

  constructor() {
    this.languages = new Map(LANGUAGES.map((l) => [l.code, l]));
  }

  getLanguage(code: string): Language | undefined {
    return this.languages.get(code);
  }

  getAllLanguages(): Language[] {
    return Array.from(this.languages.values());
  }

  searchLanguages(query: string): Language[] {
    const lower = query.toLowerCase();
    return this.getAllLanguages().filter(
      (l) =>
        l.name.toLowerCase().includes(lower) ||
        l.nativeName.toLowerCase().includes(lower) ||
        l.code.toLowerCase() === lower,
    );
  }

  getByRegion(region: string): Language[] {
    const lower = region.toLowerCase();
    return this.getAllLanguages().filter((l) => l.region.toLowerCase().includes(lower));
  }

  getMusicTraditions(code: string): string[] {
    return this.languages.get(code)?.musicTraditions ?? [];
  }

  get count(): number {
    return this.languages.size;
  }
}
