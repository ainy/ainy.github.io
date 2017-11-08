#!/usr/bin/env python
# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, division
import sys
import bz2

try:
    from urllib.request import urlopen
except ImportError:
    from urllib2 import urlopen


CORPORA_URL_BZ2 = 'http://opencorpora.org/files/export/annot/annot.opcorpora.xml.bz2'
DICT_URL_BZ2 = 'http://opencorpora.org/files/export/dict/dict.opcorpora.xml.bz2'
CORPORA_OUT_FILE = 'annot.opcorpora.xml'
DICT_OUT_FILE = 'dict.opcorpora.xml'
CHUNK_SIZE = 256*1024

def download_dict(url=DICT_URL_BZ2, out_file=DICT_OUT_FILE, decompress=True, chunk_size=CHUNK_SIZE, on_chunk=lambda:None):
    download(url,out_file,decompress,chunk_size,on_chunk)

def download(url=CORPORA_URL_BZ2, out_file=CORPORA_OUT_FILE, decompress=True, chunk_size=CHUNK_SIZE, on_chunk=lambda:None):
    decompressor = bz2.BZ2Decompressor()
    fp = urlopen(url, timeout=30)

    with open(out_file, 'w') as out_fp:
        while 1:
            data = fp.read(chunk_size)
            if not data:
                break

            if decompress:
                out_fp.write(decompressor.decompress(data))
            else:
                out_fp.write(data)
            on_chunk()

if __name__ == '__main__':
    sys.exit(download())
