const KEY = "apnajind_locale_v1";
const WORDS = {
  en: { home: "Home", food: "Food", saved: "Saved", recent: "Recent", profile: "Profile", back: "Back to listings", call: "Call", directions: "Get directions", services: "Services", hours: "Opening hours", location: "Location", contact: "Contact", openNow: "Open now", nearest: "Nearest", verified: "Verified", area: "Area", category: "Category", sort: "Sort", featured: "Featured first", name: "Name A–Z", clear: "Clear filters", noResults: "No businesses found", suggestions: "Try another nearby category or area.", savedTitle: "Saved businesses", recentTitle: "Recently viewed", available: "Available for customers", seasonal: "Seasonal availability", closed: "Temporarily closed" },
  hi: { home: "होम", food: "खाना", saved: "सहेजे गए", recent: "हाल ही में देखे", profile: "प्रोफ़ाइल", back: "सूची पर वापस जाएँ", call: "कॉल करें", directions: "रास्ता देखें", services: "सेवाएँ", hours: "खुलने का समय", location: "स्थान", contact: "संपर्क", openNow: "अभी खुला", nearest: "सबसे पास", verified: "सत्यापित", area: "इलाका", category: "श्रेणी", sort: "क्रम", featured: "विशेष पहले", name: "नाम A–Z", clear: "फ़िल्टर हटाएँ", noResults: "कोई व्यवसाय नहीं मिला", suggestions: "पास की दूसरी श्रेणी या इलाका चुनें।", savedTitle: "सहेजे गए व्यवसाय", recentTitle: "हाल ही में देखे गए", available: "ग्राहकों के लिए उपलब्ध", seasonal: "मौसमी उपलब्धता", closed: "अस्थायी रूप से बंद" }
};

export class Locale {
  static get language() { return localStorage.getItem(KEY) === "hi" ? "hi" : "en"; }
  static t(key) { return WORDS[Locale.language][key] || WORDS.en[key] || key; }
  static toggle() { localStorage.setItem(KEY, Locale.language === "hi" ? "en" : "hi"); document.documentElement.lang = Locale.language; }
}
