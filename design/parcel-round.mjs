// Identifiers are saved in exported layouts. Keep their meaning stable across revisions.
export const looks = {
  separator: ['Fine rule','Dash and dot','Airmail stripe','Envelope seal','Double rule'].map(name=>[name]),
  wheelrim: ['Stitched circle','Plain artwork','Ink ring','Soft stamp','Paper disc'].map(name=>[name]),
  recipientfont: ['Rounded 17','Coiny 18','Lilita 20','Handwritten 22','Classic 18','Fredoka 20'].map(x=>[x]),
  timeheading: ['Ruled heading','Postage label','Centred script','Ticket stub','Small capitals','Ribbon'].map(x=>[x]),
  permissionactions: ['Underlined list','Postage stamps','Ticket stubs','Numbered steps','Pill pairs','Plain rows'].map(x=>[x]),
  sendrow: ['Envelope row','Address slip','Portrait capsule','Postmark label','Airmail edge','Sorting desk'].map(x=>[x]),
  catalogfont: ['Rounded','Coiny','Lilita One','Handwritten','Serif italic','Typewriter'].map(x=>[x]),
  receiptfont: ['Rounded','Coiny','Lilita One','Handwritten','Serif italic','Typewriter'].map(x=>[x]),
  addressing: ['Letter to a friend','Choose a pigeon','Delivery stops','Sorting pockets','Address seal'].map(x=>[x]),
  whenticks: ['Postmark circles','Pencil checklist','Punch tickets','Wax seals','Airmail stamps'].map(x=>[x]),
  peoplebar: ['Address book tab','Contacts counter','Stamped directory','Slim divider','Post office sign','Address slip'].map(x=>[x]),
  railwidth: [['Inset card'],['Edge to edge']],
  notetitle: ['Handwritten question','Postage stamp','Ruled heading','Speech bubble','Paper ribbon'].map(x=>[x]),
  recipient: ['Address label','Portrait chips','Address book','Postage stamps','Ticket list'].map(x=>[x]),
  deliverytime: ['Forest capsule','Postage ticket','Signal light','Pocket track','Airmail switch'].map(x=>[x]),
  mailbox: ['Letter stack','Sorting trays','Postmaster’s ledger','Address book first','Ticket roll'].map(x=>[x]),
  settingsbuttons: ['Postage stamps','Parcel tabs','Illustrated list','Pocket cards','Mail tickets'].map(x=>[x]),
  header: [
    ['Counter welcome', 'Your post office', 'The courier is at the counter.'],
    ['Return address', 'Pigeon Post HQ', 'Set your sign for incoming mail.'],
    ['Hanging placard', 'The mail window', 'Flip the sign when you need a break.'],
    ['Airmail envelope', 'Incoming airmail', 'Special deliveries land here.'],
    ['Counter ticket', 'Delivery desk', 'One pigeon, reporting for duty.'],
    ['Round postmark', 'Postmarked here', 'Your own little sorting office.'],
    ['Signal box', 'Mail signal', 'Green for deliveries. Red for a break.'],
    ['Dispatch ledger', 'Today’s post', 'Set your mail status below.'],
    ['Pocket postcard', 'Hello from HQ', 'Your courier is standing by.'],
    ['Station board', 'Pigeon arrivals', 'Tap the sign to change your status.']
  ],
  status: [['Neon signal'],['Post office bulbs'],['Bright ticket'],['Glowing outline'],['Big stamp']],
  calendar: [['Postmark calendar'],['Airmail diary'],['Pocket planner'],['Ticket to tomorrow'],['Garden journal']],
  decline: [['Tearful courier','assets/home/sad.webp'],['Crybaby','assets/guest/decline-crybaby.png'],['Sad pigeon','assets/guest/decline-sad.png'],['Furious pigeon','assets/guest/decline-furious.png'],['Unimpressed pigeon','assets/guest/decline-unimpressed.png']],
  background: [['Mist'],['Pale sage'],['Soft lagoon'],['Ivory green'],['Sea glass'],['Gentle mint']],
  title: [['Two lines']],
  heading: [
    ['Plain and personal', 'You’re sending Nicole a parcel'],
    ['Address label', 'To Nicole, from you'],
    ['Parcel tag', 'Your parcel for Nicole'],
    ['Little delivery', 'A little something for Nicole'],
    ['Mailroom', 'You’re posting to Nicole'],
    ['Handwritten', 'Something for you, Nicole']
  ],
  name: ['Postage dashes','Letter underline','Airmail stripe','Soft capsule','Double rule','Sender slip'].map(x=>[x]),
  timing: ['Sliding capsule','Ticket tabs','Ink underline','Signal switch','Postage stamp','Sorting tray'].map(x=>[x])
};
export function readLook(value){
  if(typeof value!=='string')return;
  const [group,num]=value.split('-'),i=Number(num)-1;
  if(!Object.hasOwn(looks,group)||value!==group+'-'+(i+1)||!looks[group][i])return;
  return {group,entry:looks[group][i]};
}
export function reviewGroup(group,title,selector){
  return {id:'parcel-review-'+group+'-01',title,options:looks[group].map(([name],i)=>({name,changes:[{selector,style:{reviewLook:group+'-'+(i+1)}}]}))};
}
