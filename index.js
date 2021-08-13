"use strict";

(function () {
  window.addEventListener("load", init);

  /** Sets up the user interface when the page loads. */
  function init() {
    id("record").addEventListener("click", startRecord);
  }

  /**
   * Begin microphone input from the user for 5 seconds and save the audio data.
   */
  function startRecord() {
    clearStatus();
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
      .then(stream => {
        recordingMsg();
        let mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        let audioChunks = [];
        mediaRecorder.addEventListener("dataavailable", event => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          let audioContext = new AudioContext();
          let fileReader = new FileReader();
          let audioBlob = new Blob(audioChunks);

          fileReader.onloadend = () => {
            let arrayBuffer = fileReader.result;
            audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
              audioBufferToWav(audioBuffer);
            })
          }

          fileReader.readAsArrayBuffer(audioBlob);
        });

        setTimeout(() => {
          mediaRecorder.stop();
        }, 5000);
      });
  }

  /** Clear the status text. */
  function clearStatus() {
    let currStatus = qs(".status");
    currStatus.innerHTML = "";
  }

  /** Display an error message when an error occurs when fetching. */
  function handleError() {
    let currStatus = qs(".status");
    currStatus.textContent = "Oops, there's a problem. Please try again.";
  }

  /**
   * Occurs when the Shazam API does not support the song. Displays song title
   * and artist.
   * @param {String} title - song title detected by the Music Identify API.
   * @param {String} artist - song artist detected by the Music Identify API.
   */
  function handleShazamErr(title, artist) {
    let trackContainer = genTrackDetail(title, artist);
    genRefresh(trackContainer);

    let detectedContent = id("detected");
    detectedContent.append(trackContainer);
  }

  /** Set the status text as "Recording". */
  function recordingMsg() {
    let currStatus = qs(".status");
    currStatus.textContent = "Recording";
  }

  /** Set the status text as "Detecting". */
  function detectingMsg() {
    let currStatus = qs(".status");
    currStatus.textContent = "Detecting";
  }

  /**
   * This function is based on:
   * https://www.russellgood.com/how-to-convert-audiobuffer-to-audio-file/
   *
   * Special thanks to CuriousChad from Stack OverFlow for putting it together.
   * Question:
   * https://stackoverflow.com/questions/61264581/how-to-convert-audio-buffer-to-mp3-in-javascript
   *
   * Profile:
   * https://stackoverflow.com/users/4381332/curiouschad
   *
   * Convert the audio buffer from the user stream to wav audio data type.
   * @param {AudioBuffer} aBuffer - audio buffer from the recording.
   */
  function audioBufferToWav(aBuffer) {
    let numOfChan = aBuffer.numberOfChannels,
        btwLength = aBuffer.length * numOfChan * 2 + 44,
        btwArrBuff = new ArrayBuffer(btwLength),
        btwView = new DataView(btwArrBuff),
        btwChnls = [],
        btwIndex,
        btwSample,
        btwOffset = 0,
        btwPos = 0;
    setUint32(0x46464952); // "RIFF"
    setUint32(btwLength - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(aBuffer.sampleRate);
    setUint32(aBuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(btwLength - btwPos - 4); // chunk length

    for(btwIndex = 0; btwIndex < aBuffer.numberOfChannels; btwIndex++) {
      btwChnls.push(aBuffer.getChannelData(btwIndex));
    }

    while(btwPos < btwLength) {
        for(btwIndex = 0; btwIndex < numOfChan; btwIndex++) {
          // interleave btwChnls
          btwSample = Math.max(-1, Math.min(1, btwChnls[btwIndex][btwOffset])); // clamp
          btwSample = (0.5 + btwSample < 0 ? btwSample * 32768 : btwSample * 32767) | 0; // scale to 16-bit signed int
          btwView.setInt16(btwPos, btwSample, true); // write 16-bit sample
          btwPos += 2;
        }
        btwOffset++; // next source sample
    }

    let wavHdr = lamejs.WavHeader.readHeader(new DataView(btwArrBuff));
    let wavSamples = new Int16Array(btwArrBuff, wavHdr.dataOffset, wavHdr.dataLen / 2);

    wavToMp3(wavHdr.channels, wavHdr.sampleRate, wavSamples);

    function setUint16(data) {
        btwView.setUint16(btwPos, data, true);
        btwPos += 2;
    }

    function setUint32(data) {
        btwView.setUint32(btwPos, data, true);
        btwPos += 4;
    }
  }

  /**
   * This function is based on lamejs, mp3 encoder library:
   * https://github.com/zhuker/lamejs
   *
   * Special thanks to CuriousChad from Stack OverFlow for putting it together.
   * Question:
   * https://stackoverflow.com/questions/61264581/how-to-convert-audio-buffer-to-mp3-in-javascript
   *
   * Profile:
   * https://stackoverflow.com/users/4381332/curiouschad
   *
   * Convert the wav audio to MP3 audio data type.
   * @param {Integer} channels - numbers of channels the wav audio consist.
   * @param {Integer} sampleRate - sample rate for the wav audio.
   * @param {Int16Array} samples - the wav audio sample.
   */
  function wavToMp3(channels, sampleRate, samples) {
    var buffer = [];
    var mp3enc = new lamejs.Mp3Encoder(channels, sampleRate, 128);
    var remaining = samples.length;
    var samplesPerFrame = 1152;
    for(var i = 0; remaining >= samplesPerFrame; i += samplesPerFrame) {
      var mono = samples.subarray(i, i + samplesPerFrame);
      var mp3buf = mp3enc.encodeBuffer(mono);

      if(mp3buf.length > 0) {
        buffer.push(new Int8Array(mp3buf));
      }
      remaining -= samplesPerFrame;
    }
    var d = mp3enc.flush();
    if(d.length > 0) {
      buffer.push(new Int8Array(d));
    }

    var mp3Blob = new Blob(buffer, {type: 'audio/mp3'});

    let options = {
      type: "audio/mpeg",
      lastModified: new Date().getTime()
    }
    let audioFile = new File([mp3Blob], "song.mp3", options);

    detectingMsg();
    fetchDetect(audioFile);
  }

  /**
   * Obtain the song title and artist from the response and fetch for in-depth
   * track details.
   * @param {JSON} response - JSON response from the Music Identify API.
   */
  function processInfo(response) {
    let title = response.data.title;
    let artist = response.data.artist;
    fetchCover(title, artist);
  }

  /**
   * Obtain the song title, artist, cover art, and url from the response and
   * display them.
   * @param {JSON} response - JSON response from the Shazam API.
   */
  function processDetail(response) {
    let mainContent = qs("main");
    mainContent.innerHTML = "";

    let detectedContent = id("detected");

    let coverUrl = response.tracks.hits["0"].track.images.coverarthq;
    let title = response.tracks.hits["0"].track.title;
    let artist = response.tracks.hits["0"].track.subtitle;
    let readMoreUrl = response.tracks.hits["0"].track.url;

    let coverArtContainer = genCoverArt(coverUrl);
    let trackContainer = genTrackDetail(title, artist);
    genReadMore(readMoreUrl, trackContainer);
    genRefresh(trackContainer);

    detectedContent.append(coverArtContainer);
    detectedContent.append(trackContainer);
  }

  /**
   * Append song title and artist together in a container.
   * @param {String} title - song title.
   * @param {String} artist - song artist.
   * @returns {object} - DOM object.
   */
  function genTrackDetail(title, artist) {
    let trackContainer = gen("div");
    trackContainer.id = "track-detail";
    let trackTitle = gen("h2");
    trackTitle.textContent = title;
    let trackArtist = gen("p");
    trackArtist.textContent = "by " + artist;

    trackContainer.append(trackTitle);
    trackContainer.append(trackArtist);

    return trackContainer;
  }

  /**
   * Generate a "read more" button that redirects the user to the Shazam page
   * for the detected song.
   * @param {String} readMoreUrl - Shazam page for the song.
   * @param {object} trackContainer - DOM object.
   */
  function genReadMore(readMoreUrl, trackContainer) {
    let readMoreBtn = gen("button");
    readMoreBtn.classList.add("after-btn");
    readMoreBtn.addEventListener("click", function() {
      readMore(readMoreUrl);
    });
    readMoreBtn.textContent = "Read More";
    trackContainer.append(readMoreBtn);
  }

  /**
   * Generate a "find more" button that allows the user to find another song.
   * @param {object} trackContainer - DOM object.
   */
  function genRefresh(trackContainer) {
    let refreshBtn = gen("button");
    refreshBtn.classList.add("after-btn");
    refreshBtn.addEventListener("click", refresh);
    refreshBtn.textContent = "Find Another Song?";
    trackContainer.append(refreshBtn);
  }

  /**
   * Append the cover art to a container.
   * @param {String} coverUrl - cover art url for the song.
   * @returns {object} - DOM object.
   */
  function genCoverArt(coverUrl) {
    let coverArtContainer = gen("div");
    coverArtContainer.id = "cover-art";
    let coverArt = gen("img");
    coverArt.src = coverUrl;
    coverArt.width = "300";
    coverArt.height = "300";
    coverArt.alt = "cover art";
    coverArtContainer.append(coverArt);

    return coverArtContainer;
  }

  /**
   * Refresh the page to the parent location.
   */
  function refresh() {
    window.parent.location = window.parent.location.href;
  }

  /**
   * Open the url in a new tab.
   * @param {String} readMoreUrl - Shazam page for the song.
   */
  function readMore(readMoreUrl) {
    window.open(readMoreUrl, "_blank");
  }

  /**
   * Fetch in-depth track details from the Shazam API.
   * @param {String} title - song title.
   * @param {String} artist - song artist.
   */
  function fetchCover(title, artist) {
    let term = "term=" + title + " " + artist;
    let locale = "&locale=en-US";
    let offset = "&offset=0";
    let limit = "&limit=1";

    let url = shazamapi.URL + term + locale + offset + limit;
    url = url.replaceAll(" ", "%20");

    fetch(url, {
	    method: "GET",
	    headers: shazamapi.HEADERS
    })
    .then(checkStatus)
    .then(resp => resp.json())
    .then(processDetail)
    .catch(function() {
      handleShazamErr(title, artist);
    });
  }

  /**
   * Fetch for song detection.
   * @param {File} file - converted MP3 audio file.
   */
  function fetchDetect(file) {
    let form = new FormData();
    form.append("file", file);

    fetch(miapi.URL, {
      method: "POST",
      headers: miapi.HEADERS,
      body: form
    })
    .then(checkStatus)
    .then(resp => resp.json())
    .then(processInfo)
    .catch(handleError);
  }

  /**
   * Helper function to return the response's result text if successful, otherwise
   * returns the rejected Promise result with an error status and corresponding text
   * @param {object} res - response to check for success/error
   * @return {object} - valid response if response was successful, otherwise rejected
   *                    Promise result
   */
   async function checkStatus(res) {
    if (!res.ok) {
      return new Error(await res.text());
    }
    return res;
  }

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} name - element ID.
   * @returns {object} - DOM object associated with id.
   */
   function id(name) {
    return document.getElementById(name);
  }

  /**
   * Returns first element matching selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} - DOM object associated selector.
   */
  function qs(selector) {
    return document.querySelector(selector);
  }

  /**
   * Creates an new HTML element in the DOM and return it.
   * @param {string} tagName - HTML tag name.
   * @returns {element} - new element in the DOM.
   */
  function gen(tagName) {
    return document.createElement(tagName);
  }
})();