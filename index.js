"use strict";

(function () {

  const SHAZAM_URL = "https://shazam.p.rapidapi.com/songs/detect";

  window.addEventListener("load", init);

  function init() {
    id("record").addEventListener("click", startRecord);
  }

  function startRecord() {
    console.log("hi");
    navigator.mediaDevices.getUserMedia({audio: true, video: false})
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.start();

        const audioChunks = [];
        mediaRecorder.addEventListener("dataavailable", event => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          let audioBlob = new Blob(audioChunks);
          let reader = new FileReader();
          reader.readAsArrayBuffer(audioBlob);
          reader.onloadend = function () {
            let arrayBuffer = reader.result;
            let base64string = arrayBufferToBase64(arrayBuffer);
            console.log(base64string);
          }
        });

        setTimeout(() => {
          console.log("5 seconds is up");
          mediaRecorder.stop();
        }, 3000);
    });
  }

  function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

  function fetchDetect(base64string) {
    console.log("detecting");
    fetch(SHAZAM_URL, {
      "method": "POST",
      "headers": {
        "content-type": "text/plain",
        "x-rapidapi-key": "7d36d391f3msh14deda5389268d4p154961jsndadf9fe63358",
        "x-rapidapi-host": "shazam.p.rapidapi.com"
      },
      "body": base64string
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