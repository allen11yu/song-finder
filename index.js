"use strict";

(function () {
  window.addEventListener("load", init);

  function init() {
    id("record").addEventListener("click", processInfo);
  }

  function startRecord() {
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
      .then(stream => {
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
    let audioFile = new File([mp3Blob], "song.mp3", {type: "audio/mpeg", lastModified: new Date().getTime()});
    console.log(audioFile);
    fetchDetect(audioFile);
    //downloadFile(mp3Blob);
  }

  function downloadFile(audioBlob) {
    // Create an invisible A element
    const a = document.createElement("a");
    a.textContent = "hi";
    //a.style.display = "none";
    document.body.appendChild(a);

    // Set the HREF to a Blob representation of the data to be downloaded
    a.href = window.URL.createObjectURL(audioBlob);

    // Use download attribute to set set desired file name
    a.setAttribute("download", "brandon");

    // Trigger the download by simulating click
    //a.click();

    // Cleanup
    //window.URL.revokeObjectURL(a.href);
    //document.body.removeChild(a);
  }

  function processInfo() {
    // clear the button
    let mainContent = qs("main");
    mainContent.innerHTML = "";

    let songContainer = gen("section");
    songContainer.id = "song-info";

    let coverArtContainer = gen("div");
    let coverArt = gen("img");
    coverArt.src = "img/mic128.png";
    coverArt.alt = "cover art";
    coverArtContainer.append(coverArt);

    let trackContainer = gen("div");
    let trackTitle = gen("h2");
    trackTitle.textContent = "Song";
    let trackArtist = gen("p");
    trackArtist.textContent = "by Me";

    trackContainer.append(trackTitle);
    trackContainer.append(trackArtist);

    mainContent.append(coverArtContainer);
    mainContent.append(trackContainer);



    let title = response.data.title;
    let author = response.data.artist;
    console.log(title, "by", author);
  }

  function fetchDetect(file) {
    let form = new FormData();
    form.append("file", file);

    fetch(api.URL, {
      method: "POST",
      headers: api.HEADERS,
      body: form
    })
    .then(checkStatus)
    .then(resp => resp.json())
    .then(processInfo)
    .catch(function(){
      console.error();
    });
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
   * Returns an array of elements matching the given query.
   * @param {string} query - CSS query selector.
   * @returns {array} - Array of DOM objects matching the given query.
   */
  function qsa(query) {
    return document.querySelectorAll(query);
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