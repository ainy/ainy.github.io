Build
======

Scons and (emscripten)[https://kripken.github.io/emscripten-site/docs/getting_started/downloads.htm] must be installed (both avalable in ubuntu through <code>apt-get</code>).

```bash
git submodule init
git submodule update
cp -r RHVoice/config RHVoice/data ./
wget https://ftp.osuosl.org/pub/xiph/releases/ao/libao-1.2.0.tar.gz
tar xzf libao-1.2.0.tar.gz
cd libao-1.2.0/
source path/to/emsdk_env.sh
emconfigure ./configure
make
cd ..
scons
xdg-open http://localhost:8000/test.html & python -m SimpleHTTPServer
```

To solve issue with '__pos' in 'union _G_fpos64_t' on clang I use this patch:

```
diff --git a/src/third-party/hts_engine/HTS_misc.c b/src/third-party/hts_engine/HTS_misc.c
index 5580b47..9bd6380 100644
--- a/src/third-party/hts_engine/HTS_misc.c
+++ b/src/third-party/hts_engine/HTS_misc.c
@@ -244,6 +244,7 @@ size_t HTS_ftell(HTS_File * fp)
 {
    if (fp == NULL) {
       return 0;
+#ifndef __clang__
    } else if (fp->type == HTS_FILE) {
       fpos_t pos;
       fgetpos((FILE *) fp->pointer, &pos);
@@ -252,6 +253,7 @@ size_t HTS_ftell(HTS_File * fp)
 #else
       return (size_t) pos.__pos;
 #endif                          /* _WIN32 || __CYGWIN__ || __APPLE__ || __ANDROID__ */
+#endif
    } else if (fp->type == HTS_DATA) {
       HTS_Data *d = (HTS_Data *) fp->pointer;
       return d->index;
```
