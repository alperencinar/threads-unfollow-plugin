# Test Otomasyonu, CI/CD ve Üretim Gözlemlenebilirliği
**Tarih:** 30 Eylül 2026
**Protokol:** /deepwork, Clean Architecture
**Bağlam:** Google Eklentileri (Chrome Extensions MV3, Google Workspace Add-ons & Apps Script, Google Gemini / Vertex AI Extensions) için derinlemesine araştırma.

## 1. Profesyonel Kalite Güvencesi (QA) ve Test Piramidi

Modern 2026 standartlarında eklenti testleri, üç temel sütun üzerinde yükselmektedir:

### 1.1 Birim Testler (Unit Testing)
İş mantığının ve state yönetiminin testleri hızlı, izole ve tekrarlanabilir olmalıdır.
*   **Araçlar:** Vitest veya Jest.
*   **Mock Stratejisi:** Chrome API'leri (`chrome.storage`, `chrome.runtime`, vs.) doğal olarak Node.js ortamında bulunmaz. Bu nedenle `sinon-chrome`, `jest-chrome` veya özel TypeScript mock adaptörleri kullanılarak tarayıcı ortamı simüle edilir.
*   **Vitest Chrome Mock Örneği:**
    ```typescript
    import { vi, describe, it, expect } from 'vitest';
    
    // chrome namespace'ini mockla
    const mockChrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
        },
      },
    };
    global.chrome = mockChrome as any;
    
    describe('Storage Servisi', () => {
      it('veriyi doğru kaydetmeli', async () => {
        await mockChrome.storage.local.set({ key: 'value' });
        expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ key: 'value' });
      });
    });
    ```

### 1.2 Entegrasyon Testleri
Bu testler, eklentinin farklı bileşenlerinin (Background/Service Worker, Content Scripts, Popup) birbirleriyle ve Storage ile olan etkileşimini, mesajlaşmayı (cross-context) doğrular.
*   Mocklanmış bir mesajlaşma aracı ve izole edilmiş ortamlar kurularak `chrome.runtime.sendMessage` ve `chrome.runtime.onMessage.addListener` test edilir.

### 1.3 Uçtan Uca (E2E) Testler
2026'da gerçek bir Chromium motoru üzerinde test yapmak, Playwright ile artık standarttır.
*   **Playwright / Puppeteer Kullanımı:** Kalıcı tarayıcı bağlamı (Persistent Context) kullanılarak, eklenti testlere dahil edilir.
*   **Playwright Test Dosyası Örneği:**
    ```javascript
    import { test, expect, chromium } from '@playwright/test';
    import path from 'path';

    const pathToExtension = path.join(__dirname, '../dist');

    test.use({
      contextOptions: {
        args: [
          `--disable-extensions-except=${pathToExtension}`,
          `--load-extension=${pathToExtension}`,
        ],
      },
    });

    test('Popup açılmalı ve etkileşim sağlanmalı', async ({ context, page }) => {
      // Service worker hazır olana kadar bekle ve Extension ID al
      let [background] = context.serviceWorkers();
      if (!background) {
        background = await context.waitForEvent('serviceworker');
      }
      const extensionId = background.url().split('/')[2];

      // Popup'ı aç
      await page.goto(`chrome-extension://${extensionId}/popup.html`);
      
      // Assertion
      const title = page.locator('h1');
      await expect(title).toHaveText('Google Eklentisi Yüklendi');
    });
    ```

## 2. Modern Derleme ve Paketleme (Build Pipeline)

### 2.1 Çoklu Ortam Yapılandırması (WXT / Vite)
*   **Vite/WXT:** HMR (Hot Module Replacement) ile geliştirme süresini minimize eden, hızlı derleme araçları.
*   **Çoklu Ortam:** `dev`, `staging` ve `prod` konfigürasyonları ayarlanarak ortam bazlı `.env` yönetimi.

### 2.2 Güvenlik ve Optimizasyon
*   **Hassas Anahtarların Ayrıştırılması:** API anahtarları `.env` üzerinden yönetilir ve paketleme esnasında bundle dışında bırakılır (veya güvenli bir backend servisine devredilir).
*   **Tree-shaking ve Minifikasyon:** Sadece kullanılan kod bloğu pakete dahil edilir, kod boyutu küçültülür.

### 2.3 Semantik Sürümleme (SemVer)
*   GitHub Actions, sürüm etiketlemesi yaparak `manifest.json`'daki versiyonu otomatik günceller ve changelog oluşturur (örneğin `semantic-release` veya `release-it`).

## 3. CI/CD ve Otomatik Mağaza Yayınlama

Modern geliştirme yaşam döngüsünde (SDLC), kod birleştirildikten (merge) sonra her şey otomatik ilerler.

### 3.1 GitHub Actions ile Otomasyon
*   Kod depoya push edildiğinde (veya PR açıldığında) otomatik olarak bağımlılıklar yüklenir, lint ve testler çalıştırılır.
*   Testler geçerse `build` alınır ve zip dosyası oluşturulur.

### 3.2 Chrome Web Store Publish API
*   `chrome-webstore-upload-cli` (veya benzer API sarmalayıcıları) kullanılarak oluşturulan paket otomatik olarak Chrome Web Store'a yüklenir ve incelemeye gönderilir.
*   **Google Workspace Marketplace API** de benzer REST çağrılarıyla Google Docs/Sheets eklentilerini günceller.

### 3.3 Kademeli Dağıtım (Staged Rollout) ve Rollback
*   Yayınlama esnasında trafiğin önce %10'una yeni sürüm gösterilerek stabilite gözlemlenir.
*   Kritik bir sorun olduğunda hızlı geri alma (Rollback) senaryoları CI üzerinde tetiklenerek eski sürüm aktif edilir.

### 3.4 Örnek CI/CD YAML (GitHub Actions)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ "main" ]

jobs:
  build-test-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install Dependencies
        run: npm ci
        
      - name: Lint ve Unit Test
        run: npm run lint && npm run test:unit
        
      - name: Build Extension
        run: npm run build
        
      - name: Zip Artifact
        run: zip -r extension.zip dist/
        
      - name: Upload to Chrome Web Store
        env:
          EXTENSION_ID: ${{ secrets.EXTENSION_ID }}
          CLIENT_ID: ${{ secrets.CLIENT_ID }}
          CLIENT_SECRET: ${{ secrets.CLIENT_SECRET }}
          REFRESH_TOKEN: ${{ secrets.REFRESH_TOKEN }}
        run: |
          npx chrome-webstore-upload-cli@3 \
            --source extension.zip \
            --extension-id $EXTENSION_ID \
            --client-id $CLIENT_ID \
            --client-secret $CLIENT_SECRET \
            --refresh-token $REFRESH_TOKEN \
            --auto-publish
```

## 4. Üretim Gözlemlenebilirliği (Monitoring & Observability)

Google Eklentileri 2026'da (Manifest V3) Service Worker yapısı ile çalıştığı için izleme stratejileri özeldir.

### 4.1 Hata Yakalama (Sentry / Bugsnag)
*   **Service Worker Entegrasyonu:** Sentry, Web Worker'ları destekler. Service Worker içindeki yakalanmayan hatalar (unhandled promise rejections) yakalanıp Sentry Dashboard'a aktarılır.
*   **Sentry Entegrasyon Kodu:**
    ```typescript
    import * as Sentry from '@sentry/browser';

    Sentry.init({
      dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
      integrations: [
        new Sentry.BrowserTracing(),
      ],
      tracesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'production'
    });

    // Worker'da global hata yakalama
    self.addEventListener('error', (event) => {
      Sentry.captureException(event.error);
    });
    ```

### 4.2 Gizlilik Odaklı Telemetri ve Analitik
*   Manifest V3 güvenlik kısıtlamaları dış ağ kaynaklarını kısıtlar. Geleneksel script tag tabanlı Analytics çalışmaz.
*   **GA4 Measurement Protocol:** HTTP API üzerinden fetch kullanılarak anonim kullanıcı etkileşim verileri Google Analytics'e gönderilir. Bu, eklentinin izinsiz veri toplamasını engelleyerek kullanıcı gizliliğine de saygı gösterir.

### 4.3 Alarmlar ve Uyarılar
*   Kritik çökme (crash) oranlarında veya API cevap sürelerinde aşırı performans düşüşü yaşanırsa, PagerDuty veya Slack/Discord webhook'ları ile alarmlar tetiklenir.
