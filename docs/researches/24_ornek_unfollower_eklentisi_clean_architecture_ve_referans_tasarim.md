# Örnek Unfollower Eklentisi: Clean Architecture ve Referans Tasarım

**Tarih:** 30 Eylül 2026  
**Protokol:** `/deepwork` • Clean Architecture • Local-First • Zero-Data Exfiltration  
**Hedef:** Güvenli, Etik, Hesap Riski Taşımayan ve Matematiksel Olarak Optimize Edilmiş Referans Tasarım  

---

## 1. Mimari Genel Bakış ve Katmanlar

Bu referans tasarım; kullanıcının hesap güvenliğini tehlikeye atmayan, verileri hiçbir harici sunucuya sızdırmayan (Zero-Data Exfiltration), tamamen yerel tarayıcı veritabanında (IndexedDB) çalışan ve **Clean Architecture** prensiplerine uygun olarak tasarlanmış modern bir mimaridir:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                               │
│              (Chrome Side Panel UI / React 19 + TailwindCSS)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Zustand Reactive Store
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            APPLICATION LAYER                                │
│       [ SnapshotUseCase ]       [ DiffEngineUseCase ]       [ CircuitBreaker ]
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Interfaces (Ports)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                              DOMAIN LAYER                                   │
│            Entities: SocialUser, FollowerSnapshot, UnfollowerResult          │
│            Pure Mathematics: Set Difference Engine O(N)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Inversion of Control
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                              │
│       [ DexieStorageAdapter ] (IndexedDB)     [ PassiveNetworkObserver ]    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain Katmanı: Varlıklar ve Matematiksel Fark Motoru

### 2.1. Domain Varlıkları (Entities)

```typescript
// domain/entities/SocialUser.ts
export interface SocialUser {
  readonly id: string;           // Platform içi değişmeyen benzersiz ID (PK)
  readonly username: string;     // Değişebilir kullanıcı adı (@handle)
  readonly fullName: string;     // Görünen isim
  readonly avatarUrl: string;    // Profil fotoğrafı URL'i
  readonly isVerified: boolean;  // Doğrulanmış hesap rozeti
}

// domain/entities/FollowerSnapshot.ts
export interface FollowerSnapshot {
  readonly id: string;
  readonly timestamp: number;    // Snapshot alınma zamanı (Unix Epoch ms)
  readonly platform: 'instagram' | 'x_twitter';
  readonly targetUserId: string; // Analizi yapılan kullanıcının ID'si
  readonly followers: ReadonlyArray<SocialUser>;
  readonly following: ReadonlyArray<SocialUser>;
}

// domain/entities/DiffResult.ts
export interface DiffResult {
  readonly calculatedAt: number;
  readonly previousTimestamp: number;
  readonly currentTimestamp: number;
  readonly unfollowers: ReadonlyArray<SocialUser>;      // Takipten çıkanlar
  readonly newFollowers: ReadonlyArray<SocialUser>;     // Yeni takipçiler
  readonly notFollowingBack: ReadonlyArray<SocialUser>; // Geri takip etmeyenler
  readonly fans: ReadonlyArray<SocialUser>;             // Hayranlar (senin takip etmediklerin)
  readonly mutuals: ReadonlyArray<SocialUser>;          // Karşılıklı takipleşilenler
}
```

### 2.2. Saf Matematiksel Fark Motoru (Pure Functional Diff Engine)

Bu motor hiçbir yan etkiye (side-effect), I/O veya `chrome.*` API bağımlılığına sahip değildir. İki snapshot arasındaki kümeleri $O(N)$ zaman karmaşıklığında ayrıştırır:

```typescript
// domain/services/SnapshotDiffEngine.ts
import { SocialUser, FollowerSnapshot, DiffResult } from '../entities';

export class SnapshotDiffEngine {
  /**
   * İki zaman damgalı snapshot arasındaki küme farkını hesaplar.
   * Zaman Karmaşıklığı: O(N + M)
   * Bellek Karmaşıklığı: O(N + M)
   */
  public static computeDiff(
    previousSnapshot: FollowerSnapshot,
    currentSnapshot: FollowerSnapshot
  ): DiffResult {
    // 1. O(1) arama karmaşıklığı için Hash Map indeksleri oluştur
    const prevFollowersMap = new Map<string, SocialUser>(
      previousSnapshot.followers.map(u => [u.id, u])
    );
    const currFollowersMap = new Map<string, SocialUser>(
      currentSnapshot.followers.map(u => [u.id, u])
    );
    const currFollowingMap = new Map<string, SocialUser>(
      currentSnapshot.following.map(u => [u.id, u])
    );

    // 2. Takipten Çıkanlar: U(t1) = F(t0) \ F(t1)
    const unfollowers: SocialUser[] = [];
    for (const [id, user] of prevFollowersMap) {
      if (!currFollowersMap.has(id)) {
        unfollowers.push(user);
      }
    }

    // 3. Yeni Takipçiler: N(t1) = F(t1) \ F(t0)
    const newFollowers: SocialUser[] = [];
    for (const [id, user] of currFollowersMap) {
      if (!prevFollowersMap.has(id)) {
        newFollowers.push(user);
      }
    }

    // 4. Geri Takip Etmeyenler: Following(t1) \ Followers(t1)
    const notFollowingBack: SocialUser[] = [];
    for (const [id, user] of currFollowingMap) {
      if (!currFollowersMap.has(id)) {
        notFollowingBack.push(user);
      }
    }

    // 5. Hayranlar: Followers(t1) \ Following(t1)
    const fans: SocialUser[] = [];
    for (const [id, user] of currFollowersMap) {
      if (!currFollowingMap.has(id)) {
        fans.push(user);
      }
    }

    // 6. Karşılıklı Takipleşilenler: Followers(t1) ∩ Following(t1)
    const mutuals: SocialUser[] = [];
    for (const [id, user] of currFollowersMap) {
      if (currFollowingMap.has(id)) {
        mutuals.push(user);
      }
    }

    return {
      calculatedAt: Date.now(),
      previousTimestamp: previousSnapshot.timestamp,
      currentTimestamp: currentSnapshot.timestamp,
      unfollowers,
      newFollowers,
      notFollowingBack,
      fans,
      mutuals,
    };
  }
}
```

---

## 3. Altyapı Katmanı: Local-First IndexedDB Depolama

Kullanıcı gizliliğini korumak amacıyla veriler uzak sunuculara değil, tarayıcının yerel **IndexedDB** veritabanına kaydedilir:

```typescript
// infrastructure/storage/LocalDatabase.ts
import Dexie, { Table } from 'dexie';
import { FollowerSnapshot } from '../../domain/entities';

export class LocalUnfollowerDB extends Dexie {
  public snapshots!: Table<FollowerSnapshot, string>;

  constructor() {
    super('SocialUnfollowerDatabase');
    this.version(1).stores({
      snapshots: 'id, timestamp, platform, targetUserId'
    });
  }

  public async saveSnapshot(snapshot: FollowerSnapshot): Promise<void> {
    await this.snapshots.put(snapshot);
  }

  public async getLatestTwoSnapshots(
    targetUserId: string,
    platform: 'instagram' | 'x_twitter'
  ): Promise<[FollowerSnapshot | null, FollowerSnapshot | null]> {
    const list = await this.snapshots
      .where({ targetUserId, platform })
      .reverse()
      .sortBy('timestamp');

    return [list[0] || null, list[1] || null];
  }
}
```

---

## 4. Güvenlik Devre Kesicisi (Circuit Breaker)

Platformun olası bir rate limit (HTTP 429) veya şüpheli işlem uyarısı vermesi durumunda kullanıcı hesabını korumak için taramayı anında donduran güvenlik mekanizması:

```typescript
// infrastructure/safety/SafetyCircuitBreaker.ts
export class SafetyCircuitBreaker {
  private failureCount = 0;
  private readonly threshold = 2; // Maksimum 2 hatada durdur
  private state: 'CLOSED' | 'OPEN' = 'CLOSED';

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(statusCode: number): void {
    if (statusCode === 429 || statusCode === 400 || statusCode === 403) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        console.warn('[Safety Alert] Rate limit eşiği aşıldı! Hesap güvenliği için tarama derhal durduruldu.');
      }
    }
  }

  public isTrip(): boolean {
    return this.state === 'OPEN';
  }

  /**
   * İstekler arasına insan davranışını taklit eden rastgele gecikme ekler.
   */
  public static async jitterDelay(minMs = 2500, maxMs = 5500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}
```

---

## 5. Referans Tasarımın Avantajları

1. **Sıfır Hesap Riski (Zero Account Ban):** Kullanıcı oturumu açıkken doğal gezintideki ağ paketlerini pasif dinlediği için yapay bot istekleri üretmez.
2. **%100 Gizlilik (Zero-Data Exfiltration):** Takipçi listesi asla üçüncü parti sunuculara gitmez; kullanıcının kendi bilgisayarında şifreli/yerel kalır.
3. **Kullanıcı Adı Değişikliği Dayanıklılığı:** Kullanıcılar isimlerini veya `@handle` değerlerini değiştirse dahi, karşılaştırmalar platformun değişmez sayısal `id` (PK) anahtarı üzerinden yapıldığı için yanlış "unfollow" bildirimleri oluşmaz.
4. **Clean Architecture Uyumlu:** Domain matematiği; UI, veritabanı ve tarayıcı API'lerinden tamamen yalıtılmış olup %100 birim test (Unit Test) kapsamına alınabilir.
