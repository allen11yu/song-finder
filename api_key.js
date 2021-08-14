"use strict"

/** The API key for Music Identify API. */
var miapi = {
  URL: "https://music-identify.p.rapidapi.com/identify",
  HEADERS: {
    // You can leave out "content-type"
    "x-rapidapi-key": "Paste key here",
    "x-rapidapi-host": "Paste host here"
  }
};

/** The API key for Shazam API. */
var shazamapi = {
  URL: "https://shazam.p.rapidapi.com/search?",
  HEADERS: {
    // You can leave out "content-type"
    "x-rapidapi-key": "Paste key here",
    "x-rapidapi-host": "Paste host here"
  }
}