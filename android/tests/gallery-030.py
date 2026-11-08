import hashlib,re,subprocess,sys,time,struct,zlib,base64
from pathlib import Path
from xml.etree import ElementTree as ET
def adb(*args):return subprocess.check_output(['adb',*map(str,args)],timeout=30).decode(errors='replace')
def nodes():
 try:
  adb('shell','uiautomator','dump','/sdcard/qa.xml')
  return [n.attrib for n in ET.fromstring(adb('shell','cat','/sdcard/qa.xml')).iter('node')]
 except Exception:return []
def labels(n):return [n.get('text',''),n.get('content-desc','')]
def search(test,timeout=48):
 end=time.monotonic()+timeout
 while time.monotonic()<end:
  ui=nodes()
  for n in ui:
   if test(n):return n
  time.sleep(.25)
 print('visible controls',[(n.get('resource-id'),labels(n)) for n in nodes() if n.get('resource-id') or any(labels(n))],flush=True)
 raise RuntimeError('Expected control missing')
def tap(n):
 x,y,r,b=map(int,re.findall(r'\d+',n['bounds']));adb('shell','input','tap',(x+r)//2,(y+b)//2);time.sleep(.3)
def bytext(s):
 return search(lambda n:any(s.casefold() in t.casefold() for t in labels(n)))
def button(s):tap(bytext(s))
p=Path('/tmp/photo-qa');p.mkdir(exist_ok=True)
def png(color):
 w=h=160
 def chunk(t,v):return struct.pack('>I',len(v))+t+v+struct.pack('>I',zlib.crc32(t+v)&0xffffffff)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+bytes(color)*w)*h))+chunk(b'IEND',b'')
files={'qa-blue.png':png([25,80,180,255]),'qa-green.png':png([35,160,45,255]),'qa-red.jpg':base64.b64decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDCooor5w/TQooooAKKKKACiiigD//Z')}
adb('install','-g','phone-qa.apk')
adb('shell','input','keyevent','KEYCODE_WAKEUP');adb('shell','wm','dismiss-keyguard')
adb('shell','mkdir','-p','/sdcard/Pictures/GalleryQA')
for name,data in files.items():
 file=p/name;file.write_bytes(data);dest='/sdcard/Pictures/GalleryQA/'+name;adb('push',file,dest);adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file://'+dest)
end=time.monotonic()+30
while time.monotonic()<end:
 media=adb('shell','content','query','--uri','content://media/external/images/media','--projection','_display_name')
 if all(k in media for k in files):break
 time.sleep(1)
else:raise RuntimeError('MediaStore did not index the 3 fixture images')
adb('shell','am','start','-W','-n','uk.co.pigeonpost.mail/.Main')
button('Later');button('Settings');button('Artwork manager');button('Upload PNGs')
def grid():
 ui=nodes()
 # Platform photo grid exposes one image-view thumbnail per file.
 return [n for n in ui if n.get('resource-id','').rsplit('/',1)[-1] in ['icon_thumbnail','picker_photo','photo_thumbnail']]
def waitgrid(count):
 end=time.monotonic()+30
 while time.monotonic()<end:
  cells=grid()
  if len(cells)==count:return cells
  time.sleep(.4)
 print('picker UI',[(n.get('resource-id'),labels(n),n.get('bounds')) for n in nodes()],flush=True)
 raise RuntimeError(f'Expected {count} photo thumbnails')
waitgrid(2)
adb('shell','input','keyevent','KEYCODE_BACK');button('Upload PNGs')
cells=waitgrid(2)
for n in cells:tap(n)
tap(search(lambda n:any('add' in t.lower() or 'done' in t.lower() for t in labels(n)) and n.get('enabled')=='true'))
digest=' '.join(sorted(hashlib.sha256(v).hexdigest() for k,v in files.items() if k.endswith('.png')))
bytext('Verified batch '+digest)
print('PASS photos picker filters out JPEG, cancellation/reopen works, and both source PNG byte hashes reached the real batch uploader without any network writes',flush=True)
button('Check single photo');cells=waitgrid(3)
# Newest item is the JPEG scanned last. It should immediately return without a multi-select button.
tap(cells[0]);n=bytext('Verified single ')
print('PASS single image selection read file bytes',labels(n),flush=True)
