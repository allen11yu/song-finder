"use strict";

(function () {

  window.addEventListener("load", init);

  function init() {
    id("record").addEventListener("click", startRecord);

    let fileSelector = document.getElementById('fileUpload');
    fileSelector.addEventListener('change', (event) => {
      const fileList = event.target.files;
      let audio = fileList[0];
      console.log(audio);
      fetchDetect(audio);
    });
  }

  function startRecord() {
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        const audioChunks = [];
        mediaRecorder.addEventListener("dataavailable", event => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          let audioBlob = new Blob(audioChunks, {type: "audio/mpeg"});
          let audioFile = new File([audioBlob], "song.mp3", {type: "audio/mpeg", lastModified: new Date().getTime()})
          console.log(audioFile);
        });

        setTimeout(() => {
          console.log("5 seconds is up");
          mediaRecorder.stop();
        }, 3000);
    });
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
    .then(function() {
      console.log(resp);
    })
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