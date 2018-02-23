"use strict";
var catIds = [];
var currentCat = 0;

(function listLots() {
  chrome.storage.local.get("catIds", function(items) {
    catIds = "catIds" in items ? items["catIds"] : [];
    var changed = false;
    var leftNav = $("#left-nav a[href*='catlvl=1']");
    for (var i = 0; i < leftNav.length; i++) {
      var catId = leftNav[i].href.split("&")[2].split("=")[1];
      if (!catIds.includes(catId)) {
        console.log("link: " + catId + " " + leftNav[i].text);
        catIds.push(catId);
        changed = true;
      }
    }
    if (changed) {
      chrome.storage.local.set({"catIds": catIds});
    }
  });
})();
