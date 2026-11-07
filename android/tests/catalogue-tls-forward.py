# Local-only forwarding between the AVD and the real HTTPS endpoint. Android validates TLS.
import select, socket, socketserver
class Connect(socketserver.StreamRequestHandler):
 def handle(self):
  line=self.rfile.readline(4097).decode('ascii',errors='replace').strip().split()
  if len(line)!=3 or line[0]!='CONNECT' or line[1]!='pigeon-post-delivery.nikki0radz.chatgpt.site:443':
   self.wfile.write(b'HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n')
   return
  for _ in range(100):
   if self.rfile.readline(8193) in (b'\r\n',b'\n',b''): break
  with socket.create_connection(('pigeon-post-delivery.nikki0radz.chatgpt.site',443), timeout=15) as remote:
   print('TLS tunnel to production catalogue', flush=True)
   self.wfile.write(b'HTTP/1.1 200 Connection established\r\n\r\n')
   self.wfile.flush()
   peers=[self.connection,remote]
   while True:
    ready,_,_=select.select(peers,[],[],25)
    if not ready:return
    for sock in ready:
     data=sock.recv(65536)
     if not data:return
     peers[1-peers.index(sock)].sendall(data)
class Server(socketserver.ThreadingTCPServer):
 allow_reuse_address=True
 daemon_threads=True
with Server(('127.0.0.1',8868),Connect) as server:server.serve_forever()
