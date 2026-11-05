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

const cleaned = [125,126,151,159,163,'L01','L10','L11','L20','L03','R01','R09','R27','R15'];
const reminderBoxes = {
  R01: {polygon:[.34,.42,.69,.42,.69,.73,.34,.73],textBox:[.35,.43,.68,.72],fill:'#f8e5d8'},
  R09: {polygon:[.31,.33,.72,.33,.72,.56,.31,.56],textBox:[.32,.34,.71,.55],fill:'#f8e6d9'},
  R27: {polygon:[.23,.37,.74,.30,.78,.55,.23,.63],textBox:[.27,.37,.72,.56],fill:'#f8e9de'},
  R15: {polygon:[.25,.64,.72,.64,.72,.84,.25,.84],textBox:[.26,.65,.71,.83],fill:'#f9b4b4'}
};
export const guestMaster = id => cleaned.includes(id)
  ? 'assets/guest/' + id + '-clean-v2.png'
  : id === 162 ? 'assets/guest/162-clean.png'
  : 'assets/guest/' + String(id).padStart(3,'0') + '.svg';

export function guestItems(catalog) {
  return Object.entries(guestSelection).flatMap(([category, picks]) => picks.map(([id, name]) => {
    const master = guestMaster(id);
    const item = catalog.find(entry => entry.category === category && entry.name === name);
    if (!item) throw new Error('Missing invitation design ' + id);
    const box=reminderBoxes[id];
    return {...item, master,...(box?{labelPatch:{polygon:box.polygon,fill:box.fill},textBox:box.textBox}:{})};
  }));
}
