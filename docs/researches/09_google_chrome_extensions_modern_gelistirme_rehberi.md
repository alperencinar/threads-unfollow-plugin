# Chrome Extensions Modern Geliştirme Yaşam Döngüsü, Mimari ve Yayınlama Rehberi (2025/2026 Standartları)

**Tarih:** 30 Eylül 2026  
**Protokol:** `/deepwork`, `Clean Architecture`  
**Yazar:** Deep Research Specialist & Google Ecosystem Architect

---

## 1. Modern Tooling ve Framework Karşılaştırması

Google Chrome Eklentileri (Manifest V3) geliştirme ekosistemi, 2025-2026 yıllarında büyük ölçüde Vite tabanlı ve DX (Developer Experience) odaklı araçlara kaymıştır. Geçmişin Webpack tabanlı karmaşık yapılandırmalarının yerini "Konfigürasyon yerine Konvansiyon" prensibini benimseyen yeni nesil frameworkler almıştır.

### WXT (Web Extension Toolkit)
*   **Mimari:** "Next-gen" eklenti framework'üdür. Vite tabanlı çalışır ve Nuxt.js/Next.js benzeri dosya tabanlı (file-based) bir yönlendirme/entrypoint mantığına sahiptir.
*   **Avantajları:** `entrypoints/` klasöründeki dosyalara bakarak `manifest.json` dosyasını otomatik üretir (Auto-manifest). Type-safe storage ve messaging API'leri sunar. Chrome, Firefox, Safari ve Edge için tek kod tabanından derleme yapar (Multi-browser). HMR (Hot Module Replacement) performansı kusursuzdur.
*   **Değerlendirme:** 2026 itibariyle yeni projeler için endüstri standardı ve "modern default" kabul edilmektedir.

### Plasmo
*   **Mimari:** React, Vue ve Svelte desteği sunan, Parcel bundler tabanlı köklü bir framework'tür.
*   **Avantajları:** Geçmiş yıllarda çok popüler olduğu için geniş bir ekosisteme, hazır entegrasyonlara (Stripe, Firebase) ve büyük bir topluluğa sahiptir. React-first bir SDK sunar.
*   **Değerlendirme:** Güçlü bir geçmişi olsa da, Parcel'in getirdiği kısıtlamalar ve bakım moduna (maintenance mode) geçme eğilimleri nedeniyle yeni, modern mimarilerde yerini WXT'ye bırakmaktadır.

### Vanilla Vite + @crxjs/vite-plugin
*   **Mimari:** Vite'ın hızından faydalanan, doğrudan `manifest.json` üzerinden bağımlılık grafiğini (dependency graph) çıkaran minimalist bir Vite eklentisidir.
*   **Avantajları:** Tam kontrol sağlar. Framework'lerin getirdiği "sihirli" arka plan işlemlerini sevmeyen, kendi özel CI/CD ve build pipeline'ını kurmak isteyen uzman geliştiriciler için idealdir.
*   **Değerlendirme:** Esneklik arayanlar için en iyi seçenektir, ancak storage, messaging ve multi-browser uyumluluğu gibi konularda ekstra yapılandırma (boilerplate) gerektirir.

### Karşılaştırma Matrisi

| Kriter | WXT | Plasmo | Vite + CRXJS |
| :--- | :--- | :--- | :--- |
| **Taban / Bundler** | Vite | Parcel | Vite |
| **DX & HMR** | Mükemmel (UI ve Worker) | İyi (Ara sıra Worker gecikmesi)| Çok İyi |
| **TypeScript Desteği**| Native & Type-safe | Native | Native |
| **Manifest Yönetimi** | Otomatik (File-based) | Otomatik | Manuel (`manifest.json` kaynaklı) |
| **Bakım Durumu** | Çok Aktif | Yavaşladı (Maintenance) | Aktif (Topluluk odaklı) |

---

## 2. Geliştirme İş Akışı ve Mimari Pratikleri

### Hot Module Replacement (HMR) ve Service Worker
Manifest V3'te Service Worker'lar (Background scripts) DOM'a erişemez ve uyku moduna geçebilir. Modern araçlar (WXT, CRXJS), geliştirme sırasında Service Worker'ı açık tutmak ve kod değiştiğinde eklentiyi otomatik olarak yeniden yüklemek (Extension Reloading) için WebSockets kullanır. UI (Popup, Options) tarafında ise React/Vue Fast Refresh sayesinde state kaybetmeden anında güncelleme sağlanır.

### Modern UI Entegrasyonu
Eklenti UI'ları artık klasik HTML/CSS yerine **React 19, Vue 3 veya Svelte 5** ile geliştirilmektedir. Stil yönetimi için **TailwindCSS** endüstri standardıdır.

### CSS İzolasyonu (Shadow DOM ve TailwindCSS)
Content Script'ler hedef sayfanın DOM'una enjekte edildiği için CSS çakışmaları (style bleed) yaşanması kaçınılmazdır. Modern çözüm:
1.  Content Script UI'ını bir Web Component olarak (veya Shadow DOM içine) render etmek.
2.  TailwindCSS yapılandırmasını bu Shadow DOM köküne enjekte etmek.
*WXT bu işlemi `createShadowRootUi` helper'ı ile zahmetsiz hale getirir.*

### State Management (Zustand ve Chrome Storage)
Service Worker, Content Script ve Popup arasındaki senkronizasyonu sağlamak için `chrome.storage.local` veya `chrome.storage.sync` kullanılır. React ekosisteminde **Zustand** veya **Jotai**, bu storage API'leri ile middleware üzerinden bağlanarak (örn. `zustand-persist` veya özel senkronizasyon hook'ları) reaktif, sekmeler arası senkronize edilmiş bir global state oluşturur.

---

## 3. Test ve Kalite Güvencesi

### Unit & Integration Testleri (Vitest)
Vite kullanıldığı için test aracı olarak **Vitest** tercih edilir. Service Worker fonksiyonları ve mesajlaşma katmanı, `chrome.*` API'leri mocklanarak (örn. `vitest-chrome-mock` kullanılarak) test edilir. İş mantığı (Business logic) framework'ten bağımsız, izole modüllerde (Clean Architecture) yazılmalıdır.

### End-to-End (E2E) Testleri (Playwright)
Eklentilerin uçtan uca testi **Playwright** ile Chromium'un `headed` veya `headless` (new headless) modunda eklenti argümanlarıyla başlatılmasıyla yapılır:
```javascript
const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [
    `--disable-extensions-except=${pathToExtension}`,
    `--load-extension=${pathToExtension}`
  ]
});
```
Playwright, Popup'ı bir sayfa gibi açabilir, Content Script'lerin hedef web sayfasındaki etkileşimlerini (DOM manipülasyonu) doğrulayabilir.

---

## 4. Chrome Web Store Dağıtım ve Yayın Süreci

### Web Store Developer Dashboard
Uygulamayı mağazada yayınlamak için bir Geliştirici Hesabı açılmalı ve tek seferlik **5$** kayıt ücreti ödenmelidir. 

### Manifest V3 ve İnceleme İlkeleri
*   **Single Purpose (Tek Amaç):** Eklenti tek ve net bir işlevi yerine getirmelidir.
*   **Gizlilik ve İzinler:** İstenen her izin (örn. `activeTab`, `storage`, `host_permissions`) "Neden gerekli?" sorusuyla haklı çıkarılmalıdır (Justification). Mümkün olduğunca dar kapsamlı izinler (`<all_urls>` yerine spesifik domainler) tercih edilmelidir.
*   Uzakta barındırılan kod (Remote Hosted Code) kullanımı MV3'te kesinlikle yasaktır.

### CI/CD ile Otomatik Dağıtım (GitHub Actions)
Manuel paketleme (zip) ve yükleme yerine modern iş akışlarında GitHub Actions kullanılır.
Gerekli API kimlik bilgileri (GCP OAuth Client ID, Secret, Refresh Token) alındıktan sonra:
```yaml
name: Publish Extension
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci && npm run build
      - name: Upload & Publish to Web Store
        uses: mnao305/chrome-extension-upload@v5
        with:
          file-path: .output/extension.zip
          extension-id: ${{ secrets.EXTENSION_ID }}
          client-id: ${{ secrets.CLIENT_ID }}
          client-secret: ${{ secrets.CLIENT_SECRET }}
          refresh-token: ${{ secrets.REFRESH_TOKEN }}
          publish: true
```

---

## 5. Monetization ve Analitik

### Eklenti İçi Ödeme Modelleri
Google Web Store kendi ödeme sistemini yıllar önce kapattığı için harici sağlayıcılar kullanılır:
*   **ExtensionPay:** Eklentiler için özel tasarlanmış, kurulumu en kolay Stripe wrapper'ı.
*   **Stripe Checkout / LemonSqueezy:** Daha düşük komisyon oranları ve kendi backend'ini (Firebase/Supabase) kullanarak abonelik/lisans yönetimi yapmak isteyenler için endüstri standartlarıdır.

### Service Worker ve Google Analytics 4 (GA4)
MV3 Service Worker'ları `window` veya `document` objelerine sahip olmadığı için klasik GA script'leri (gtag.js) çalışmaz. Bunun yerine **GA4 Measurement Protocol HTTP API** kullanılarak doğrudan backend'e/Analytics sunucularına HTTP `fetch` istekleriyle `client_id` (cihaza/kuruluma özel UUID) ve etkinlik (event) verileri gönderilir. WXT ve Plasmo gibi araçların topluluk tarafından geliştirilmiş GA4 paketleri mevcuttur.

---

## 6. Adım Adım Modern Eklenti Oluşturma Kılavuzu (WXT + React + Tailwind)

### Adım 1: Projeyi Başlatma
```bash
npx wxt@latest init my-modern-extension --template react-ts
cd my-modern-extension
npm install
```

### Adım 2: TailwindCSS Kurulumu
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
`tailwind.config.js` yapılandırması:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./entrypoints/**/*.{html,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

### Adım 3: Popup Component (React)
`entrypoints/popup/index.html` ve `entrypoints/popup/App.tsx` WXT tarafından otomatik olarak popup eklentisi şeklinde yorumlanır.

```tsx
// entrypoints/popup/App.tsx
import './style.css'; // Tailwind importları (@tailwind base vb.)

export default function App() {
  return (
    <div className="p-4 w-64 bg-slate-50 text-slate-900">
      <h1 className="text-xl font-bold mb-2">Modern Extension</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
        Aksiyon Al
      </button>
    </div>
  );
}
```

### Adım 4: Content Script ve Shadow DOM İzolasyonu
Hedef sayfalara UI enjekte ederken stillerin karışmaması için:
```tsx
// entrypoints/content.tsx
import { createRoot } from 'react-dom/client';
import tailwindCss from './style.css?inline'; // Vite raw import
import App from './components/ContentApp';

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main(ctx) {
    const ui = createShadowRootUi(ctx, {
      name: 'my-isolated-ui',
      position: 'inline',
      anchor: 'body',
      append: 'first',
      onMount: (container) => {
        // Tailwind stilini shadow root'a ekle
        const style = document.createElement('style');
        style.textContent = tailwindCss;
        container.appendChild(style);
        
        const root = createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => root?.unmount(),
    });
    
    ui.mount();
  },
});
```

### Adım 5: Derleme ve Çalıştırma
```bash
npm run dev   # HMR ile geliştirme modunu (Chrome) başlatır.
npm run build # .output/ klasörüne zip ve dağıtım dosyalarını oluşturur.
```
WXT, Manifest V3 politikalarına tam uyumlu bir paket çıkarır ve `manifest.json` otomatik olarak `package.json` ve dosya sistemindeki entrypoint'lerden harmanlanarak derlenir.
