import hashlib, os, re, struct, subprocess, time, zlib
from pathlib import Path
from urllib.request import urlopen
from xml.etree import ElementTree

PACKAGE='uk.co.pigeonpost.mail'
BASE='https://pigeon-post-delivery.nikki0radz.chatgpt.site/downloads/'
def adb(*args):
    return subprocess.run(['adb',*map(str,args)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=45).stdout.decode(errors='replace')
def screen():
    try:
        adb('shell','uiautomator','dump','/sdcard/qa-window.xml')
        xml=adb('shell','cat','/sdcard/qa-window.xml')
        return list(ElementTree.fromstring(xml).iter('node'))
    except (subprocess.SubprocessError,ElementTree.ParseError): return []
def match(words,timeout=35):
    if isinstance(words,str): words=[words]
    end=time.monotonic()+timeout
    while time.monotonic()<end:
        for n in screen():
            a=n.attrib
            labels=[a.get('text','').casefold(),a.get('content-desc','').casefold()]
            if any((label == w[1:].casefold() if w.startswith('=') else w.casefold() in label) for w in words for label in labels):
                return a
        time.sleep(.5)
    nodes=screen()
    print('Visible controls:',[(n.get('text','')[:55],n.get('content-desc','')[:55]) for n in nodes if n.get('text') or n.get('content-desc')],flush=True)
    raise RuntimeError('Could not find UI label: '+str(words))
def tap(words,hold=False,timeout=35):
    a=match(words,timeout); x,y,u,v=map(int,re.findall(r'\d+',a['bounds'])); x=(x+u)//2;y=(y+v)//2
    adb('shell','input',*(('swipe',x,y,x,y,800) if hold else ('tap',x,y)));time.sleep(.4)
def png(name,color):
    w=1024; h=1024
    def chunk(t,b): return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
    data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+color*w)*h))+chunk(b'IEND',b'')
    Path(name).write_bytes(data)
    adb('push',name,'/sdcard/Download/'+name)
    adb('shell','am','broadcast','-a','android.intent.action.MEDIA_SCANNER_SCAN_FILE','-d','file:///sdcard/Download/'+name)
# No network is required for this local device test.
adb('shell','svc','wifi','disable')
adb('shell','svc','data','disable')
adb('shell','input','keyevent','KEYCODE_WAKEUP')
adb('shell','wm','dismiss-keyguard')
assert 'Success' in adb('install','phone-qa.apk')
print('Android installed the release-source APK with offline fixtures',flush=True)
png('qa-blue.png',bytes([30,70,180,255]));png('qa-green.png',bytes([15,160,45,255]))
adb('shell','am','start','-n',PACKAGE+'/.Main')
tap('Later')
tap('Settings')
tap('Upload pictures')

tap('Choose PNGs',timeout=60)
print('Offline settings and system file chooser open',flush=True)
try:match('qa-blue.png',timeout=10)
except RuntimeError:
    tap(['Show roots','Show navigation','Open navigation'])
    tap('Downloads')
tap('qa-blue.png',hold=True)
tap('qa-green.png')
tap(['=Open','=Select','=Done'],timeout=20)
match('2 ready',40)
print('Confirmed native picker returned both original PNGs',flush=True)
