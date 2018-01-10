Build
======

Scons and (emscripten)[https://kripken.github.io/emscripten-site/docs/getting_started/downloads.htm] must be installed (both avalable in ubuntu through <code>apt-get</code>).

```bash
git submodule init
git submodule update
cp -r RHVoice/config RHVoice/data ./
wget https://ftp.osuosl.org/pub/xiph/releases/ao/libao-1.2.0.tar.gz
tar xzf libao-1.2.0.tar.gz
source path/to/emsdk_env.sh
scons
xdg-open http://localhost:8000/test.html & python -m SimpleHTTPServer
```
