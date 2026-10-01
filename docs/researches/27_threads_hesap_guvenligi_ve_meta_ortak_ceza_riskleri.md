# Threads Hesap Güvenliği ve Meta Ortak Ceza Riskleri

**Tarih:** 2026-09-30
**Protokol:** /deepwork, Clean Architecture
**Doküman Tipi:** Mimari Güvenlik ve Risk Analizi Raporu

## 1. Yönetici Özeti
Bu doküman, Meta'nın Threads ve Instagram platformları arasındaki birleşik kimlik yönetim altyapısını, bu yapıdaki "Çapraz Ceza" (Cross-Platform Penalty) risklerini ve Threads için Chrome eklentisi geliştirilirken alınması zorunlu mimari güvenlik tedbirlerini incelemektedir. Kullanıcı güvenliği ve "zarar vermeme" (do no harm) prensibi ön planda tutularak, hesap kısıtlamalarını engelleyecek savunma tasarımları detaylandırılmıştır.

## 2. Meta Birleşik Hesap Ekosistemi ve "Çapraz Ceza" (Cross-Platform Penalty) Riski

### 2.1. Threads ve Instagram Ortak Kimlik Omurgası
Meta ekosisteminde Threads, Instagram kimlik altyapısının (SSO ve Graph API altyapısının genişletilmiş hali) üzerinde çalışmaktadır. İki platform aynı Session ID ve kimlik denetim mekanizmalarını (Auth Tokens) paylaşır. Bu durum, veri toplama veya işlem yapma noktasında yüksek riskler doğurur:
*   **Çapraz Ceza (Cross-Platform Penalty):** Threads üzerinde tespit edilen otomatize bir işlem (örneğin aşırı API isteği), doğrudan kullanıcının ana Instagram hesabının kısıtlanmasına (Action Block, Shadowban, Checkpoint) yol açabilir.
*   **"Threads Eklentisi Kullandım, Instagram Hesabım Kapandı":** En kötü durum (Worst-Case) senaryosudur. Bir eklentinin hatalı döngü tasarımı, kullanıcının 10 yıllık Instagram hesabını kalıcı olarak kaybetmesine neden olabilir. Bu risk, eklentinin hayatta kalması için en büyük tehdittir.

### 2.2. Meta Davranışsal Algılama Motoru (Heuristics & Anti-Bot)
Meta sistemleri, otomasyon araçlarını tespit etmek için gelişmiş algoritmalar (Heuristics) kullanır:
*   **İstek Sıklığı ve Navigasyon Hızı:** İnsan üstü hızlarda DOM okuma veya arka planda API çağrıları tetikleme. Saniyede belirli bir eşiğin üzerindeki istekler `feedback_required` veya `429 Too Many Requests` hatası fırlatır.
*   **UI Etkileşim Yoksunluğu:** Fare hareketleri, scroll ivmesi ve tıklama gecikmeleri (delay) izlenir. Pasif DOM manipülasyonu yapan ancak UI eventi üretmeyen scriptler "Bot" olarak işaretlenir.
*   **Checkpoint Zorlukları:** Şüpheli aktivite durumunda platform, SMS doğrulama, Selfie ile doğrulama (Video Selfie) gibi "Checkpoint" engelleri çıkarır. Arka plan scriptleri bu engelleri aşamaz ve hesabın kalıcı olarak kilitlenmesine neden olur.

## 3. Eklenti Geliştiricisinin Alması Gereken Savunma Prensipleri

Kullanıcıyı korumak için aşağıdaki mimari ve tasarımsal kurallar **mutlak surette** uygulanmalıdır:

### 3.1. Asla Otomatik Döngüsel İstek (Auto-Crawler) Yapmama Kuralı
*   Eklenti arka planda gizlice Threads API'sine veya DOM'a periyodik istek atan `setInterval` veya `setTimeout` döngülerine sahip olmamalıdır.
*   "Sayfayı otomatik yenile ve veriyi çek" (Auto-Refresh & Scrape) pattern'i kesinlikle yasaktır.

### 3.2. "Sadece Kullanıcı Kaydırdıkça Oku" (Passive Human-Driven Mode)
*   Veri toplama, sadece kullanıcı kendi iradesiyle sayfayı kaydırdığında (Scroll Event) veya aktif olarak Threads'i kullandığında pasif bir dinleyici (MutationObserver / Interceptor) olarak çalışmalıdır.
*   İsteği her zaman **kullanıcı tetiklemeli**, eklenti sadece "dinlemeli" ve yakalamalıdır (Passive Listener Mode).

### 3.3. Yerel Veri İzolasyonu (Local-First) ve Kimlik Güvenliği
*   Kullanıcının verileri dış sunuculara otomatik sızdırılmamalıdır. Tüm analizler `chrome.storage.local` veya IndexedDB üzerinde (Local-First) yapılmalıdır.
*   Kullanıcıdan asla Meta şifresi, Cookie string'i veya Auth Token manuel olarak istenmemelidir. Eklenti, mevcut oturum üzerinden sadece görsel/DOM yansımasını okumalıdır.

### 3.4. Kullanıcı Bilgilendirme ve Risk Şeffaflığı
*   Eklenti arayüzünde "Hesap Güvenlik Durumu" göstergesi (Yeşil/Sarı/Kırmızı ikonlar) bulunmalıdır.
*   Kullanıcı, eklentinin arka planda işlem yapmadığı ve Instagram hesabının güvende olduğu konusunda sürekli olarak arayüz üzerinden rahatlatılmalıdır.

## 4. Risk Analiz Matrisi ve Güvenlik Değerlendirmesi

| Tehdit | Etki (Impact) | Olasılık (Likelihood) | Alınacak Önlem (Mitigation) |
| :--- | :---: | :---: | :--- |
| **Action Block (İşlem Engeli)** | Yüksek | Yüksek | Yalnızca "Passive Human-Driven" veri okuma modeli. DOM okuma hızını sınırlandırma. |
| **Shadowban (Görünmezlik C.)** | Yüksek | Orta | API'ye doğrudan HTTP isteği (fetch) yapmamak, sadece Network Intercept (chrome.webRequest) kullanmak. |
| **Hesap Kapatma (Ban)** | Kritik | Düşük | Eklentinin herhangi bir Post/Like (Yazma) eylemi yapmasının kesinlikle engellenmesi (Sadece Okuma/Read-Only mod). |

## 5. Etik Beyanname Standartları (Code of Conduct)
1. **Şeffaflık:** "Bu eklenti, kullanıcı adına hiçbir beğeni, paylaşım veya otomatik gezinme yapmaz."
2. **Mahremiyet:** "Veriler kullanıcının cihazında kalır, Meta sunucularına şüpheli iz bırakmaz."
3. **Güvenlik Önceliği:** "Tasarımda öncelik eklentinin hızı değil, Instagram hesabının güvenliğidir."

---
*Bu rapor, Meta'nın güncel hesap güvenlik politikaları ve bot tespiti algoritmaları göz önünde bulundurularak hazırlanmıştır.*
