#!/usr/bin/env python3
"""Reuse identical compressed APK entries; verify exact reconstruction before release."""
import argparse,base64,hashlib,json,struct,zipfile
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('base');parser.add_argument('target');parser.add_argument('output');parser.add_argument('--base-url',required=True);args=parser.parse_args()
base=Path(args.base).read_bytes();target=Path(args.target).read_bytes();parts=[]
def payload(raw,info):
 name,extra=struct.unpack_from('<HH',raw,info.header_offset+26);start=info.header_offset+30+name+extra
 return start,start+info.compress_size
with zipfile.ZipFile(args.base) as old,zipfile.ZipFile(args.target) as new:
 previous={row.filename:row for row in old.infolist()};cursor=0
 for row in sorted(new.infolist(),key=lambda item:item.header_offset):
  prior=previous.get(row.filename)
  if not prior or (row.CRC,row.file_size,row.compress_size,row.compress_type)!=(prior.CRC,prior.file_size,prior.compress_size,prior.compress_type):continue
  start,end=payload(target,row);offset,last=payload(base,prior)
  if target[start:end]!=base[offset:last] or end==start:continue
  if cursor<start:parts.append({'data':base64.b64encode(target[cursor:start]).decode()})
  parts.append({'offset':offset,'length':end-start});cursor=end
 if cursor<len(target):parts.append({'data':base64.b64encode(target[cursor:]).decode()})
result=b''.join(base64.b64decode(p['data']) if 'data' in p else base[p['offset']:p['offset']+p['length']] for p in parts)
assert result==target,'Reconstructed installer differs'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
patch={'filename':Path(args.target).name,'baseUrl':args.base_url,'baseSha256':sha(base),'sha256':sha(target),'size':len(target),'parts':parts}
Path(args.output).write_text(json.dumps(patch,separators=(',',':'))+'\n')
print(json.dumps({k:v for k,v in patch.items() if k not in ['parts','baseUrl']},separators=(',',':')))
