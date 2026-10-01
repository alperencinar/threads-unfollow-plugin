export type Language = 'tr' | 'en';

export const translations = {
  tr: {
    appTitle: 'Threads Analizcisi',
    followers: 'Takipçi',
    following: 'Takip Edilen',
    reset: 'Sıfırla',
    resetConfirm: 'Tüm takipçi geçmişi ve veritabanı temizlensin mi?',
    safeModeTitle: '🛡️ Pasif Güvenli Mod Aktif',
    safeModeDescWaiting:
      "Hesap güvenliğiniz için bot isteği atılmaz. Lütfen Threads profilinizde 'Takipçiler' veya 'Takip Edilenler' listesini açıp aşağı doğru kaydırın (scroll).",
    safeModeDescCaptured:
      '✨ Veriler arka planda yakalandı! Daha fazla kişi listelemek için kaydırmaya devam edebilirsiniz.',
    tabUnfollowers: 'Çıkanlar',
    tabNotFollowing: 'Takip Etmeyen',
    tabNewFollowers: 'Yeni',
    tabFans: 'Hayranlar',
    tabMutuals: 'Karşılıklı',
    emptyUnfollowers: 'Henüz seni takipten çıkan kimse tespit edilmedi.',
    emptyNotFollowing: 'Geri takip etmeyen kimse bulunamadı.',
    emptyNewFollowers: 'Yeni takipçi bulunmuyor.',
    emptyFans: 'Hayran listesi boş.',
    emptyMutuals: 'Karşılıklı takipleştiğin kimse bulunamadı.',
    emptyGeneral: 'Kayıt bulunamadı.',
    openProfile: 'Profili Aç',
    switchLang: 'EN',
    unfollow: 'Takipten Çık',
    unfollowing: 'Çıkılıyor...',
    unfollowed: 'Çıkarıldı',
    unfollowAll: '⚡ Tümünü Güvenle Çıkar',
    unfollowAllDesc: 'İnsansal 12-25 sn bekleme ile güvenli kuyruk (Maks. 25 kişi)',
    unfollowPause: 'Durdur',
    unfollowResume: 'Devam Et',
    unfollowStop: 'İptal Et',
    unfollowWaiting: 'Sonraki işlem için bekleniyor',
    unfollowProcessing: 'Takipten çıkılıyor',
    unfollowDone: '✅ Seans başarıyla tamamlandı!',
    unfollowRateLimited:
      '⚠️ Threads işlem limiti uyarısı verdi. Hesabınızı korumak için kuyruk durduruldu. Lütfen birkaç saat bekleyin.',
    unfollowNoTab: 'İşlem için lütfen bir Threads sekmesini açık tutun.',
    refreshRequiredTitle: '⚠️ Sayfayı Yenilemeniz Gerekiyor',
    refreshRequiredDesc:
      'Eklentinin Threads ile bağlantı kurabilmesi için lütfen açık olan Threads sekmesini bir defa yenileyin.',
    refreshButton: '🔄 Threads Sekmesini Yenile',
    notOnThreadsTitle: '🌐 Threads Sekmesi Bulunamadı',
    notOnThreadsDesc: 'Takipçi verilerini listeleyebilmek için lütfen Threads.com adresini açın.',
    openThreadsButton: "Threads'i Aç",
  },
  en: {
    appTitle: 'Threads Tracker',
    followers: 'Followers',
    following: 'Following',
    reset: 'Reset',
    resetConfirm: 'Are you sure you want to clear all follower history and data?',
    safeModeTitle: '🛡️ Passive Safe Mode Active',
    safeModeDescWaiting:
      "No bot requests are sent to protect your account. Please open 'Followers' or 'Following' modal on your Threads profile and scroll down.",
    safeModeDescCaptured:
      '✨ Data is actively being captured! Keep scrolling to load more users.',
    tabUnfollowers: 'Unfollowers',
    tabNotFollowing: 'Not Following Back',
    tabNewFollowers: 'New',
    tabFans: 'Fans',
    tabMutuals: 'Mutuals',
    emptyUnfollowers: 'No unfollowers detected yet.',
    emptyNotFollowing: 'Everyone you follow follows you back.',
    emptyNewFollowers: 'No new followers found.',
    emptyFans: 'Fans list is empty.',
    emptyMutuals: 'No mutual followers found.',
    emptyGeneral: 'No records found.',
    openProfile: 'Open Profile',
    switchLang: 'TR',
    unfollow: 'Unfollow',
    unfollowing: 'Unfollowing...',
    unfollowed: 'Unfollowed',
    unfollowAll: '⚡ Safe Unfollow All',
    unfollowAllDesc: 'Safe queue with 12-25s human jitter (Max 25 users)',
    unfollowPause: 'Pause',
    unfollowResume: 'Resume',
    unfollowStop: 'Cancel',
    unfollowWaiting: 'Waiting for next user',
    unfollowProcessing: 'Unfollowing',
    unfollowDone: '✅ Session completed successfully!',
    unfollowRateLimited:
      '⚠️ Threads rate limit or action block detected. Queue stopped to protect your account. Please wait a few hours.',
    unfollowNoTab: 'Please keep an active Threads tab open to perform this action.',
    refreshRequiredTitle: '⚠️ Page Refresh Required',
    refreshRequiredDesc:
      'Please refresh the open Threads tab once so the extension can establish a connection.',
    refreshButton: '🔄 Refresh Threads Tab',
    notOnThreadsTitle: '🌐 Threads Tab Not Found',
    notOnThreadsDesc: 'Please open Threads.com to view your followers and following lists.',
    openThreadsButton: 'Open Threads',
  },
};

export function getDefaultLanguage(): Language {
  try {
    const saved = localStorage.getItem('threads_unfollower_lang');
    if (saved === 'tr' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem('threads_unfollower_lang', lang);
  } catch {
    // Ignore storage restrictions
  }
}
