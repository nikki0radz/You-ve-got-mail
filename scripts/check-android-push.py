#!/usr/bin/env python3
"""Fail a release whose packaged APK omits the working Firebase client stack."""
import os,subprocess,sys,zipfile
from pathlib import Path
apk=Path(sys.argv[1]);sdk=Path(os.environ['ANDROID_HOME'])
aapt=sdk/'build-tools'/os.environ.get('BUILD_TOOLS_VERSION','35.0.0')/'aapt'
manifest=subprocess.check_output([str(aapt),'dump','xmltree',str(apk),'AndroidManifest.xml'],text=True)
required=['uk.co.pigeonpost.mail.MailApplication','uk.co.pigeonpost.mail.PushMessagingService','com.google.firebase.MESSAGING_EVENT','com.google.firebase.iid.FirebaseInstanceIdReceiver','com.google.android.c2dm.intent.RECEIVE','com.google.android.c2dm.permission.SEND','com.google.firebase.provider.FirebaseInitProvider','androidx.work.WorkManagerInitializer']
for item in required:
    assert item in manifest,'Missing packaged push component: '+item
with zipfile.ZipFile(apk) as archive:
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    for item in [b'FirebaseMessagingService',b'PushRegistrationWorker',b'PushMailboxWorker']:
        assert item in dex,'Missing compiled push implementation: '+item.decode()
    resources=archive.read('resources.arsc')
    for item in ['google_app_id','google_api_key','gcm_defaultSenderId','you-ve-got-mail-f8f2b','1:529846975356:android:95d4f26d9399e06f3482f9']:
        assert item.encode() in resources or item.encode('utf-16le') in resources,'Missing Firebase client resource: '+item
print('Verified packaged Firebase receiver, registration worker, mailbox worker and client configuration')
