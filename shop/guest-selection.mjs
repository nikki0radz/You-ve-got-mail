// Numbers match the v0.1.1 selection catalogue. Names survive catalogue reordering.
export const guestSelection = {
  "Notes": [
    [
      2,
      "Sticky note"
    ],
    [
      3,
      "Heart note"
    ],
    [
      6,
      "Important"
    ],
    [
      21,
      "Shopping list"
    ]
  ],
  "Photos": [
    [
      54,
      "Tape deck"
    ],
    [
      51,
      "Mosaic"
    ],
    [
      47,
      "Locket"
    ],
    [
      36,
      "Watercolour"
    ],
    [
      31,
      "Instant print"
    ]
  ],
  "Flowers": [
    [
      65,
      "Big Romance"
    ],
    [
      75,
      "Blush"
    ],
    [
      86,
      "Miss You"
    ],
    [
      88,
      "Apology"
    ]
  ],
  "Postcards": [
    [
      105,
      "Open scrapbook"
    ],
    [
      108,
      "Portrait bubble"
    ],
    [
      91,
      "Vinyl dedication"
    ],
    [
      102,
      "Takeaway cup"
    ]
  ],
  "Stickers": [
    [
      162,
      "I miss you"
    ],
    [
      163,
      "I’m horny"
    ],
    [
      173,
      "I’m sad"
    ],
    [
      179,
      "I’m bored"
    ]
  ],
  "Love notes": [
    [
      192,
      "Thinking about you"
    ],
    [
      193,
      "Goodnight"
    ],
    [
      194,
      "Good morning"
    ],
    [
      196,
      "Sad ’cause you’re not here"
    ]
  ]
};

export function guestItems(catalog) {
  return Object.entries(guestSelection).flatMap(([category, picks]) => picks.map(([number, name]) => {
    const item = catalog.find(entry => entry.category === category && entry.name === name);
    if (!item) throw new Error("Missing invitation design " + number);
    return {...item, master: "assets/guest/" + String(number).padStart(3,"0") + ".svg"};
  }));
}
