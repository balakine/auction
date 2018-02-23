"use strict";
console.log("First line");
chrome.runtime.onInstalled.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);

chrome.alarms.get("requestNext", alarm => {
  if (alarm) {
    console.log("Already scheduled");
  } else {
    chrome.alarms.create('requestNext', {periodInMinutes: 1/6});
    console.log("Sheduling");
  }
});

function onAlarm(alarm) {
  chrome.storage.local.get(["catIds", "currentCatId"], function(items) {
    var currentCatId = "currentCatId" in items ? items["currentCatId"] : 0;
    var catIds = "catIds" in items ? items["catIds"] : [];
    if (catIds.length == 0) return;
    var currentCat = catIds[currentCatId];
//
    var timestamp = new Date();
    $.get("https://empca.dtdeals.com/auction/rss.cfm?C=23&keyw=&sorttype=7&itemtype=&as=0&searchFields=&catid=" + currentCat + "&catlvl=1&minprice=&maxprice=&state=", function(data) {
      var items = $(data).find("item");
      window.indexedDB.open("dtdeals").onsuccess = function(event) {
        var t0 = performance.now();
        var objectStore = event.target.result.transaction("lots", 'readwrite').objectStore("lots");
        for (var i = 0; i < items.length; i++) {
          let item = parseItem(items[i]);
          objectStore.get(item.guid).onsuccess = function(event) {
            if (event.target.result) {
              item = event.target.result;
              item.lastSeen = timestamp;
              objectStore.put(item);
            } else {
              item.firstSeen = timestamp;
              item.lastSeen = timestamp;
              objectStore.add(item);
              sendAlert(item);
            }
          };
        }
        console.log("Call to loop through " + items.length + " items in " + currentCat + " category took " + (performance.now() - t0).toFixed(3) + " milliseconds.");
      };
    });
    currentCatId = (currentCatId + 1) % catIds.length;
    chrome.storage.local.set({"currentCatId": currentCatId});
  });
}

function parseItem(item) {
  var m = 0;
  var c = "";
  var s = "";
  var lotTitle = item.children[0].textContent;
  c = item.children[2].textContent;
  s = c.substring(c.indexOf("I=") + 2);
  var lotGuid = parseInt(s);
  c = item.children[3].textContent;
  var lotPubDate = new Date(c);
  c = item.children[4].textContent;
  m = c.indexOf("Current Price: $");
  s = c.substring(m + 16, c.indexOf("<", m + 16));
  var lotCurPrice = parseFloat(s.replace(",", ""));
  m = c.indexOf("Buy It Price: $");
  s = m == -1 ? undefined : c.substring(m + 15, c.indexOf("<", m + 15));
  var lotBuyPrice = m == -1 ? undefined : parseFloat(s.replace(",", ""));
  m = c.indexOf("End Time: ");
  s = c.substring(m + 10, c.indexOf(" Central", m + 10));
  var lotEndDate = moment.tz(s, "MM/DD/YY hh:mm A", "US/Central").toDate();
  return {"guid": lotGuid, "title": lotTitle, "pubDate": lotPubDate, "curPrice": lotCurPrice, "buyPrice": lotBuyPrice, "endDate": lotEndDate};
}

function sendAlert(item) {
  if (
    item.title.toLowerCase().indexOf("ipad pro") !== -1 ||
    item.title.toLowerCase().indexOf("ipad air 2") !== -1 && item.buyPrice < 200 ||
    item.title.toLowerCase().indexOf("ipad mini 3") !== -1 && item.buyPrice < 200 ||
    item.title.toLowerCase().indexOf("ipad mini 4") !== -1 && item.buyPrice < 200 ||
    item.title.toLowerCase().indexOf("tumi") !== -1 ||
    item.title.toLowerCase().indexOf("bose") !== -1 ||
    item.title.toLowerCase().indexOf("instax") !== -1 ||
    item.title.toLowerCase().indexOf("iphone 6s") !== -1 && item.buyPrice < 200 ||
    item.title.toLowerCase().indexOf("iphone 7") !== -1 && item.buyPrice < 300 ||
    item.title.toLowerCase().indexOf("iphone 8") !== -1 && item.buyPrice < 400 ||
    item.title.toLowerCase().indexOf("iphone x") !== -1 && item.buyPrice < 500 ||
    item.title.toLowerCase().indexOf("waterproof") !== -1
  ) {
    console.error("New lot:", item.guid, item.title, item.buyPrice);
    console.error("https://empca.dtdeals.com/auction/index.cfm?P=5&I=" + item.guid);
    var params = {subject: "\\$" + item.buyPrice + " " + item.title, body: "https://empca.dtdeals.com/auction/index.cfm?P=5&I=" + item.guid};
    $.getJSON('http://ptl21jmpstna001:8080/alert.pl', params);
  } else {
    console.warn("New lot:", item.guid, item.title, item.buyPrice);
    console.warn("https://empca.dtdeals.com/auction/index.cfm?P=5&I=" + item.guid);
  }
}

function onInit() {
  window.indexedDB.open("dtdeals").onupgradeneeded = function(event) {
    console.log("DB upgrade: ", arguments);
    var db = event.target.result;
    var objectStore = db.createObjectStore("lots", { keyPath: "guid" });
  };
  window.indexedDB.open("dtdeals").onsuccess = function(event) {
    var t0 = performance.now();
    var objectStore = event.target.result.transaction("lots", 'readwrite').objectStore("lots")
    objectStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
//        var item = cursor.value;
//        cursor.update(item);
        cursor.continue();
      }
    };
    console.log("Init took " + (performance.now() - t0).toFixed(3) + " milliseconds.");
  };
}
