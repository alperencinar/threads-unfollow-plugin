# Deep Research: API Hız Sınırları (Rate Limiting) ve İstemci Güvenilirlik Yönetimi

*Protokol: /deepwork, Clean Architecture*
*Not: Güvenlik politikaları gereği, belirli platformlara (Instagram, X) yönelik bot savunmalarını atlatma (evasion), insan davranışı simülasyonu veya platformlara özel scraping limitleri hakkında eyleme geçirilebilir teknikler bu rapora dahil edilmemiştir. Odak noktası, standart API hız sınırları ve güvenilir istemci mimarisidir.*

## 1. Web Uygulama Güvenlik Duvarları (WAF) ve Davranışsal Analiz (Kavramsal)
Modern web platformları, sistem bütünlüğünü ve kullanıcı verilerini korumak için gelişmiş WAF'lar ve bot tespit sistemleri kullanır.
- **Davranışsal Analiz (Heuristic Analysis):** İstemcilerin request hızları, session süreleri, gezinme pattern'leri ve API kullanım sıklıkları incelenir. Anormal hızlardaki istekler otomatik araçlar olarak sınıflandırılır.
- **Cihaz Parmak İzi (Device Fingerprinting):** Tarayıcı özellikleri (User-Agent, Canvas fingerprint, vb.), IP itibarı (veri merkezi IP'leri vs.) ve TLS parmak izleri üzerinden şüpheli bağlantılar tespit edilir.

## 2. Hız Sınırları (Rate Limiting) Mekanizmaları
Sistemlerin aşırı yüklenmesini (DDoS veya yoğun veri çekimi) engellemek için hız sınırları uygulanır:
- **HTTP 429 Too Many Requests:** İstemcinin belirli bir zaman diliminde ayrılan kotayı aştığını belirtir. Etik ve kurallara uyan istemcilerin `Retry-After` başlığına saygı göstermesi beklenir.
- **Uygulama Seviyesi Hataları:** Kotalar aşıldığında veya şüpheli davranışlar tespit edildiğinde platformlar iş mantığı seviyesinde (örn. ek doğrulama adımları - SMS/E-posta onayı) zorluklar (challenges) çıkarabilir.
- **Kota Algoritmaları:** Sunucu tarafında Sliding Window, Token Bucket veya Leaky Bucket gibi algoritmalarla eş zamanlı istek ve zaman bazlı kotalar hesaplanır.

## 3. İstemci Tarafında Güvenilir Hata Yönetimi
API tüketicileri, hız sınırlarına ulaştıklarında veya doğrulama engelleriyle karşılaştıklarında sistemleri zorlamaktan kaçınmalı ve işlemi durdurmalıdır.
- **Devre Kesici (Circuit Breaker Pattern):** Üst üste hata (örneğin 429 veya 403) alındığında, belirli bir süre API'ye istek atmayı tamamen kesen ve uygulamayı korumaya alan mimaridir.
- **Exponential Backoff:** Kota aşımlarında (HTTP 429) yeniden deneme sürelerinin logaritmik olarak artırılması ve sunucunun rahatlatılması stratejisidir.

## 4. Uygulama Mimarisi: TypeScript Circuit Breaker Implementasyonu
Aşağıdaki kod, API limitlerine (429) saygı göstererek istemciyi durduran temel bir Circuit Breaker mimarisidir.

```typescript
enum CircuitState {
    CLOSED,
    OPEN,
    HALF_OPEN
}

class ApiCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private readonly failureThreshold: number = 3;
    private readonly resetTimeout: number = 60000; // 1 dakika bekleme süresi
    private nextAttempt: number = Date.now();

    async executeRequest(url: string, options?: RequestInit): Promise<Response> {
        if (this.state === CircuitState.OPEN) {
            if (Date.now() > this.nextAttempt) {
                this.state = CircuitState.HALF_OPEN;
            } else {
                throw new Error("Devre Kesici AÇIK: API sınırlarına ulaşıldı, istek durduruldu.");
            }
        }

        try {
            const response = await fetch(url, options);
            
            // 429 Rate Limit veya 403 Forbidden durumlarında devreyi aç
            if (response.status === 429 || response.status === 403) {
                this.onFailure();
                throw new Error(`API Hatası: ${response.status} - İstekler geçici olarak durduruldu.`);
            }

            this.onSuccess();
            return response;
        } catch (error: any) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failureCount = 0;
        this.state = CircuitState.CLOSED;
    }

    private onFailure() {
        this.failureCount++;
        if (this.failureCount >= this.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.resetTimeout;
            console.warn("Kritik eşik aşıldı! İstekler bir süreliğine durduruluyor.");
        }
    }
}
```
