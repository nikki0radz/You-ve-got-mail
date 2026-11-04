// Numbered designs come from the full app catalogue. Lettered designs are guest-only.
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
    ["L01", "Bee mine", 397, 396],
    ["L10", "I’m nuts about you", 397, 397],
    ["L11", "I love you · chocolates", 397, 396],
    ["L20", "Come cuddle", 428, 397],
    ["L03", "Olive you", 397, 396],
  ],
  "Reminders": [
    ["R01", "Take your meds", 397, 396],
    ["R09", "Charge your phone", 396, 397],
    ["R27", "Book your appointment", 388, 397],
    ["R15", "Feed the cat", 397, 396],
  ],
};

export function guestItems(catalog) {
  return Object.entries(guestSelection).flatMap(([category, picks]) => picks.map(([id, name, width, height]) => {
    const master = 'assets/guest/' + String(id).padStart(3,'0') + '.svg';
    if (width && height) {
      return {category, name, master, sheet:master, sheetWidth:width, sheetHeight:height, rect:[0,0,width,height]};
    }
    const item = catalog.find(entry => entry.category === category && entry.name === name);
    if (!item) throw new Error('Missing invitation design ' + id);
    return {...item, master};
  }));
}
