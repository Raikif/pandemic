# 🐛 Fix: Epidemic Card Counting Bug

## Masalah yang Ditemukan

### Issue 1: Epidemic Card Ditambahkan ke Hand
**Sebelum:**
```javascript
// Draw card
const drawnCardData = gameState.playerDeck[0];

// ❌ SALAH: Epidemic ditambahkan ke hand player
currentPlayer.cards.push(drawnCardData); 

// Check if epidemic
const isEpidemic = drawnCardData.type === 'epidemic';
```

**Akibat:**
- Epidemic card muncul di hand player (seharusnya tidak)
- Jumlah kartu tidak sinkron: player punya 8 kartu tapi UI show 7
- Epidemic card tidak bisa digunakan/di-discard (karena bukan kartu usable)

### Issue 2: cardsDrawn Counter Salah
**Sebelum:**
```javascript
showDrawnCard(drawnCardData, isEpidemic);
cardsDrawn++; // ❌ Selalu increment, termasuk untuk epidemic
```

**Akibat:**
- Player draw epidemic + 1 city card → cardsDrawn = 2, tapi cuma dapat 1 kartu usable
- Next turn, system pikir sudah draw 2/2, tidak kasih draw lagi
- Player kehilangan 1 kartu setiap kena epidemic

### Issue 3: Deck Count Tidak Akurat
- Epidemic dihitung sebagai "kartu didapat" 
- Player seharusnya dapat 2 kartu per turn, tapi kalau 1 epidemic → cuma dapat 1
- Ini tidak fair dan melanggar aturan Pandemic

## Solusi yang Diterapkan

### ✅ Fix 1: Epidemic Tidak Ditambahkan ke Hand

**File: `player.js` - drawPlayerCard()**
```javascript
// Draw card from top of deck
const drawnCardData = gameState.playerDeck[0];
const remainingDeck = gameState.playerDeck.slice(1);

// Check if it's an epidemic
const isEpidemic = drawnCardData.type === 'epidemic';

// Update Firebase
const updates = {};
updates[`gameState/playerDeck`] = remainingDeck;

// ✅ IMPORTANT: Epidemic card tidak ditambahkan ke hand!
// Hanya non-epidemic yang ditambahkan ke hand
if (!isEpidemic) {
    const currentPlayer = gameState.players[currentPlayerId];
    if (!currentPlayer.cards) currentPlayer.cards = [];
    currentPlayer.cards.push(drawnCardData);
    updates[`gameState/players/${currentPlayerId}/cards`] = currentPlayer.cards;
}
```

**Hasil:**
- ✅ Epidemic langsung diproses, tidak masuk hand
- ✅ Hand count akurat
- ✅ Tidak ada kartu "phantom" yang tidak bisa digunakan

### ✅ Fix 2: Counter Hanya Untuk Kartu Usable

**File: `player.js` - drawPlayerCard()**
```javascript
// Show drawn card with animation
showDrawnCard(drawnCardData, isEpidemic);

// ✅ IMPORTANT: Hanya hitung kartu non-epidemic
// Epidemic tidak dihitung karena tidak ditambahkan ke hand
if (!isEpidemic) {
    cardsDrawn++;
} else {
    // Jika epidemic, tampilkan pesan khusus
    showToast('☣️ EPIDEMIC! Kartu epidemic tidak dihitung, draw lagi!', 'error', 2000);
}

// Update progress
const remaining = cardsToDraw - cardsDrawn;
```

**Hasil:**
- ✅ cardsDrawn hanya count kartu yang benar-benar masuk hand
- ✅ Player tahu bahwa epidemic tidak dihitung
- ✅ Player bisa draw lagi untuk mengganti epidemic

### ✅ Fix 3: Auto Draw Mengganti Epidemic

**File: `player.js` - autoDrawCards()**
```javascript
const isEpidemic = drawnCardData.type === 'epidemic';
if (isEpidemic) hasEpidemic = true;

// Update Firebase
const updates = {};
updates[`gameState/playerDeck`] = remainingDeck;

// ✅ IMPORTANT: Hanya tambahkan non-epidemic ke hand
if (!isEpidemic) {
    const currentPlayer = gameState.players[currentPlayerId];
    if (!currentPlayer.cards) currentPlayer.cards = [];
    currentPlayer.cards.push(drawnCardData);
    updates[`gameState/players/${currentPlayerId}/cards`] = currentPlayer.cards;
} else {
    // Epidemic tidak ditambahkan ke hand, tapi tetap draw lagi untuk mengganti
    console.log('⚠️ Epidemic drawn - akan draw 1 kartu tambahan');
    count++; // Draw satu kartu tambahan untuk mengganti epidemic
}
```

**Hasil:**
- ✅ Saat draw 2 kartu dan dapat 1 epidemic → akan draw 3 total
- ✅ Player tetap dapat 2 kartu usable di hand
- ✅ Sesuai aturan Pandemic (2 cards per turn)

## Alur Baru: Epidemic Card Handling

### Skenario 1: Draw 2 Kartu, Tidak Ada Epidemic
```
Turn End → Draw 2 Cards
├─ Card 1: Tokyo (City) → Add to hand ✅
├─ Card 2: Paris (City) → Add to hand ✅
└─ cardsDrawn = 2 → Selesai
```

### Skenario 2: Draw 2 Kartu, 1 Epidemic
```
Turn End → Draw 2 Cards
├─ Card 1: Tokyo (City) → Add to hand ✅
├─ Card 2: EPIDEMIC! → Process epidemic, NOT added to hand ⚠️
├─ cardsDrawn = 1 (bukan 2!) → Masih kurang 1
└─ Card 3: Paris (City) → Add to hand ✅ (auto draw replacement)
    └─ cardsDrawn = 2 → Selesai
```

### Skenario 3: Draw 2 Kartu, 2 Epidemic (Rare!)
```
Turn End → Draw 2 Cards
├─ Card 1: EPIDEMIC! → Process epidemic, NOT added ⚠️
├─ cardsDrawn = 0 → Draw lagi
├─ Card 2: EPIDEMIC! → Process epidemic, NOT added ⚠️
├─ cardsDrawn = 0 → Draw lagi
├─ Card 3: Tokyo (City) → Add to hand ✅
├─ cardsDrawn = 1 → Draw lagi
└─ Card 4: Paris (City) → Add to hand ✅
    └─ cardsDrawn = 2 → Selesai
```

## Testing Checklist

### Test 1: Normal Draw (No Epidemic)
- [ ] End turn → auto draw 2 cards
- [ ] Both cards added to hand
- [ ] Hand shows 2 new cards
- [ ] cardsDrawn = 2 → infection phase starts

### Test 2: Single Epidemic
- [ ] End turn → draw card
- [ ] Get epidemic → modal shows "☣️ EPIDEMIC!"
- [ ] Epidemic effect processed (infection rate up, outbreak, etc.)
- [ ] Hand does NOT show epidemic card
- [ ] System auto draws 1 more card
- [ ] Hand shows 2 new normal cards total
- [ ] cardsDrawn = 2 → infection phase starts

### Test 3: Double Epidemic (Edge Case)
- [ ] End turn → draw card
- [ ] Get epidemic #1 → processed
- [ ] Auto draw replacement → get epidemic #2
- [ ] Both epidemics processed
- [ ] Hand shows 2 normal cards (not epidemic)
- [ ] cardsDrawn = 2

### Test 4: Hand Limit Integration
- [ ] Player has 6 cards
- [ ] Draw 1 normal + 1 epidemic
- [ ] Epidemic processed (not added)
- [ ] System tries to draw replacement
- [ ] Hand limit check triggers (6 + 2 = 8 > 7)
- [ ] Discard modal appears
- [ ] After discard, draw continues

### Test 5: Counter Accuracy
- [ ] Start turn with 5 cards in hand
- [ ] End turn → draw epidemic + 2 normal cards
- [ ] End hand count = 5 + 2 = 7 cards (not 8)
- [ ] Displayed count matches actual cards
- [ ] No phantom cards

## Files Modified

- ✅ `js/player.js` - drawPlayerCard() function
- ✅ `js/player.js` - autoDrawCards() function
- ✅ Documentation: EPIDEMIC_FIX.md (this file)

## Root Cause Summary

**Main Issue:** 
Kode lama menambahkan SEMUA kartu (termasuk epidemic) ke hand player, baru kemudian check apakah epidemic. Ini salah karena epidemic seharusnya "instant effect" yang tidak masuk ke hand.

**Correct Flow:**
1. Draw card from deck
2. Check if epidemic → Yes: Process effect, don't add to hand
3. Check if epidemic → No: Add to hand, increment counter
4. Repeat until counter reaches required amount

**Why This Bug Was Hard to Catch:**
- Epidemic jarang muncul (4-6 cards in 50+ card deck)
- Effect terlihat seperti "work" (epidemic trigger correctly)
- Tapi side effect (wrong count) baru terasa after multiple turns
- Hand limit check bisa "mask" the issue di early game

## Prevention for Future

**Best Practice:**
- Kartu dengan "instant effect" jangan pernah ditambahkan ke hand
- Selalu check card type SEBELUM add to collection
- Counter harus count "usable items" bukan "items processed"
- Test edge cases (multiple special cards in a row)

**Code Pattern:**
```javascript
// ✅ GOOD
if (card.isSpecial) {
    processSpecialEffect(card);
    // Don't add to hand
} else {
    addToHand(card);
    counter++;
}

// ❌ BAD
addToHand(card);
counter++;
if (card.isSpecial) {
    processSpecialEffect(card);
}
```
