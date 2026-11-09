#!/usr/bin/env python3
"""Normalize APK ZIP compression without changing any entry's contents.

The previous native builder used level 9. Keeping that level avoids duplicating
large unchanged camera models in archived installer patches. Stored resources
and native libraries stay stored; zipalign runs afterwards to align them.
"""
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as source, zipfile.ZipFile(sys.argv[2], 'w') as target:
    for original in source.infolist():
        entry = zipfile.ZipInfo(original.filename, (1980, 1, 1, 0, 0, 0))
        entry.compress_type = original.compress_type
        entry.external_attr = original.external_attr
        target.writestr(entry, source.read(original), compresslevel=9)
