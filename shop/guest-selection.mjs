// Invitations and replies use a curated subset of the full catalogue.
export const guestSelection = {
  "Notes": [
    [2, "Sticky note"],
    [3, "Heart note"],
    [6, "Important"],
    [21, "Shopping list"],
  ],
  "Photos": [
    [54, "Tape deck"],
    [51, "Mosaic"],
    [47, "Locket"],
    [36, "Watercolour"],
    [31, "Instant print"],
  ],
  "Flowers": [
    [65, "Big Romance"],
    [75, "Blush"],
    [86, "Miss You"],
    [88, "Apology"],
  ],
  "Postcards": [
    [105, "Open scrapbook"],
    [108, "Portrait bubble"],
    [91, "Vinyl dedication"],
    [102, "Takeaway cup"],
  ],
  "Stickers": [
    [125, "All in"],
    [126, "Bad beat"],
    [163, "I’m horny"],
    [151, "Unimpressed"],
    [159, "I’m tired"],
    [162, "I miss you"],
  ],
  "Love notes": [
    ["L01", "Bee mine"],
    ["L10", "I’m nuts about you"],
    ["L11", "I love you · chocolates"],
    ["L20", "Come cuddle"],
    ["L03", "Olive you"],
  ],
  "Reminders": [
    ["R01", "Take your meds"],
    ["R09", "Charge your phone"],
    ["R27", "Book your appointment"],
    ["R15", "Feed the cat"],
  ],
};

export function guestItems(catalog) {
  return Object.entries(guestSelection).flatMap(([category, picks]) => picks.map(([id, name]) => {
    const master = 'assets/guest/' + String(id).padStart(3,'0') + '.svg';
    const item = catalog.find(entry => entry.category === category && entry.name === name);
    if (!item) throw new Error('Missing invitation design ' + id);
    return {...item, master};
  }));
}
