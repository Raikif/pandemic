# 📺 TV Compatibility Guide

## Masalah Umum dengan TV (Changhong, Samsung, LG, dll)

### 1. **Browser Versi Lama**
TV sering menggunakan browser built-in yang outdated. Browser TV biasanya 2-3 tahun di belakang versi desktop.

**Solusi:**
- Update firmware TV ke versi terbaru
- Gunakan external device: Chromecast, Fire TV Stick, Android TV Box
- Gunakan Laptop/PC yang dihubungkan ke TV via HDMI

### 2. **JavaScript Features Tidak Tersedia**
Browser TV mungkin tidak support:
- ES6 features (arrow functions, const/let, template literals)
- Promise/async-await
- fetch API
- Modern CSS (CSS Grid, Flexbox)

**Solusi yang Sudah Diterapkan:**
- ✅ Browser compatibility check saat load
- ✅ Error message yang jelas jika browser tidak didukung
- ✅ Fallback untuk missing features

### 3. **Firebase SDK Tidak Load**
TV browser mungkin memblok external scripts atau CDN.

**Solusi:**
- Cek koneksi internet TV
- Test buka website lain (YouTube, Netflix) untuk verifikasi internet
- Lihat console error (jika bisa akses developer tools)

### 4. **User Agent String**
Browser TV sering punya user agent yang tidak standar, bisa menyebabkan website tidak recognize device.

**Cek User Agent:**
```javascript
// Di browser TV, buka console dan ketik:
console.log(navigator.userAgent);
```

Common TV User Agents:
- **Changhong**: Mozilla/5.0 (Linux; Android 7.1.1; Changhong Smart TV)
- **Samsung Tizen**: Mozilla/5.0 (SMART-TV; Linux; Tizen)
- **LG webOS**: Mozilla/5.0 (Web0S; Linux/SmartTV)

## Cara Test di TV

### Method 1: Direct URL
1. Buka browser TV
2. Masukkan URL: `http://[IP_COMPUTER]:port/pandemic/host.html`
3. Jika error, coba IP address langsung (bukan localhost)

### Method 2: Chromecast/AirPlay
1. Buka di laptop/phone
2. Cast screen ke TV
3. Ini paling reliable karena menggunakan browser modern

### Method 3: HDMI Cable
1. Hubungkan laptop ke TV via HDMI
2. TV jadi monitor saja
3. 100% compatibility

## Error Messages & Fixes

### "Firebase SDK not loaded"
**Penyebab:** CDN terblok atau internet lambat
**Fix:**
1. Cek internet TV
2. Refresh halaman (F5 atau reload button)
3. Gunakan method 2/3 di atas

### "Browser tidak didukung"
**Penyebab:** Browser TV terlalu lama
**Fix:**
1. Update firmware TV
2. Gunakan external device
3. HDMI dari laptop (recommended)

### "Game tidak muncul/blank screen"
**Penyebab:** JavaScript error atau CSS tidak support
**Fix:**
1. Buka console (jika ada): F12 atau inspect element
2. Lihat error messages
3. Screenshot error dan report

## Testing Checklist

Sebelum presentasi/main di TV:

- [ ] Test buka host.html di TV browser
- [ ] Cek QR code muncul
- [ ] Test join dari HP (scan QR)
- [ ] Test gameplay basic (move, action)
- [ ] Test card drawing system
- [ ] Prepare backup: laptop + HDMI cable

## Recommended Setup

**Untuk Presentasi/Demo:**
```
[Laptop] --> HDMI --> [TV]
  |
  WiFi
  |
[Phone Players] --> Scan QR --> Join Game
```

**Keuntungan:**
- ✅ 100% compatibility
- ✅ Full performance
- ✅ No browser issues
- ✅ Larger screen
- ✅ Better resolution

## Browser Requirements

**Minimum Browser Version:**
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

**Required Features:**
- ES6 JavaScript
- Promise/async-await
- fetch API
- localStorage
- classList
- CSS Flexbox
- CSS Grid (optional tapi recommended)

## Troubleshooting Commands

**Check Firebase in Console:**
```javascript
// Paste di browser console
console.log(typeof firebase); // should be "object"
console.log(firebase.SDK_VERSION); // should show version
```

**Check Game State:**
```javascript
// Paste di browser console (saat game aktif)
window.debugState(); // shows current game state
```

**Force Reload Firebase:**
```javascript
// Hard reload
location.reload(true);
```

## Contact & Support

Jika masih error:
1. Ambil screenshot error message
2. Note TV brand & model
3. Coba method alternatif (HDMI)
4. Report issue dengan detail lengkap
