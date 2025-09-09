// Language codes for training sections
export const LANGUAGES = [
  { code: 'TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'PT', name: 'Português', flag: '🇵🇹' },
  { code: 'RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'AR', name: 'العربية', flag: '🇸🇦' },
  { code: 'ZH', name: '中文', flag: '🇨🇳' },
  { code: 'JA', name: '日本語', flag: '🇯🇵' },
  { code: 'KO', name: '한국어', flag: '🇰🇷' }
] as const;

// Target audience categories based on education science and Bloom's Taxonomy
export const TARGET_AUDIENCES = [
  {
    id: 'genel',
    name: 'Genel',
    description: 'Tüm seviyeler için uygun, temel bilgi aktarımı',
    icon: '👥',
    color: 'blue'
  },
  {
    id: 'yeni_baslayan',
    name: 'Yeni Başlayan',
    description: 'Konuya yeni başlayanlar, temel kavramlar',
    icon: '🌱',
    color: 'green',
    bloomLevel: 'Remember & Understand'
  },
  {
    id: 'orta_seviye',
    name: 'Orta Seviye',
    description: 'Temel bilgisi olan, uygulama yapmak isteyenler',
    icon: '📈',
    color: 'yellow',
    bloomLevel: 'Apply & Analyze'
  },
  {
    id: 'ileri_seviye',
    name: 'İleri Seviye',
    description: 'Deneyimli kullanıcılar, karmaşık problemler',
    icon: '🚀',
    color: 'red',
    bloomLevel: 'Analyze & Evaluate'
  },
  {
    id: 'uzman',
    name: 'Uzman',
    description: 'Konuda uzman, yaratıcı çözümler geliştirenler',
    icon: '🎯',
    color: 'purple',
    bloomLevel: 'Create & Synthesize'
  },
  {
    id: 'yonetici',
    name: 'Yönetici',
    description: 'Liderlik ve yönetim becerileri',
    icon: '👔',
    color: 'indigo',
    focus: 'Leadership & Management'
  },
  {
    id: 'teknik_ekip',
    name: 'Teknik Ekip',
    description: 'Teknik uygulama ve geliştirme',
    icon: '⚙️',
    color: 'gray',
    focus: 'Technical Implementation'
  },
  {
    id: 'satis_ekibi',
    name: 'Satış Ekibi',
    description: 'Satış teknikleri ve müşteri ilişkileri',
    icon: '💼',
    color: 'emerald',
    focus: 'Sales & Customer Relations'
  },
  {
    id: 'musteri_hizmetleri',
    name: 'Müşteri Hizmetleri',
    description: 'Müşteri desteği ve problem çözme',
    icon: '🎧',
    color: 'teal',
    focus: 'Customer Support'
  },
  {
    id: 'insan_kaynaklari',
    name: 'İnsan Kaynakları',
    description: 'HR süreçleri ve insan yönetimi',
    icon: '👥',
    color: 'pink',
    focus: 'Human Resources'
  },
  {
    id: 'finans_ekibi',
    name: 'Finans Ekibi',
    description: 'Mali işler ve bütçe yönetimi',
    icon: '💰',
    color: 'amber',
    focus: 'Finance & Budget'
  },
  {
    id: 'pazarlama',
    name: 'Pazarlama',
    description: 'Pazarlama stratejileri ve kampanyalar',
    icon: '📢',
    color: 'orange',
    focus: 'Marketing & Campaigns'
  },
  {
    id: 'ogrenci',
    name: 'Öğrenci',
    description: 'Eğitim alan öğrenciler',
    icon: '🎓',
    color: 'cyan',
    focus: 'Academic Learning'
  },
  {
    id: 'egitmen',
    name: 'Eğitmen',
    description: 'Eğitim veren kişiler',
    icon: '👨‍🏫',
    color: 'violet',
    focus: 'Teaching & Training'
  }
] as const;

// Asset types with audio support
export const ASSET_TYPES = [
  { value: 'video', label: 'Video', icon: '🎥' },
  { value: 'audio', label: 'Ses', icon: '🎵' },
  { value: 'image', label: 'Resim', icon: '🖼️' },
  { value: 'doc', label: 'Doküman', icon: '📄' }
] as const;

// Audio asset purposes
export const AUDIO_PURPOSES = [
  { value: 'dubbing', label: 'Dublaj (Çeviri)', description: 'Video için farklı dilde seslendirme' },
  { value: 'narration', label: 'Anlatım', description: 'Ek anlatım veya açıklama' },
  { value: 'background', label: 'Arka Plan Müziği', description: 'Arka plan müziği veya ses efektleri' },
  { value: 'instruction', label: 'Talimat', description: 'Özel talimatlar veya yönergeler' }
] as const;
