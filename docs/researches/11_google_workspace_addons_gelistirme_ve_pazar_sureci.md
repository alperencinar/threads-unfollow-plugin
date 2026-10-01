# Google Workspace Add-ons Geliştirme, Entegrasyon ve Pazar Süreci

**Tarih:** 2026-09-30  
**Protokol:** /deepwork, Clean Architecture  
**Kapsam:** Google Workspace Add-ons (Eklentiler), Google Apps Script, Geliştirici Ortamı, Dağıtım ve Marketplace Süreçleri.

---

## 1. Geliştirme Ortamı ve Araç Zinciri

Google Workspace eklentileri (Add-ons) geliştirirken geleneksel web tabanlı Apps Script editörü yetersiz kalabilir. Modern yazılım geliştirme pratiklerini entegre etmek için yerel geliştirme ortamları kullanılır.

### Web Apps Script Editor vs Yerel Geliştirme Ortamı
- **Web Editor:** Hızlı prototipleme ve basit scriptler için uygundur. Ancak versiyon kontrolü, modern paket yöneticileri (NPM), otomatik test ve linting süreçlerinden yoksundur.
- **Yerel Geliştirme:** Git entegrasyonu, TypeScript desteği ve modern IDE (VS Code) özellikleri ile kurumsal seviyede geliştirme sağlar.

### Google `clasp` (Command Line Apps Script Projects)
`clasp`, yerel ortamdaki dosyaları Google Apps Script projeleriyle senkronize eden resmi CLI aracıdır.
- `clasp login`: Google hesabı ile yetkilendirme sağlar.
- `clasp create`: Yeni bir Apps Script projesi başlatır.
- `clasp push`: Yerel kodları Google sunucularına yükler.
- `clasp deploy`: Projenin belirli bir versiyonunu canlıya alır.
- `.clasp.json`: Proje ID'sini ve kök dizini barındıran yapılandırma dosyasıdır.

### TypeScript ve Modern Bundler Yapılandırması
Apps Script'in V8 motoru ES6+ desteklese de, büyük projelerde tür güvenliği (type safety) için TypeScript tercih edilir.
- `clasp` kendi içinde temel TypeScript derleme yeteneğine sahiptir (otomatik olarak `.ts` dosyalarını `.gs` dosyalarına dönüştürür).
- Daha gelişmiş yapılar için (örneğin npm modüllerini dahil etmek) Vite, Webpack veya Rollup kullanılarak kod tek bir JavaScript dosyasına derlenir (bundle).
- `ts2gas` veya Babel eklentileri kullanılarak modern JavaScript, Apps Script'in beklediği Global yapıya uygun hale getirilebilir.

### Çoklu Ortam Yönetimi
- **Development / Staging / Production:** `clasp` ve farklı `appsscript.json` (manifest) dosyaları veya farklı script ID'leri kullanarak (örneğin `.clasp-dev.json`, `.clasp-prod.json`) CI/CD pipeline'ları üzerinden çoklu ortam (environment) yönetimi gerçekleştirilir.

---

## 2. Google E-Tablolar ve Dokümanlara Özel Entegrasyonlar

### Google Sheets Özel Fonksiyonları (Custom Functions)
Hücrelerde doğrudan çağrılabilen fonksiyonlardır (ör. `=MASRAFO_RUNWAY(A1, B1)`).
- **Kısıtlamalar:** Maksimum 30 saniye çalışma süresi. Harici veri kaynaklarından (API) veri çekerken hız artışı için `CacheService` kullanılmalıdır.
- **Belgelendirme:** JSDoc standartlarında `@customfunction` etiketi kullanılarak formül çubuğunda otomatik tamamlama ve yardım metinleri sağlanır.

### Tetikleyiciler (Triggers)
- **Basit Tetikleyiciler (`onOpen`, `onEdit`):** Yetki gerektirmeyen (auth-less) işlemler için kullanılır. Özel menüler eklemek veya basit doğrulama işlemleri yapmak için idealdir. (UrlFetchApp ile harici ağ isteği yapamazlar).
- **Yüklenebilir Tetikleyiciler (Installable Triggers):** Kullanıcının önceden yetki vermesini gerektirir. `ScriptApp.newTrigger()` ile programatik olarak kurulabilir (örneğin saatlik veri senkronizasyonu veya form gönderildiğinde tetiklenen işlemler).

### HTML Service ile Özel Kenar Çubuğu (Sidebar) ve Modallar
- Apps Script `HtmlService` kullanarak E-Tablolar veya Dokümanlar içerisinde HTML, CSS, JavaScript (hatta React/Vue gibi SPA'lar) çalıştırılabilir.
- **RPC Köprüsü:** Arayüzden (client-side) Apps Script sunucu fonksiyonlarına erişim `google.script.run.withSuccessHandler().sunucuFonksiyonu()` kullanılarak asenkron olarak sağlanır.

---

## 3. Harici Sistemlerle Entegrasyon ve Veri Akışı

### `UrlFetchApp` API'si
Apps Script üzerinden dış dünyaya HTTP istekleri atmak için kullanılır.
- **Limitler:** Maksimum 6 dakika (Workspace Enterprise için aynı) script çalışma sınırı vardır. `UrlFetchApp` isteklerinde timeout limitleri bulunmaktadır.
- **Asenkron / Toplu İstekler:** `UrlFetchApp.fetchAll(requests)` kullanılarak çoklu HTTP istekleri paralel (asenkron-benzeri) olarak gönderilebilir, bu da bekleme süresini (latency) ciddi oranda düşürür.

### REST API ve Veritabanı (Supabase/PostgreSQL) Entegrasyonu
- Dış sistemlerle (Supabase, Firebase, AWS) haberleşirken kimlik doğrulama tokenları veya API anahtarları asla kod içine yazılmamalıdır (Hardcode edilmemelidir).
- **Güvenlik:** Hassas veriler (API Key, JWT Secret) `PropertiesService.getScriptProperties().getProperty('API_KEY')` ile saklanır.
- **Kimlik Doğrulama:** Supabase gibi sistemlere istek atılırken Workspace kullanıcısının e-postası (Session.getActiveUser().getEmail()) alınarak dış sistemde JWT doğrulama iş akışlarına dahil edilebilir.

---

## 4. Google Workspace Marketplace Dağıtım ve Yayın Süreci

Eklentiyi geliştirmenin ötesinde, kullanıcılara sunmak ciddi bir denetim ve yapılandırma süreci gerektirir.

### GCP Konsolu ve Workspace Marketplace SDK
- Eklentinin yayınlanabilmesi için Apps Script projesi bir Standart Google Cloud (GCP) projesine bağlanmalıdır.
- GCP üzerinden "Google Workspace Marketplace SDK" API'si etkinleştirilir ve yapılandırılır.

### Mağaza Listeleme (Store Listing) ve Varlıklar
- Uygulama ikonları, banner tasarımları (belirli piksel ölçülerinde), detaylı açıklamalar, YouTube tanıtım videoları ve ekran görüntüleri eklenir.
- Bir Gizlilik Politikası (Privacy Policy) ve Hizmet Şartları (Terms of Service) sayfası sunulması zorunludur.

### OAuth Consent Screen ve Güvenlik Doğrulaması (Google Verification)
- Uygulamanın istediği izinler (Scopes, ör. `https://www.googleapis.com/auth/spreadsheets.currentonly`) belirlenir.
- **Hassas (Sensitive) ve Kısıtlı (Restricted) Scopes:** E-posta okuma, tüm Drive dosyalarını yönetme gibi kısıtlı izinler istendiğinde, uygulamanın Google Güvenlik Doğrulaması sürecinden geçmesi gerekir.

### CASA (Cloud Application Security Assessment) Tier 2 / 3 Denetimleri
- Kısıtlı (Restricted) kapsamlar kullanılıyorsa, uygulamanın harici sistemleri (örneğin sizin veritabanı veya API sunucunuz) üçüncü taraf bir güvenlik laboratuvarı (CASA süreci) tarafından denetlenmelidir.
- Bu denetim OWASP ASVS standartlarına dayanır. Penetrasyon testleri, sızma girişimleri, güvenli veri depolama denetimleri içerir.

### Dağıtım Modelleri
- **Domain-wide Install (Admin Install):** Google Workspace yöneticisinin uygulamayı tüm domain (şirket) veya belirli bir organizasyon birimi (OU) için tek seferde yüklemesi.
- **Individual Install:** Bireysel kullanıcıların Marketplace üzerinden kendi hesaplarına kurulum yapması (Enterprise güvenlik politikaları izin veriyorsa).

---

## 5. Somut Kod Örnekleri

### 1. `clasp` ve TypeScript Ortamı Başlatma
```bash
# Projeyi oluştur
clasp create --type sheets --title "Masrafo Eklentisi"
npm init -y
npm install -D @types/google-apps-script typescript
```

`tsconfig.json` yapılandırması:
```json
{
  "compilerOptions": {
    "lib": ["esnext"],
    "experimentalDecorators": true,
    "target": "ES2019",
    "module": "None",
    "noImplicitAny": true
  }
}
```

### 2. TypeScript ile Custom Function Örneği
```typescript
/**
 * Masrafo hesaplamalarını döndürür.
 * 
 * @param {number} gelir Aylık gelir miktarı
 * @param {number} gider Aylık gider miktarı
 * @return {number} Kalan bakiye
 * @customfunction
 */
function MASRAFO_RUNWAY(gelir: number, gider: number): number {
  if (typeof gelir !== 'number' || typeof gider !== 'number') {
    throw new Error('Değerler sayı olmalıdır.');
  }
  
  const cache = CacheService.getScriptCache();
  const cacheKey = `runway_${gelir}_${gider}`;
  const cachedValue = cache.get(cacheKey);
  
  if (cachedValue) {
    return parseFloat(cachedValue);
  }

  // İş mantığı hesaplaması
  const sonuc = gelir - gider;
  
  // 6 saatliğine önbellekleme
  cache.put(cacheKey, sonuc.toString(), 21600);
  
  return sonuc;
}
```

### 3. REST API Entegrasyonu ve PropertiesService
```typescript
function getMasrafoDataFromSupabase(): any {
  // Hardcoded API key kullanmıyoruz
  const scriptProps = PropertiesService.getScriptProperties();
  const apiKey = scriptProps.getProperty('SUPABASE_API_KEY');
  const apiUrl = scriptProps.getProperty('SUPABASE_URL');
  
  const url = `${apiUrl}/rest/v1/masraf_data?select=*`;
  
  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'get',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    } else {
      Logger.log(`API Hatası: ${response.getResponseCode()} - ${response.getContentText()}`);
      return null;
    }
  } catch (e) {
    Logger.log(`İstek Hatası: ${e.message}`);
    return null;
  }
}
```
