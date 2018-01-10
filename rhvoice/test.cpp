/* Copyright (C) 2012, 2013  Olga Yakovleva <yakovleva.o.v@gmail.com> */

/* This program is free software: you can redistribute it and/or modify */
/* it under the terms of the GNU General Public License as published by */
/* the Free Software Foundation, either version 3 of the License, or */
/* (at your option) any later version. */

/* This program is distributed in the hope that it will be useful, */
/* but WITHOUT ANY WARRANTY; without even the implied warranty of */
/* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the */
/* GNU General Public License for more details. */

/* You should have received a copy of the GNU General Public License */
/* along with this program.  If not, see <http://www.gnu.org/licenses/>. */

#include <memory>
#include <stdexcept>
#include <iostream>
#include <fstream>
#include <iterator>
#include <algorithm>
#include "core/smart_ptr.hpp"
#include "core/engine.hpp"
#include "core/document.hpp"
#include "core/client.hpp"
#include "audio.hpp"


#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <iostream>
#include <AL/al.h>
#include <AL/alc.h>


void init_al() {
    ALCdevice *dev = NULL;
    ALCcontext *ctx = NULL;

    const char *defname = alcGetString(NULL, ALC_DEFAULT_DEVICE_SPECIFIER);
    
    dev = alcOpenDevice(defname);
    ctx = alcCreateContext(dev, NULL);
    alcMakeContextCurrent(ctx);
}

void exit_al() {
    ALCdevice *dev = NULL;
    ALCcontext *ctx = NULL;
    ctx = alcGetCurrentContext();
    dev = alcGetContextsDevice(ctx);

    alcMakeContextCurrent(NULL);
    alcDestroyContext(ctx);
    alcCloseDevice(dev);
}

using namespace RHVoice;

namespace
{
  class audio_player: public client
  {
  public:
    explicit audio_player();
    bool play_speech(const short* samples,std::size_t count);
    bool set_sample_rate(int sample_rate);
    std::vector<short> samples;
    int sample_rate;
    
    int get_sample_rate() const
    {
      return sample_rate;
    }
  };

  audio_player::audio_player()
  {
    sample_rate = 24000;
  }

  bool audio_player::set_sample_rate(int _sample_rate)
  {
    sample_rate = _sample_rate;
    return true;
  }

  bool audio_player::play_speech(const short* _samples, std::size_t count)
  {
    for(int i=0; i<count; ++i)
      samples.push_back(_samples[i]);

    return true;
  }
}


int main(int argc,const char* argv[])
{
  try
    {
      std::ifstream f_in;
      f_in.open("input");
      audio_player player;
      smart_ptr<engine> eng(new engine);
      voice_profile profile;
      profile=eng->create_voice_profile((argc>1)?argv[1]:"elena");
      std::istreambuf_iterator<char> text_start(f_in.is_open()?f_in:std::cin);
      std::istreambuf_iterator<char> text_end;
      std::auto_ptr<document> doc;
      doc=document::create_from_plain_text(eng,text_start,text_end,content_text,profile);
      doc->set_owner(player);
      doc->synthesize();
      
      /* initialize OpenAL */
      init_al();

      /* Create buffer to store samples */
      ALuint buf;
      alGenBuffers(1, &buf);
      
      /* Fill buffer with Sine-Wave */
      size_t buf_size = player.samples.size();
      unsigned sample_rate = player.sample_rate;
      int seconds = buf_size / sample_rate + 1;
      short *buffer = new short[buf_size];
      std::copy(player.samples.begin(), player.samples.end(), buffer);
 
      /* Download buffer to OpenAL */
      alBufferData(buf, AL_FORMAT_MONO16, buffer, buf_size*sizeof(short), sample_rate);
      
      /* Set-up sound source and play buffer */
      ALuint src = 0;
      alGenSources(1, &src);
      alSourcei(src, AL_BUFFER, buf);
      alSourcePlay(src);
      delete[] buffer;
      
      return 0;
    }
  catch(const std::exception& e)
    {
      std::cerr << e.what() << std::endl;
      return -1;
    }
}


#include <emscripten/emscripten.h>
#ifdef __cplusplus
extern "C" {
#endif
void tts(const char* p) {
  const char* argv[2];
  argv[1]=p;
  main(2, argv);
}
#ifdef __cplusplus
}
#endif

