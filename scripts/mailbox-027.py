import functools,http.server,threading,os
from pathlib import Path
from playwright.sync_api import sync_playwright
from contextlib import closing
root=Path.cwd()
class Handler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':840})
 page.route('https://**/*',lambda r:r.abort())
 page.add_init_script("""window.postCalls=[];window.readIds=[];window.fixture=[
  {id:'legacy',remote:false,sender:'Myself',senderCode:'',reply:'got it',status:'delivered'},
  {id:'remote',remote:true,sender:'Myself',senderCode:'ABCD'},
  {id:'test',remote:false,sender:'Test pigeon'},
  {id:'friend',sender:'Owen',sent:true},
  {id:'scheduled',sender:'Myself',remote:false,status:'scheduled'},
  {id:'cancelled',sender:'Myself',remote:false,status:'cancelled'}
 ].map((m,i)=>({created:1000+i,when:1000+i,kind:'a postcard',...m}));
 window.Pigeon={mailbox:()=>JSON.stringify(fixture),friendsCached:()=>'{"friends":[]}',wasRead:()=>false,markRead:(id)=>readIds.push(id),isOpen:()=>true,name:()=>{},setTheme:()=>{},designPaired:()=>false,deliveryPrefs:()=>'{}',
 queue:s=>{const d=JSON.parse(s);window.lastQueued=d;fixture.push({...d,id:'new',remote:false,status:'received'});return 'ok'},
 post:(n,op)=>{postCalls.push(op);queueMicrotask(()=>postOfficeResult(n,JSON.stringify({data:{}})))}}""")
 page.goto(url)
 page.locator('[data-action=tab][data-id=inbox]').click()
 assert page.locator('[data-row]').count()==5
 page.locator('[data-folder=sent]').click()
 assert set(page.locator('[data-row]').evaluate_all('(rows)=>rows.map(r=>r.dataset.row)'))=={'legacy','friend','scheduled','cancelled'}
 assert page.locator('[data-row=legacy] img').get_attribute('src').endswith('/legacy.png')
 assert page.locator('[data-row=friend] img').get_attribute('src').endswith('/sent-friend.png')
 page.locator('[data-row=legacy]').click();assert page.locator('.thread-reply').inner_text()=='You replied: got it'
 assert not page.evaluate('postCalls.length||readIds.length')
 page.locator('[data-x]').click()
 page.evaluate("""async()=>{const m=await import('./post/mailbox.mjs');await m.composeFrom('Postcards',()=>window.refreshMailbox(),{image:'assets/guest/105.svg',name:'Example'});}""")
 page.locator('[data-mb=send]').click();page.locator('[data-mb=done]').click()
 assert page.evaluate("lastQueued.senderCode==='self'") and page.locator('[data-row=new]').count()==1
 page.locator('[data-folder=inbox]').click();assert page.locator('[data-row=new]').count()==1
 page.close()
 page=browser.new_page();page.route('https://**/*',lambda r:r.abort());page.goto(url)
 page.evaluate("""async()=>{const {createState,STORAGE_KEY}=await import('./domain.mjs'),s=createState();s.inbox=[{id:'my',recipient:'self',sender:'Myself',type:'message',text:'Saved',createdAt:1000,read:false},{id:'test',sender:'Owen',text:'Demo',type:'message',createdAt:1001}];s.scheduled=[{id:'booked',recipient:'self',when:'2099-12-01T12:00:00Z',text:'Later',type:'message'}];localStorage.setItem(STORAGE_KEY,JSON.stringify(s))}""")
 page.reload();page.locator('[data-action=tab][data-id=inbox]').click()
 page.locator('[data-action=local-folder][data-id=sent]').click()
 assert page.locator('[data-action=sent-detail]').count()==2
 page.locator('[data-action=sent-detail][data-id=my]').click()
 assert page.locator('#flow h2').inner_text()=='To Myself' and 'Saved' in page.locator('#flow').inner_text()
 page.locator('[data-flow=done]').click()
 assert page.evaluate("""JSON.parse(localStorage.getItem('youve-got-mail-draft-v1')).inbox[0].read===false""")
 # Drive the same delegated composer action as the normal web picker.
 page.evaluate("""()=>{const b=document.createElement('button');b.dataset.action='compose';document.querySelector('#app').append(b);b.click();b.remove()}""")
 assert page.locator('[data-local-recipient] option[value=self]').text_content()=='Myself'
 page.locator('[data-flow=choose][data-key=recipient][data-value=self]').click();page.locator('[data-flow=next]').click()
 page.locator('[data-flow=choose][data-key=type][data-value=message]').click();page.locator('[data-flow=next]').click()
 page.locator('#message').fill('Browser self send');page.locator('[data-flow=next]').click()
 for i in range(3):page.locator('[data-flow=next]').click()
 page.wait_for_function("""()=>JSON.parse(localStorage.getItem('youve-got-mail-draft-v1')).inbox.some(m=>m.recipient==='self'&&m.text==='Browser self send')""")
 browser.close()
server.shutdown()
print('PASS native current/historical/scheduled/cancelled self mail, artwork/receipt routing, remote and test exclusions; browser self-send, persisted folders and unread state')
